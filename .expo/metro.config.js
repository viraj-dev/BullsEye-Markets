const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  config.resolver.sourceExts = [
    ...config.resolver.sourceExts,
    'cjs',
  ];

  return config;
})();
