const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

const BLOCK_PATTERNS = [
  /\/node_modules\/[^/]*_tmp_[^/]*(\/.*)?$/,
  /\.local\//,
  /\.old-artifacts-/,
];

config.watchFolders = [workspaceRoot];

config.resolver = config.resolver || {};
config.resolver.blockList = BLOCK_PATTERNS;

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.watcher = {
  healthCheck: {
    enabled: false,
  },
  watchman: {
    deferStates: [],
  },
};

module.exports = config;
