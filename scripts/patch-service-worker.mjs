import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const constants = readFileSync(resolve(root, 'src/lib/constants.ts'), 'utf8')
const version = constants.match(/APP_VERSION = '([^']+)'/)?.[1] ?? `build-${Date.now()}`

const sourcePath = resolve(root, 'public/service-worker.js')
const distPath = resolve(root, 'dist/service-worker.js')

let source = readFileSync(sourcePath, 'utf8')
source = source.replaceAll('__CACHE_VERSION__', version)
writeFileSync(distPath, source)

console.log(`Patched service-worker.js with cache version ${version}`)
