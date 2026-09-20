module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated rewrites worklets at compile time; its plugin must be listed last.
    plugins: ["react-native-reanimated/plugin"],
  };
};
