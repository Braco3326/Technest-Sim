import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
