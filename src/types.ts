export interface BaseBuildTool {
  tool: 'sbt' | 'mill';
  script?: string;
}

export interface SbtBuildTool extends BaseBuildTool {
  tool: 'sbt';
}

export interface MillBuildTool extends BaseBuildTool {
  tool: 'mill';
}

export type BuildTool = SbtBuildTool | MillBuildTool;

export interface ScalaJSProject {
  projectID: string;
  buildTool: BuildTool;
  uriPrefix?: string;
}

export interface ScalaJSPluginOptions {
  /** Array of Scala.js projects to build and watch */
  projects: ScalaJSProject[];
  /** Root directory of the project workspace */
  projectRoot?: string;
  /** Current working directory for build tool commands */
  cwd?: string;
  /** Minimum time in milliseconds between file change reloads (default: 2000) */
  reloadThrottleMs?: number;
}
