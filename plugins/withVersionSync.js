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

  const parts = version.split('.').map((n) => parseInt(n, 10) || 0);
  const [major, minor, patch] = parts;
  const versionCode = major * 10000 + minor * 100 + patch;

  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    contents = contents.replace(
      /versionCode \d+/,
      `versionCode ${versionCode}`
    );
    config.modResults.contents = contents;
    return config;
  });
};
