/**
 * Expo Config Plugin：为 Android release 构建注入私有签名配置
 *
 * 背景：expo prebuild 生成的 build.gradle 中，release buildType 默认复用
 * debug.keystore（CN=Android Debug，公开已知），存在升级劫持风险。
 * 本 plugin 在 prebuild 时把 release 签名替换为项目私有 keystore。
 *
 * keystore 与密码存放（均被 .gitignore 排除，不进版本控制、不进对话历史）：
 *   keystores/tapmood-release.keystore
 *   keystores/password.txt
 *
 * 若上述文件不存在（如 CI 或其他开发者机器），plugin 跳过注入，
 * 保持模板默认行为，避免无 keystore 环境构建失败。
 *
 * 使用方式：在 app.json 的 expo.plugins 数组中注册。
 *   "plugins": [ "./plugins/withReleaseSigning", ... ]
 */
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    // projectRoot 在 mod 内部通过 modRequest 提供（顶层 config 不含该字段）
    const projectRoot = cfg.modRequest.projectRoot;
    const keystorePath = path.join(projectRoot, 'keystores', 'tapmood-release.keystore');
    const passwordPath = path.join(projectRoot, 'keystores', 'password.txt');

    // 无私有 keystore：跳过注入，保持模板默认（debug 签名）
    if (!fs.existsSync(keystorePath) || !fs.existsSync(passwordPath)) {
      return cfg;
    }

    if (!cfg.modResults?.contents) {
      throw new Error('withReleaseSigning: 无法读取 build.gradle 内容');
    }

    const password = fs.readFileSync(passwordPath, 'utf8').trim();
    // gradle file() 使用正斜杠绝对路径，兼容 Windows
    const keystoreUnix = keystorePath.replace(/\\/g, '/');
    let contents = cfg.modResults.contents;

    // 1) 先把 release buildType 的签名从 debug 改为 release
    //    此时 signingConfigs 块内尚无 release 配置，第一个 `release {` 即 buildTypes.release
    const buildTypeRegex = /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!buildTypeRegex.test(contents)) {
      throw new Error('withReleaseSigning: 未在 build.gradle 的 release buildType 中找到 debug 签名行');
    }
    contents = contents.replace(buildTypeRegex, '$1signingConfig signingConfigs.release');

    // 2) 在 signingConfigs 块内注入 release 签名配置
    const signingConfigsRegex = /(signingConfigs\s*\{)/;
    if (!signingConfigsRegex.test(contents)) {
      throw new Error('withReleaseSigning: 未在 build.gradle 中找到 signingConfigs 块');
    }
    contents = contents.replace(
      signingConfigsRegex,
      `$1
        release {
            storeFile file('${keystoreUnix}')
            storePassword '${password}'
            keyAlias 'tapmood'
            keyPassword '${password}'
        }`
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
};
