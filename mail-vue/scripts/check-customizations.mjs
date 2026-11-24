import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const checks = [
  ['mail-vue/src/views/content/index.vue', 'EmailTranslation'],
  ['mail-vue/src/request/email.js', 'translation/google'],
  ['mail-worker/src/hono/webs.js', "../api/translation-api"],
  ['mail-worker/src/api/translation-api.js', 'GOOGLE_TRANSLATE_API_KEY'],
]

for (const [relativePath, marker] of checks) {
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath) || !fs.readFileSync(fullPath, 'utf8').includes(marker)) {
    console.error(`Required customization is missing: ${relativePath}`)
    process.exitCode = 1
  }
}

if (process.exitCode) {
  console.error('Deployment stopped to avoid publishing a build without email translation.')
} else {
  console.log('Email translation customization is present.')
}
