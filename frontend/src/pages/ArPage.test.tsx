import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ArFallback } from '@/components/ar/ArFallback'
import { I18nProvider } from '@/i18n'
import { renderRoute } from '@/test/renderRoute'

// <model-viewer> needs WebGL: in jsdom its module is replaced by an empty one (the element stays inert).
vi.mock('@google/model-viewer', () => ({}))

/** Wraps the fake API so one response can be changed for a test. */
function patchApi(path: string, change: (body: Record<string, unknown>) => void) {
  const original = globalThis.fetch
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const response = await original(input)
      if (!new URL(String(input), 'http://localhost').pathname.endsWith(path)) return response
      const body = await response.json()
      change(body)
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }),
  )
}

async function viewer(): Promise<HTMLElement> {
  let element: HTMLElement | null = null
  await waitFor(() => {
    element = document.querySelector('model-viewer')
    expect(element).not.toBeNull()
  })
  return element!
}

const withParts = () =>
  patchApi('/api/machines/machine-a', (machine) => {
    machine.parts = {
      status: 'draft',
      photoMediaId: null,
      modelMediaId: 'media-model',
      items: [
        { id: 'mast', name: 'Camera mast', description: 'Holds its two eyes.', sourceIds: ['src-1'], photo: null, modelNode: null, modelPosition: { x: 0, y: 1, z: 0 } },
        { id: 'wheel', name: 'Wheel', description: 'One of six.', sourceIds: ['src-1'], photo: null, modelNode: null, modelPosition: { x: 0.5, y: 0, z: 0 } },
      ],
    }
  })

