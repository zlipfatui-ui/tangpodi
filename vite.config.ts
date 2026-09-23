import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repositoryName && !repositoryName.endsWith('.github.io')
  ? `/${repositoryName}/`
  : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
