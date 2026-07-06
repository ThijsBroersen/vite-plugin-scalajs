export { default } from "./plugin.js";

// Types
export type {
  BaseBuildTool,
  SbtBuildTool,
  MillBuildTool,
  BuildTool,
  ScalaJSProject,
  ScalaJSPluginOptions as Options,
} from "./types.js";

// Individual build tool exports for advanced usage
export * from "./sbt.js";
export * from "./mill.js";
export * from "./util.js";
