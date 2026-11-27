import type { Media } from '@/api/types'

/** The model file is not the one the team verified (or has no fingerprint): it must not be shown. */
export class ModelIntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelIntegrityError'
  }
}

/** SHA-256 of some bytes, as 64 lowercase hex characters (Web Crypto, no dependency). */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Downloads a NASA 3D model, checks its bytes against the SHA-256 recorded in the content (V19,
 * ADR-028), and only then hands back a local `blob:` URL for <model-viewer>. A model that changed
 * on its server since the team checked it — or that has no fingerprint — is refused: fail closed.
 * The caller revokes the URL when it no longer needs it.
 */
export async function verifiedModelUrl(model: Pick<Media, 'url' | 'sha256'>, signal?: AbortSignal): Promise<string> {
  if (!model.sha256) throw new ModelIntegrityError('3D model without a verified fingerprint')
  const response = await fetch(model.url, { signal })
  if (!response.ok) throw new Error(`3D model download failed (${response.status})`)
  const bytes = await response.arrayBuffer()
  const actual = await sha256Hex(bytes)
  if (actual !== model.sha256) throw new ModelIntegrityError('3D model does not match its verified fingerprint')
  return URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }))
}
