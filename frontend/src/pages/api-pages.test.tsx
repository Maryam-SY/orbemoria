import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute } from '@/test/renderRoute'

// <model-viewer> needs WebGL: in jsdom its module is replaced by an empty one (the element stays inert).
vi.mock('@google/model-viewer', () => ({}))

describe('destination hangar (US-5.12)', () => {
  it('lists every machine of the world as a card to wake up, without the landing map', async () => {
    renderRoute('/explore/mars')
    expect(await screen.findByRole('heading', { level: 2, name: 'Choose a machine' })).toBeInTheDocument()
    const card = await screen.findByRole('link', { name: 'Wake up Test Rover (2004 to 2010)' })
    expect(card).toHaveAttribute('href', '/explore/mars/machine-a')
    expect(within(card).getByText('Test Mission')).toBeInTheDocument()
    expect(within(card).getByText('Mission ended')).toBeInTheDocument()
    // US-5.15: one sourced hook per card (90 sols planned, 6 years lived → ×25).
    expect(within(card).getByText('Lived 25 times longer than planned')).toBeInTheDocument()
    // US-5.12 (team decision): the landing-site map and the long mission scroll are gone.
    expect(screen.queryByRole('heading', { name: 'Where did they land?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Step by step' })).not.toBeInTheDocument()
  })

  it('shows a clear error with a retry button when the API does not answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    renderRoute('/explore/moon')
    const alerts = await screen.findAllByRole('alert')
    expect(alerts[0]).toHaveTextContent('This content could not be loaded.')
    expect(screen.getAllByRole('button', { name: 'Try again' }).length).toBeGreaterThan(0)
  })

  it('asks the API in French when the interface is in French, and in Wolof too (stories not translated yet)', async () => {
    const fetchMock = vi.mocked(fetch)
    renderRoute('/explore/moon', 'fr')
    await screen.findByRole('link', { name: /Réveiller Test Lander/ })
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('lang=fr')

    fetchMock.mockClear()
    renderRoute('/explore/moon', 'wo')
    await screen.findAllByRole('link', { name: /Yee Test Lander/ })
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('lang=wo'))).toBe(true)
  })
})

