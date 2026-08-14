/**
 * Expo Config Plugin：自动从 expo.version 派生 Android versionCode
 *
 * 单一数据源：app.json.expo.version
 *
 * versionName 由 expo prebuild 模板自动从 app.json.expo.version 读取，无需此 plugin 处理。
 * versionCode 计算规则：major * 10000 + minor * 100 + patch
 *   例：0.3.12 → 0*10000 + 3*100 + 12 = 312
 *   这样保证每次 patch +1 时 versionCode 一定递增，
 *   且 major/minor 升级时也有充足的递增空间。
 *
 * 使用方式：在 app.json 的 expo.plugins 数组中任意位置注册即可。
 *   "plugins": [
 *     "./plugins/withVersionSync",
 *     ...
 *   ]
 */
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = (config) => {
  const version = config.version;
  if (!version) return config;

  // 校验版本号格式：必须为 X.Y.Z
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(
      `withVersionSync: app.json.expo.version "${version}" 不符合 X.Y.Z 格式`
    );
  }
  const [, majorStr, minorStr, patchStr] = match;
  const major = parseInt(majorStr, 10);
  const minor = parseInt(minorStr, 10);
  const patch = parseInt(patchStr, 10);
  // 公式隐含 minor/patch < 100 约束，超出会导致 versionCode 冲突
  // 例：0.3.100 → 400 与 0.4.0 → 400 冲突，Play Store 拒绝上传
  if (minor >= 100 || patch >= 100) {
    throw new Error(
      `withVersionSync: minor/patch 必须 < 100（当前 ${major}.${minor}.${patch}），否则 versionCode 会冲突`
    );
  }
  const versionCode = major * 10000 + minor * 100 + patch;

  return withAppBuildGradle(config, (config) => {
    if (!config.modResults?.contents) {
      throw new Error('withVersionSync: 无法读取 build.gradle 内容');
    }
    let contents = config.modResults.contents;
    // 匹配 build.gradle 中的 versionCode（兼容 "versionCode 312" 和 "versionCode = 312" 两种写法）
    const regex = /versionCode\s*=?\s*\d+/;
    if (!regex.test(contents)) {
      throw new Error(
        `withVersionSync: 在 build.gradle 中未找到 versionCode 字段，无法替换`
      );
    }
    contents = contents.replace(regex, `versionCode ${versionCode}`);
    config.modResults.contents = contents;
    return config;
  });
};
