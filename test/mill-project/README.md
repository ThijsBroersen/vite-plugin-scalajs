# Mill + Scala.js Example

This is a complete example project demonstrating how to use the Vite Scala.js plugin with Mill build tool.

## Prerequisites

- Java 8 or later
- Mill build tool installed
- Node.js and npm

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The Vite plugin will automatically:
- Start Mill in watch mode (`mill -w example.fastLinkJS`)
- Watch the Mill output directory for changes
- Trigger Vite reloads when Scala.js files change

## How it works

1. **Mill compilation**: Mill compiles Scala.js code to JavaScript in `out/example/fastLinkJS.dest/`
2. **Vite plugin watching**: The plugin watches the Mill output directory
3. **Import resolution**: JavaScript imports like `import 'mill.example:main.js'` are resolved to the actual Mill output files
4. **Hot reloading**: When Scala.js files change, Vite automatically reloads the browser

## Development workflow

1. Edit Scala code in `src/scala/example/Main.scala`
2. Mill automatically recompiles the Scala.js code
3. Vite detects the changes and reloads the browser
4. See your changes instantly!

## Build for production

```bash
# Build optimized Scala.js code
mill example.fullLinkJS

# Build the Vite project
npm run build
```

## Project structure

```
mill-project/
├── build.mill              # Mill build configuration
├── vite.config.ts          # Vite configuration with Scala.js plugin
├── package.json            # Node.js dependencies
├── index.html              # HTML entry point
├── src/
│   ├── main.js             # JavaScript entry point
│   └── scala/
│       └── example/
│           └── Main.scala  # Main Scala.js application
└── out/                    # Mill output directory (generated)
    └── example/
        ├── fastLinkJS.dest/ # Development build output
        └── fullLinkJS.dest/ # Production build output
```

## Configuration details

The `vite.config.ts` file configures the plugin:

```typescript
scalajsPlugin({
  projects: [
    {
      projectID: 'example',           // Matches the Mill module name
      buildTool: {
        tool: 'mill',
        script: './mill'              // Custom Mill script path
      },
      uriPrefix: 'mill.example'       // Custom import prefix
    }
  ]
})
```

This allows you to import Scala.js modules like:
```javascript
import 'mill.example:main.js';
```
