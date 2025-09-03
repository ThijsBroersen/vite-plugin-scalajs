import { defineConfig } from 'vite'
import scalajsPlugin from '../../src/index.js'

export default defineConfig({
  plugins: [
    scalajsPlugin({
      projects: [
        {
          projectID: 'example',
          buildTool: {
            tool: 'mill',
            script: './mill',
          },
          uriPrefix: 'millexample',
        },
      ],
    }),
  ],
  server: {
    port: 3000,
  },
})
