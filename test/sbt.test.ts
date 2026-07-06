import { registerSbtPluginTests } from "./sbt-test-helpers";

registerSbtPluginTests({
  cwd: process.cwd() + "/test/sbt-project",
  suiteName: "scalaJSPlugin (sbt 1.x)",
});
