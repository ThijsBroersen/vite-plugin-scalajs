export interface BaseBuildTool {
  tool: 'sbt' | 'mill';
  script?: string;
}

export interface SbtBuildTool extends BaseBuildTool {
  tool: 'sbt';
  /** Custom sbt setting key that returns the linker output dir (default: fast/fullLinkJSOutput). */
  outputTask?: string;
  /** Retry sbt when the server is still booting (default: 1). */
  maxAttempts?: number;
  /** Delay between sbt retries in ms (default: 1000). */
  retryDelayMs?: number;
}

export interface MillBuildTool extends BaseBuildTool {
  tool: 'mill';
}

export type BuildTool = SbtBuildTool | MillBuildTool;

export interface ScalaJSProject {
  projectID: string;
  buildTool: BuildTool;
  uriPrefix?: string;
  /**
   * Known Scala.js linker output directory. When set, the plugin does not invoke the build tool
   * to discover or run link tasks (resolver-only mode for this project).
   */
  outputDir?: string;
}

export interface ScalaJSResolverProject {
  projectID: string;
  uriPrefix?: string;
  outputDir: string;
}

export interface ScalaJSResolverPluginOptions {
  /** Single-project shorthand */
  projectID?: string;
  uriPrefix?: string;
  outputDir?: string;
  /** Multi-project resolver configuration */
  projects?: ScalaJSResolverProject[];
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
