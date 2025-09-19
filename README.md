# Vite Plugin for Scala.js

A Vite plugin that integrates Scala.js projects built with either SBT or Mill build tools. This plugin automatically watches your Scala.js output directories and triggers Vite reloads when files change, making development seamless.

## Features

- **Multi-build tool support**: Works with both SBT and Mill
- **Automatic file watching**: Watches Scala.js output directories and triggers Vite reloads
- **Development and production modes**: Supports both fast and full linking
- **Flexible configuration**: Multiple projects with different build tools
- **Throttled reloads**: Prevents excessive reloads during rapid file changes
- **Backward compatibility**: Maintains compatibility with existing SBT-only setups

## Installation

IMPORTANT: there is NO published artifact for this FORKED repo yet! To try this repo clone it and import relative `import scalajsPlugin from '../vite-plugin-scalajs/src/index.js'`

## Quick Start

### SBT Project

```typescript
import { defineConfig } from 'vite';
import { scalajsPlugin } from '@scala-js/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'myProject',
          buildTool: {
            tool: 'sbt'
          }
        }
      ]
    })
  ]
});
```

### Mill Project

```typescript
import { defineConfig } from 'vite';
import { scalajsPlugin } from '@scala-js/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'example',
          buildTool: {
            tool: 'mill'
          }
        }
      ]
    })
  ]
});
```

### Mixed SBT and Mill Projects

```typescript
import { defineConfig } from 'vite';
import { scalajsPlugin } from '@scala-js/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'backend',
          buildTool: {
            tool: 'sbt'
          }
        },
        {
          projectID: 'frontend',
          buildTool: {
            tool: 'mill'
          }
        }
      ]
    })
  ]
});
```

## Configuration Options

### Plugin Options

- `projects`: Array of Scala.js project configurations
- `projectRoot`: Root directory of the Scala project (auto-detected if not provided)
- `cwd`: Working directory for build tool commands (optional)
- `reloadThrottleMs`: Minimum time in milliseconds between file change reloads (default: 2000)

### Project Configuration

- `projectID`: Project identifier (used for URI prefix and build tool targeting)
- `buildTool`: Build tool configuration
  - `tool`: Either `'sbt'` or `'mill'`
  - `script`: Custom script name (optional, defaults to `'sbt'` or `'mill'`)
- `uriPrefix`: Custom URI prefix for imports (optional, defaults to `projectID:`)

## Usage in Code

Import Scala.js modules using the configured URI prefix:

```typescript
// Using projectID as prefix (default)
import 'myProject:main.js';

// Using custom prefix
import 'custom:main.js';
```

## Development vs Production

The plugin automatically detects the Vite mode:
- **Development**: Uses `fastLinkJS` (SBT) or `fastLinkJS` (Mill)
- **Production**: Uses `fullLinkJS` (SBT) or `fullLinkJS` (Mill)

## Examples

### Getting Started
- **[Getting Started Guide](examples/getting-started.md)**: Complete step-by-step setup for new projects

### Working Examples
- `test/mill-project/`: Mill-based Scala.js project with Vite configuration
- `test/sbt-project/`: SBT-based Scala.js project with multiple modules

### Complete Example: Mill Project

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { scalajsPlugin } from '@scala-js/vite-plugin-scalajs';

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'example',
          buildTool: {
            tool: 'mill',
            script: './mill-assembly.jar' // optional, defaults to './mill'
          },
          uriPrefix: 'millexample' // optional, defaults to projectID
        }
      ]
    })
  ]
});
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Scala.js + Vite</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

```javascript
// src/main.js
import 'mill.example:main.js';

// Your JavaScript code here
console.log('Hello from Vite + Scala.js!');
```

## API Reference

### Types

- `ScalaJSPluginOptions`: Main plugin configuration
- `ScalaJSProject`: Individual project configuration
- `BuildTool`: Union type for SBT or Mill build tools
- `SbtBuildTool`: SBT-specific configuration
- `MillBuildTool`: Mill-specific configuration

### Functions

- `scalajsPlugin(options)`: Main plugin function

## Troubleshooting

### Common Issues

1. **Build tool not found**: Ensure SBT or Mill is installed and available in your PATH or that the `script` config refers to the correct file
2. **Output directory not found**: The plugin waits for build tools to create output directories
3. **Excessive reloads**: Adjust `reloadThrottleMs` to reduce reload frequency
4. **Import resolution fails**: Check that your `uriPrefix` or `projectID` is correct and that the script exists the output directory
5. **ERR_FEATURE_UNAVAILABLE_ON_PLATFORM**: You need a node version >=v19.1.0 on Linux, which is more recent than some distros supply

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=1 npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

Apache 2.0
