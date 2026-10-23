/** Normalize uriPrefix to the import prefix including trailing `:`. */
export function uriPrefixKey(uriPrefix: string | undefined, projectID: string): string {
  if (uriPrefix) {
    return uriPrefix.endsWith(':') ? uriPrefix : `${uriPrefix}:`
  }
  return `${projectID}:`
}

/**
 * Resolve a Vite module id to an absolute path under a Scala.js linker output directory.
 * Returns null when the id does not use the configured prefix.
 */
export function resolveScalaJsModuleId(
  moduleId: string,
  uriPrefix: string | undefined,
  projectID: string,
  outputDir: string | undefined,
  errorIfMissingOutputDir: string,
): string | null {
  if (outputDir === undefined) {
    throw new Error(errorIfMissingOutputDir)
  }

  const prefix = uriPrefixKey(uriPrefix, projectID)
  if (!moduleId.startsWith(prefix)) {
    return null
  }

  const path = moduleId.substring(prefix.length)
  return `${outputDir}/${path}`
}
