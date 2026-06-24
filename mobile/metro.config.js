const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Stub @opentelemetry/api for web — supabase-js imports it dynamically
// but Metro resolves it statically and fails on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@opentelemetry/api") {
    return { type: "empty" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
