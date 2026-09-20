// Expo's monorepo Metro setup (docs: "Work with monorepos"). Metro only watches the app folder by
// default, so workspace packages such as @royal-navy/shared would be "unable to resolve".
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const appRoot = __dirname;
const workspaceRoot = path.resolve(appRoot, "../..");

const config = getDefaultConfig(appRoot);

// Watch the whole workspace so edits in packages/* reload, and so symlinked packages resolve.
config.watchFolders = [workspaceRoot];

// Resolve modules from the app first, then the hoisted workspace root (pnpm node-linker=hoisted).
config.resolver.nodeModulesPaths = [
  path.resolve(appRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