describe('machine page (US-5.12)', () => {
  it('tells one machine its whole life: arrival, planned and real life, legacy, last signal', async () => {
    renderRoute('/explore/mars/machine-a')
    expect(await screen.findByRole('heading', { level: 1, name: 'Test Rover' })).toBeInTheDocument()
    expect(screen.getByText('It found traces of ancient water.')).toBeInTheDocument()
    // Planned vs real life (arithmetic on sourced dates only), still in draft.
    const life = screen.getByRole('region', { name: 'How long Test Rover lived' })
    expect(within(life).getByText('90 Martian days')).toBeInTheDocument()
    expect(within(life).getByText('6 years, 2 months')).toBeInTheDocument()
    expect(within(life).getByText('It drove 7.73 kilometres.')).toBeInTheDocument()
    // No "being checked against its sources" line inside the story: that lives on the About page.
    expect(within(life).queryByText(/being checked by our team/)).not.toBeInTheDocument()
    // What it passed on, both ends named; then its last signal.
    const legacy = screen.getByRole('region', { name: 'What it passed on' })
    expect(within(legacy).getByText('The airbag landing system.')).toBeInTheDocument()
    expect(within(legacy).getByText('Earlier Mission')).toBeInTheDocument()
    const end = screen.getByRole('region', { name: 'Its last signal' })
    expect(within(end).getByText('22 March 2010')).toBeInTheDocument()
    // Sources are listed on the About page only (team decision), never inside the story.
    expect(screen.queryByRole('link', { name: /Test source page/ })).not.toBeInTheDocument()
    // US-5.14: no fixed 6-step story — the acts of its own life, from its sourced dates:
    // the planned mission (90 sols), then overtime (×25), each with its own title card.
    expect(screen.queryByRole('link', { name: /6 steps/ })).not.toBeInTheDocument()
    expect(screen.queryByText('The test story')).not.toBeInTheDocument()
    const planned = screen.getByRole('region', { name: 'The planned mission' })
    expect(within(planned).getByText('90 Martian days planned. Everything after that is a gift.')).toBeInTheDocument()
    const beyond = screen.getByRole('region', { name: 'Overtime' })
    expect(within(beyond).getByText('Day 93: planned end of the mission. It carries on.')).toBeInTheDocument()
    expect(within(beyond).getByText('longer than planned')).toBeInTheDocument()
    // Cold open: the page starts from its last signal.
    expect(screen.getByText('Last signal received on 22 March 2010')).toBeInTheDocument()
  })

  it('flies through the pictures of what it did, keeping them readable (US-5.11)', async () => {
    renderRoute('/explore/mars/machine-a')
    const list = await screen.findByRole('list', { name: /In pictures: Test Rover/ })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).getAllByText('What you see:')).toHaveLength(2)
    const corridor = list.closest('.photo-flight')!.querySelector('.photo-flight-world')!
    expect(corridor).toHaveAttribute('aria-hidden', 'true')
    expect(corridor.querySelectorAll('figure')).toHaveLength(2)
  })

  it('plays its videos as a reel, with what they show written on them (MEDIA-001 label kept)', async () => {
    renderRoute('/explore/mars/machine-a')
    const reel = await screen.findByRole('region', { name: 'Videos of Test Rover' })
    expect(within(reel).getByText('The rover rolls off its lander.')).toBeInTheDocument()
    expect(within(reel).getByText('Contains animation')).toBeInTheDocument()
    expect(reel.querySelector('video')).toHaveAttribute('src', 'https://example.org/videos/rover~medium.mp4')
  })

  it('shows its NASA 3D model in its own chapter', async () => {
    renderRoute('/explore/mars/machine-a')
    const viewer = await waitForViewer()
    // ADR-028: the NASA file is downloaded, its SHA-256 checked, then shown from a local copy.
    expect(viewer.getAttribute('src')).toMatch(/^blob:verified-model-/)
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url) === 'https://example.org/models/Test%20Rover.glb')).toBe(true)
    expect(screen.getByText('Computer image — not a photo')).toBeInTheDocument()
  })

  it('tells its own biography when the content has one, never its twin steps (US-5.13)', async () => {
    const original = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const response = await original(input)
        if (!new URL(String(input), 'http://localhost').pathname.endsWith('/api/machines/machine-a')) return response
        const machine = await response.json()
        machine.biography = {
          status: 'draft',
          description: { value: 'Test Rover is a six-wheeled robot geologist powered by the Sun.', sourceIds: ['src-1'] },
          chapters: [
            {
              id: 'drive',
              date: { value: '2004-01-15', sourceIds: ['src-1'] },
              title: 'It rolls off',
              text: 'Eleven days after landing, it drives onto the ground for the first time.',
              mediaIds: [machine.media[0].id],
              sourceIds: ['src-1'],
            },
          ],
          forEarth: [{ id: 'airbags', title: 'Safer landings', text: 'Its airbags showed how to land softly.', mediaIds: [], sourceIds: ['src-1'] }],
        }
        machine.parts = {
          status: 'draft',
          photoMediaId: machine.media[0].id,
          // Parts are shown only for machines with a real 3D model (team decision, US-5.13).
          modelMediaId: 'media-model',
          items: [{ id: 'mast', name: 'Camera mast', description: 'Holds its two eyes, high above the ground.', sourceIds: ['src-1'], photo: { x: 50, y: 20 }, modelNode: null }],
        }
        return new Response(JSON.stringify(machine), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }),
    )
    renderRoute('/explore/mars/machine-a')
    const who = await screen.findByRole('region', { name: 'Meet Test Rover' })
    expect(within(who).getByText('Test Rover is a six-wheeled robot geologist powered by the Sun.')).toHaveAttribute('data-narrate')
    const list = screen.getByRole('list', { name: /In pictures: Test Rover/ })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByRole('heading', { name: 'It rolls off' })).toBeInTheDocument()
    // What it brought to Earth, and its parts to touch on its portrait.
    const earth = screen.getByRole('region', { name: 'What it brought back to us on Earth' })
    expect(within(earth).getByText('Its airbags showed how to land softly.')).toBeInTheDocument()
    const parts = within(who).getByRole('list', { name: 'Parts of the machine' })
    await userEvent.setup().click(within(parts).getByRole('button', { name: 'Camera mast' }))
    // Once under the photo (read by screen readers), once on the photo on large screens.
    expect(within(who).getAllByText('Holds its two eyes, high above the ground.').length).toBeGreaterThan(0)
  })

  it('lets the visitor test what they remember, with the fact behind every answer (US-5.15)', async () => {
    const user = userEvent.setup()
    renderRoute('/explore/mars/machine-a')
    const quiz = await screen.findByRole('region', { name: 'What did you remember?' })
    expect(within(quiz).getByText('In which year did Test Rover arrive on Mars?')).toBeInTheDocument()
    await user.click(within(quiz).getByRole('button', { name: '2004' }))
    expect(within(quiz).getByRole('status')).toHaveTextContent('Exactly. Test Rover arrived in 2004.')
    // Wrong answers teach too.
    await user.click(within(quiz).getByRole('button', { name: /900 Martian days/ }))
    expect(within(quiz).getAllByRole('status')[1]).toHaveTextContent('Not quite.')
    await user.click(within(quiz).getByRole('button', { name: 'Rover' }))
    expect(within(quiz).getByText('2 / 3 — you know Test Rover.')).toBeInTheDocument()
  })

  it('opens any picture up close and links the machines of a relation (US-5.15)', async () => {
    const user = userEvent.setup()
    renderRoute('/explore/mars/machine-a')
    await screen.findByRole('heading', { level: 1, name: 'Test Rover' })
    // The flight (and its zoom button) appears once the mission has loaded too.
    await user.click((await screen.findAllByRole('button', { name: 'See the picture up close' }))[0]!)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    // The relation's other end is a link to its world's hangar.
    const legacy = screen.getByRole('region', { name: 'What it passed on' })
    expect(within(legacy).getByRole('link', { name: /Earlier Mission/ })).toHaveAttribute('href', '/explore/mars#hangar')
  })

  it('says when the machine is not on that world', async () => {
    renderRoute('/explore/moon/machine-a')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('story page (connected to the API)', () => {
  it('shows the first step with its voice and image, without any draft notice', async () => {
    renderRoute('/stories/story-a')
    expect(await screen.findByRole('heading', { level: 1, name: 'The test story' })).toBeInTheDocument()
    expect(screen.queryByText(/still being checked/)).not.toBeInTheDocument()
    // All six steps are scenes of one scroll (US-5.6): check the first one's content.
    const signal = screen.getByRole('region', { name: 'Signal' })
    expect(within(signal).getByRole('heading', { level: 2, name: 'Signal' })).toBeInTheDocument()
    expect(within(signal).getByText('Fact')).toBeInTheDocument()
    expect(within(signal).getByAltText('A rover on the ground')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeDisabled()
  })

  it('changes step with the arrow keys, and not while typing', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/stories/story-a?step=2')
    await screen.findByRole('heading', { level: 1, name: 'The test story' })
    await user.keyboard('{ArrowRight}')
    expect(router.state.location.search).toContain('step=3')
    expect(screen.getByRole('heading', { level: 2, name: 'How' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(router.state.location.search).toContain('step=1')
    await user.keyboard('{ArrowLeft}')
    expect(router.state.location.search).toContain('step=1')
  })

  it('jumps to a step from the step list', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/stories/story-a')
    const steps = await screen.findByRole('navigation', { name: 'Story steps' })
    await user.click(within(steps).getByRole('button', { name: /4\s*Discovery/ }))
    expect(router.state.location.search).toContain('step=4')
    expect(within(steps).getByRole('button', { name: /4\s*Discovery/ })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('heading', { level: 2, name: 'Discovery' })).toHaveFocus()
  })

  it('moves between steps with the buttons and keeps the step in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/stories/story-a')
    await user.click(await screen.findByRole('button', { name: 'Next step' }))
    expect(router.state.location.search).toContain('step=2')
    expect(screen.getByRole('heading', { level: 2, name: 'Why' })).toHaveFocus()
    expect(screen.getByRole('button', { name: /2\s*Why/ })).toHaveAttribute('aria-current', 'step')
  })

  it('names both ends of what was passed on at the relay step', async () => {
    renderRoute('/stories/story-a?step=5')
    const relay = await screen.findByRole('region', { name: 'What was passed on' })
    expect(within(relay).getByText('Earlier Mission')).toBeInTheDocument()
    expect(within(relay).getByText('Test Mission')).toBeInTheDocument()
    expect(within(relay).getByText('From', { exact: false })).toHaveClass('sr-only')
  })

  it('offers the missions and machines of the story at the end (US-4.7)', async () => {
    renderRoute('/stories/story-a?step=6')
    expect(await screen.findByRole('heading', { level: 3, name: 'The missions of this story' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Test Mission' })).toHaveAttribute('href', '/explore/mars#hangar')
    expect(screen.getByRole('link', { name: 'Test Rover' })).toHaveAttribute('href', '/explore/mars/machine-a')
  })

  it('shows what was passed on at the relay step, without a "how do we know" line (US-5.13)', async () => {
    renderRoute('/stories/story-a?step=5')
    expect(await screen.findByRole('heading', { level: 3, name: 'What was passed on' })).toBeInTheDocument()
    expect(screen.getByText('The airbag landing system.')).toBeInTheDocument()
    expect(screen.queryByText('A test document says so.')).not.toBeInTheDocument()
  })

  it('offers a way back to the machine and to the other destination at the end', async () => {
    renderRoute('/stories/story-a?step=6&from=machine-a')
    // Scoped to the last step: the voices legend at the top also names "Imagine".
    expect(within(await screen.findByRole('region', { name: 'Your turn' })).getByText('Imagine')).toBeInTheDocument()
    // US-4.2 (3): back to the machine the visitor came from, with its details open.
    expect(screen.getByRole('link', { name: 'Back to the machines of Mars' })).toHaveAttribute('href', '/explore/mars/machine-a')
    expect(screen.getByRole('link', { name: 'Explore Moon' })).toHaveAttribute('href', '/explore/moon')
    expect(screen.queryByRole('button', { name: 'Next step' })).not.toBeInTheDocument()
  })

  it('says when a story does not exist', async () => {
    renderRoute('/stories/unknown-story')
    expect(await screen.findByText('The story “unknown-story” is not available yet.')).toBeInTheDocument()
  })
})

describe('about page (connected to the API)', () => {
  it('lists every source with its consultation date', async () => {
    renderRoute('/about')
    expect(await screen.findByRole('link', { name: /Test source page/ })).toBeInTheDocument()
    expect(screen.getByText(/Consulted on 14 November 2026/)).toBeInTheDocument()
  })
})

async function waitForViewer(): Promise<Element> {
  const { waitFor } = await import('@testing-library/react')
  let viewer: Element | null = null
  await waitFor(() => {
    viewer = document.querySelector('model-viewer')
    expect(viewer).not.toBeNull()
  })
  return viewer!
}
