/**
 * HTTP security headers — single source (taken from the « Last Signal » scaffold, SECURITY.md).
 * `vite preview` serves them (vite.config.ts) and a test checks that vercel.json serves exactly
 * the same ones, and that every media of backend/content/ comes from an allowed host.
 *
 * Code, styles, fonts, the 3D decoder and the intro video are self-hosted. The only external
 * origins are the NASA servers the sourced media are loaded from (ADR-017): no other site, no
 * tracker, no third-party embed (YouTube videos open on their own page).
 */

/** NASA servers pictures are loaded from (also vercel.json `images.remotePatterns`). */
export const NASA_IMAGE_HOSTS = [
  'images-assets.nasa.gov',
  'assets.science.nasa.gov',
  'nssdc.gsfc.nasa.gov',
  'science.nasa.gov',
  'www.nasa.gov',
  // Apollo Lunar Surface Journal: NASA Apollo photographs, each with its source page.
  'apollojournals.org',
  'www.apollojournals.org',
  // JPL's image server (pages on www.jpl.nasa.gov).
  'd2pn8kiwq2w21t.cloudfront.net',
  'ilrs.gsfc.nasa.gov',
] as const

/** NASA servers videos (MP4) are played from. */
export const NASA_VIDEO_HOSTS = ['images-assets.nasa.gov'] as const

/**
 * NASA servers 3D models (.glb) are downloaded from. raw.githubusercontent.com serves NASA's own
 * verified GitHub repository nasa/NASA-3D-Resources (Spirit/Opportunity model, US-5.16, ADR-028),
 * authorised by the team on 2026-11-20; only 3D models are read from it.
 */
export const NASA_MODEL_HOSTS = ['assets.science.nasa.gov', 'raw.githubusercontent.com'] as const

const https = (hosts: readonly string[]) => hosts.map((host) => `https://${host}`)

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' only lets the self-hosted Draco decoder (public/draco/) compile WebAssembly.
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob:", ...https(NASA_IMAGE_HOSTS)].join(' '),
  ["media-src 'self'", ...https(NASA_VIDEO_HOSTS)].join(' '),
  "font-src 'self'",
  ["connect-src 'self' data: blob:", ...https(NASA_MODEL_HOSTS)].join(' '),
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), xr-spatial-tracking=(self)',
}
