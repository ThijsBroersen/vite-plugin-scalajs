import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Enable globals for better VS Code integration
    globals: true,
    // Set up test environment
    environment: 'node',
    // Configure test file patterns
    include: ['test/**/*.{test,spec}.{js,ts}'],
    // Exclude patterns
    exclude: ['node_modules', 'dist', '**/*.d.ts'],
    // Timeout for tests (sbt cold starts on CI can be slow)
    testTimeout: process.env.CI ? 120_000 : 60_000,
    // Run test files sequentially — sbt 1.x and 2.x fixtures share the runner JVM ecosystem
    fileParallelism: false,
    // Setup files
    setupFiles: ['./vitest.setup.ts'],
    // Reporter configuration for better VS Code integration
    // reporter: ['verbose', 'json'],
    // Coverage configuration
    coverage: {
      enabled: false, // Disable by default, can be enabled with --coverage
      reporter: ['html', 'json'],
    },
  },
})
