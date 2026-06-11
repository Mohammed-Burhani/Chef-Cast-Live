const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add platform-specific resolver for web
config.resolver = {
  ...config.resolver,
  resolverMainFields: ['react-native', 'browser', 'main'],
  platforms: ['ios', 'android', 'web'],
};

module.exports = config;
