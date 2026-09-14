import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile } from 'node:fs/promises'

const approvedCoreRepositories = new Set([
  'mean-weasel/bugdrop',
  'bugdrophq/bugdrop',
])
const approvedTestRepositories = new Set([
  'mean-weasel/bugdrop-widget-test',
  'bugdrophq/bugdrop-widget-test',
])

function approvedRepository(
  value: string | undefined,
  fallback: string,
  approved: Set<string>,
  variable: string,
) {
  const repository = value || fallback
  if (!approved.has(repository)) {
    throw new Error(`${variable} is not an approved BugDrop repository: ${repository}`)
  }
  return repository
}

const coreRepository = approvedRepository(
  process.env.VITE_BUGDROP_CORE_REPOSITORY,
  'mean-weasel/bugdrop',
  approvedCoreRepositories,
  'VITE_BUGDROP_CORE_REPOSITORY',
)
const testRepository = approvedRepository(
  process.env.VITE_BUGDROP_TEST_REPOSITORY,
  'mean-weasel/bugdrop-widget-test',
  approvedTestRepositories,
  'VITE_BUGDROP_TEST_REPOSITORY',
)
const repositoryFixtureFiles = new Map([
  ['/redaction.html', 'public/redaction.html'],
  ['/redaction-failure.html', 'public/redaction-failure.html'],
])

function applyRepositoryConfiguration(html: string) {
  return html
    .replaceAll('__BUGDROP_CORE_REPOSITORY__', coreRepository)
    .replaceAll('__BUGDROP_TEST_REPOSITORY__', testRepository)
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUGDROP_CORE_REPOSITORY__: JSON.stringify(coreRepository),
    __BUGDROP_TEST_REPOSITORY__: JSON.stringify(testRepository),
  },
  plugins: [
    react(),
    {
      name: 'bugdrop-url',
      transformIndexHtml(html) {
        const url = process.env.VITE_BUGDROP_URL || 'https://bugdrop.neonwatty.workers.dev';
        return applyRepositoryConfiguration(html.replaceAll('__BUGDROP_URL__', url))
      },
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const pathname = new URL(
            request.url || '/',
            'http://bugdrop-widget-test.localhost',
          ).pathname
          const filename = repositoryFixtureFiles.get(pathname)
          if (request.method !== 'GET' || !filename) {
            next()
            return
          }
          try {
            const html = await readFile(filename, 'utf8')
            response.statusCode = 200
            response.setHeader('Content-Type', 'text/html; charset=utf-8')
            response.end(applyRepositoryConfiguration(html))
          } catch (error) {
            next(error)
          }
        })
      },
      async closeBundle() {
        for (const filename of repositoryFixtureFiles.values()) {
          const outputFilename = filename.replace(/^public\//, 'dist/')
          const html = await readFile(outputFilename, 'utf8')
          await writeFile(outputFilename, applyRepositoryConfiguration(html), 'utf8')
        }
      },
    },
  ],
})