describe('AR page (US-5.16)', () => {
  it('opens the NASA model ready for the room, with its NASA credit and a way back', async () => {
    renderRoute('/ar/mars/machine-a')
    expect(await screen.findByRole('heading', { level: 1, name: 'Test Rover in your room' })).toBeInTheDocument()
    const model = await viewer()
    expect(model.getAttribute('src')).toMatch(/^blob:verified-model-/)
    expect(model).toHaveAttribute('ar')
    // WebXR and Quick Look only: no Scene Viewer (it would hand the model to a Google app).
    expect(model).toHaveAttribute('ar-modes', 'webxr quick-look')
    expect(model).toHaveAttribute('ar-scale', 'auto')
    expect(within(model).getByRole('button', { name: 'See it in my room' })).toHaveAttribute('slot', 'ar-button')
    expect(screen.getByText('Computer image — not a photo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /3D model: NASA\/JPL, NASA 3D Resources/ })).toHaveAttribute('href', 'https://example.org/models/test-rover')
    expect(screen.getByRole('link', { name: 'Back to Test Rover' })).toHaveAttribute('href', '/explore/mars/machine-a')
    // No placed parts in the fixture: no hunt.
    expect(screen.queryByRole('heading', { name: 'Parts hunt' })).not.toBeInTheDocument()
  })

  it('turns the parts into a hunt, then hands over to the quiz', async () => {
    withParts()
    const user = userEvent.setup()
    renderRoute('/ar/mars/machine-a')
    const model = await viewer()
    const hunt = await screen.findByRole('region', { name: 'Parts hunt' })
    expect(within(hunt).getByText('Parts found: 0 / 2')).toBeInTheDocument()
    expect(screen.getByText('Find its 2 parts: touch the machine or one of its markers.')).toBeInTheDocument()

    await user.click(within(model).getByRole('button', { name: 'Camera mast' }))
    expect(within(hunt).getByText('Parts found: 1 / 2')).toBeInTheDocument()
    expect(within(model).getByRole('button', { name: /^Camera mast.*found/ })).toBeInTheDocument()
    // Opening the same part again does not count twice.
    await user.click(within(model).getByRole('button', { name: /^Camera mast.*found/ }))
    await user.click(within(model).getByRole('button', { name: /^Camera mast.*found/ }))
    expect(within(hunt).getByText('Parts found: 1 / 2')).toBeInTheDocument()

    await user.click(within(model).getByRole('button', { name: 'Wheel' }))
    expect(within(hunt).getByText('Parts found: 2 / 2')).toBeInTheDocument()
    expect(within(hunt).getByText('Well done! You found every part of Test Rover.')).toBeInTheDocument()
    expect(within(hunt).getByRole('link', { name: 'Test what you remember' })).toHaveAttribute('href', '/explore/mars/machine-a#quiz')
  })

  it('on a computer served from localhost, explains that no phone can open that address (no QR code)', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: fine)', media: query, addEventListener() {}, removeEventListener() {} }))
    renderRoute('/ar/mars/machine-a')
    const model = await viewer()
    model.dispatchEvent(new Event('load'))
    expect(await screen.findByText(/The QR code appears once the site is online/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument()
  })

  it('on a computer, shows a QR code of the public address, written out too', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: fine)', media: query, addEventListener() {}, removeEventListener() {} }))
    render(
      <I18nProvider initialLocale="en">
        <ArFallback url="https://orbemoria.example/ar/mars/machine-a" name="Test Rover" />
      </I18nProvider>,
    )
    // The QR encoder is loaded on demand: under a full parallel run, give it more time.
    const qr = await screen.findByRole('img', { name: 'QR code that opens Test Rover in augmented reality on a phone' }, { timeout: 15000 })
    expect(decodeURIComponent(qr.getAttribute('src') ?? '')).toMatch(/^data:image\/svg\+xml,<svg .*<path d="M\d+ \d+h1v1h-1z/)
    expect(screen.getByText('https://orbemoria.example/ar/mars/machine-a')).toBeInTheDocument()
  })

  it('on a touch device without AR, says the model can still be turned here', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
    renderRoute('/ar/mars/machine-a')
    const model = await viewer()
    model.dispatchEvent(new Event('load'))
    expect(await screen.findByText('This device cannot place the machine in your room, but you can still turn it here.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument()
  })

  it('says so when NASA has published no 3D model of the machine', async () => {
    patchApi('/api/missions/mission-a', (mission) => {
      mission.media = (mission.media as { type: string }[]).filter((media) => media.type !== '3d-model')
    })
    renderRoute('/ar/mars/machine-a')
    expect(await screen.findByText(/NASA has not published a 3D model of this machine/)).toBeInTheDocument()
    expect(document.querySelector('model-viewer')).toBeNull()
  })

  it('refuses to show a model whose file no longer matches its verified fingerprint (ADR-028)', async () => {
    const original = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).endsWith('.glb') ? new Response('a different file', { status: 200 }) : original(input),
      ),
    )
    renderRoute('/ar/mars/machine-a')
    expect(await screen.findByText('This 3D model no longer matches the NASA file our team checked, so it is not shown.')).toBeInTheDocument()
    expect(document.querySelector('model-viewer')).toBeNull()
  })

  it('refuses a 3D model that has no fingerprint at all (fail closed)', async () => {
    patchApi('/api/missions/mission-a', (mission) => {
      for (const media of mission.media as { type: string; sha256?: string }[]) if (media.type === '3d-model') delete media.sha256
    })
    renderRoute('/ar/mars/machine-a')
    expect(await screen.findByText(/no longer matches the NASA file our team checked/)).toBeInTheDocument()
    expect(document.querySelector('model-viewer')).toBeNull()
  })

  it('shows the not-found page for an unknown world', async () => {
    renderRoute('/ar/pluto/machine-a')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('machine page links to the hunt (US-5.16)', () => {
  it('offers the parts hunt next to the 3D model when the model has placed parts', async () => {
    withParts()
    renderRoute('/explore/mars/machine-a')
    expect(await screen.findByRole('link', { name: 'Play: find its parts in your room' })).toHaveAttribute('href', '/ar/mars/machine-a')
  })
})
