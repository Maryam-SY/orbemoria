import { createHash } from 'node:crypto'
import { loadContent } from '../content/load.js'

/**
 * `npm run models:check` (ADR-028, V19) — downloads every 3D model of the content and compares
 * its SHA-256 with the fingerprint the team verified. Exits 1 if a file changed, has no
 * fingerprint or cannot be downloaded, so that a modified NASA file never reaches the children
 * unnoticed (the site itself also refuses it, in the browser).
 */
const models = loadContent().media.filter((m) => m.type === '3d-model')
let failures = 0

for (const model of models) {
  const label = `media/${model.id}`
  try {
    if (!model.sha256) throw new Error('no sha256 recorded')
    const response = await fetch(model.url, { signal: AbortSignal.timeout(60_000) })
    if (!response.ok) throw new Error(`download failed (HTTP ${response.status})`)
    const bytes = Buffer.from(await response.arrayBuffer())
    const actual = createHash('sha256').update(bytes).digest('hex')
    if (actual !== model.sha256) throw new Error(`CHANGED: expected ${model.sha256}, got ${actual} (${bytes.length} bytes)`)
    console.log(`OK    ${label} (${bytes.length} bytes)`)
  } catch (error) {
    failures += 1
    console.log(`ERROR ${label}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

console.log(`${models.length} model(s) checked, ${failures} problem(s)`)
process.exitCode = failures > 0 ? 1 : 0
