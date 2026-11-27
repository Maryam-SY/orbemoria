import { describe, expect, it, vi } from 'vitest'
import { ModelIntegrityError, sha256Hex, verifiedModelUrl } from './modelIntegrity'

const bytes = (text: string) => new TextEncoder().encode(text).buffer

describe('3D model integrity (ADR-028)', () => {
  it('hashes bytes as 64 lowercase hex characters (known SHA-256 vector)', async () => {
    expect(await sha256Hex(bytes('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('hands back a local copy only when the file matches its fingerprint', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('abc')))
    const url = await verifiedModelUrl({ url: 'https://nasa.example/m.glb', sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' })
    expect(url).toMatch(/^blob:/)
  })

  it('refuses a changed file, a missing fingerprint, and reports a failed download as such', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('abd')))
    await expect(verifiedModelUrl({ url: 'https://nasa.example/m.glb', sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' })).rejects.toBeInstanceOf(ModelIntegrityError)
    await expect(verifiedModelUrl({ url: 'https://nasa.example/m.glb' })).rejects.toBeInstanceOf(ModelIntegrityError)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    const failure = verifiedModelUrl({ url: 'https://nasa.example/m.glb', sha256: 'a'.repeat(64) })
    await expect(failure).rejects.toThrow('download failed (503)')
    await expect(failure).rejects.not.toBeInstanceOf(ModelIntegrityError)
  })
})
