import { describe, expect, it } from 'vitest'
import { loadContent } from './load.js'
import type { Content } from './types.js'
import { validateContent } from './validate.js'

const real = loadContent()
const clone = (): Content => structuredClone(real)
const errorsOf = (content: Content) => validateContent(content).errors

describe('content integrity (real content)', () => {
  it('has no integrity error', () => {
    expect(errorsOf(real)).toEqual([])
  })

  it('only covers the Moon and Mars', () => {
    expect(real.destinations.map((d) => d.id).sort()).toEqual(['mars', 'moon'])
  })

  it('contains the four stories chosen by the team, all still in draft', () => {
    expect(real.stories.map((s) => s.id).sort()).toEqual([
      'mars-ingenuity',
      'mars-spirit-opportunity',
      'moon-apollo11-retroreflectors',
      'moon-surveyor-apollo12',
    ])
    // Only a human reviewer may mark a story as reviewed (CLAUDE.md §7).
    expect(real.stories.every((s) => s.status === 'draft')).toBe(true)
  })

  it('never displays a machine outside the scope (no Pioneer 10)', () => {
    expect(JSON.stringify(real).toLowerCase()).not.toContain('pioneer')
  })
})

describe('content integrity (rules)', () => {
  it('rejects a glossary entry without source or without a French form (V14)', () => {
    const c = clone()
    c.glossary[0]!.sourceIds = []
    c.glossary[1]!.terms.fr = []
    const errors = errorsOf(c)
    expect(errors).toContainEqual(expect.stringContaining(`glossary/${c.glossary[0]!.id}.sourceIds`))
    expect(errors).toContainEqual(expect.stringContaining('needs at least one "fr" form (V14)'))
  })

  it('rejects a picture story without review status (V15)', () => {
    const c = clone()
    const story = c.media.find((m) => m.description)!
    delete story.descriptionStatus
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('descriptionStatus draft|reviewed (V15)'))
  })

  it('keeps every picture story in draft until a human reviews it', () => {
    const stories = real.media.filter((m) => m.description)
    expect(stories.length).toBeGreaterThan(30)
    expect(stories.every((m) => m.descriptionStatus === 'draft')).toBe(true)
  })

  it('rejects an unknown source', () => {
    const c = clone()
    c.machines[0]!.status.sourceIds = ['does-not-exist']
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('unknown source "does-not-exist"'))
  })

  it('rejects a fact without source', () => {
    const c = clone()
    c.machines[0]!.status.sourceIds = []
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('needs at least 1 source'))
  })

  it('rejects coordinates out of range', () => {
    const c = clone()
    const machine = c.machines.find((m) => m.coordinates !== null)!
    machine.coordinates!.value.lon = 336.582
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('longitude out of [-180, 180]'))
  })

  it('rejects a destination other than the Moon or Mars', () => {
    const c = clone()
    c.missions[0]!.destinationId = 'vesta' as never
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('unknown destination "vesta"'))
  })

  it('rejects a story whose steps are not the six steps in order', () => {
    const c = clone()
    const steps = c.stories[0]!.steps
    ;[steps[0], steps[1]] = [steps[1]!, steps[0]!]
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('steps must be exactly'))
  })

  it('rejects a "data" block without source', () => {
    const c = clone()
    const block = c.stories[0]!.steps[0]!.blocks[0]!
    block.voice = 'data'
    block.sourceIds = []
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('needs at least 1 source'))
  })

  it('rejects relations outside the relay step', () => {
    const c = clone()
    c.stories[0]!.steps[0]!.relationIds = [c.relations[0]!.id]
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('only allowed in the relay step'))
  })

  it('rejects a main story that does not list its mission', () => {
    const c = clone()
    const mission = c.missions.find((m) => m.id === 'apollo-12')!
    mission.mainStoryId = 'mars-ingenuity'
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('does not list this mission'))
  })

  it('rejects missing translations', () => {
    const c = clone()
    c.missions[0]!.summary = { en: 'Only English', fr: '' }
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('missing "fr" text'))
  })

  it('rejects an invalid date', () => {
    const c = clone()
    c.machines[0]!.date!.value = '1967-13-40'
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('invalid date'))
  })

  it('requires every media to say what it really shows (photo, artwork, simulation…)', () => {
    const c = clone()
    c.media[0]!.depiction = 'painting' as never
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('depiction must be one of'))
  })

  it('pins every 3D model to verified bytes and never to a moving GitHub branch (V19)', () => {
    const models = real.media.filter((m) => m.type === '3d-model')
    expect(models.length).toBeGreaterThanOrEqual(3)
    expect(models.every((m) => /^[0-9a-f]{64}$/.test(m.sha256 ?? ''))).toBe(true)

    const c = clone()
    const ingenuity = c.media.find((m) => m.id === 'ingenuity-3d-model')!
    delete ingenuity.sha256
    const mer = c.media.find((m) => m.id === 'mer-3d-model')!
    mer.url = mer.url.replace(/\/NASA-3D-Resources\/[0-9a-f]{40}\//, '/NASA-3D-Resources/master/')
    const errors = errorsOf(c)
    expect(errors).toContainEqual(expect.stringContaining('media/ingenuity-3d-model: 3D model needs sha256'))
    expect(errors).toContainEqual(expect.stringContaining('media/mer-3d-model: GitHub model url must be pinned'))
  })

  it('keeps every machine lifespan sourced and in draft until a human reviews it (V16)', () => {
    const lives = real.machines.flatMap((m) => (m.lifespan ? [m.lifespan] : []))
    expect(lives).toHaveLength(real.machines.length)
    expect(lives.every((l) => l.status === 'draft')).toBe(true)
    expect(validateContent(real).warnings.some((w) => w.includes('lifespan: draft'))).toBe(true)
  })

  it('rejects a lifespan with a bad date, an end before arrival, or an end on a working machine (V16)', () => {
    const c = clone()
    const spirit = c.machines.find((m) => m.id === 'spirit')!
    spirit.lifespan!.lastContact = { value: '2010-03', sourceIds: ['nssdca-2003-027a'] }
    spirit.lifespan!.missionEnd = { value: '1999-01-01', sourceIds: ['nssdca-2003-027a'] }
    const lrrr = c.machines.find((m) => m.id === 'apollo-11-lrrr')!
    lrrr.lifespan!.missionEnd = { value: '2020-01-01', sourceIds: ['jpl-llr-2004'] }
    const errors = errorsOf(c).join(' | ')
    expect(errors).toMatch(/spirit\.lifespan\.lastContact: must be a full date/)
    expect(errors).toMatch(/spirit\.lifespan\.missionEnd: ends before the machine arrived/)
    expect(errors).toMatch(/apollo-11-lrrr\.lifespan: a machine still working has no end date/)
  })

  it('rejects a lifespan fact without source or with an unknown unit (V16)', () => {
    const c = clone()
    const ingenuity = c.machines.find((m) => m.id === 'ingenuity')!
    ingenuity.lifespan!.planned = { value: { amount: 5, unit: 'hops' as never }, sourceIds: [] }
    const errors = errorsOf(c).join(' | ')
    expect(errors).toMatch(/ingenuity\.lifespan\.planned/)
    expect(errors).toMatch(/unknown unit "hops"/)
  })

  const biography = (): NonNullable<Content['machines'][number]['biography']> => ({
    status: 'draft',
    description: { value: { en: 'A rover.', fr: 'Un rover.' }, sourceIds: ['nssdca-2003-032a'] },
    chapters: [
      {
        id: 'landing',
        date: { value: '2004-01-25', sourceIds: ['nssdca-2003-032a'] },
        title: { en: 'Landing', fr: 'Atterrissage' },
        text: { en: 'It lands.', fr: 'Il se pose.' },
        mediaIds: ['mer-lion-king-panorama-pia05755'],
        sourceIds: ['nssdca-2003-032a'],
      },
      {
        id: 'blueberries',
        date: { value: '2004-03', sourceIds: ['nasa-science-mer-highlights'] },
        title: { en: 'Blueberries', fr: 'Myrtilles' },
        text: { en: 'It finds them.', fr: 'Il les trouve.' },
        mediaIds: ['mer-blueberries-pia19113'],
        sourceIds: ['nasa-science-mer-highlights'],
      },
    ],
  })

  it('accepts a sourced machine biography in draft (V17)', () => {
    const c = clone()
    c.machines.find((m) => m.id === 'opportunity')!.biography = biography()
    expect(errorsOf(c)).toEqual([])
    expect(validateContent(c).warnings.some((w) => w.includes('opportunity.biography: draft'))).toBe(true)
  })

  it("rejects biography chapters out of order, unsourced, or showing another machine's picture (V17)", () => {
    const c = clone()
    const bio = biography()
    bio.chapters.reverse()
    bio.chapters[0]!.sourceIds = []
    bio.chapters[1]!.mediaIds = ['nasa-lib-pia05044']
    c.machines.find((m) => m.id === 'opportunity')!.biography = bio
    const errors = errorsOf(c).join(' | ')
    expect(errors).toMatch(/opportunity\.biography\/landing\.date: chapters must be in chronological order/)
    expect(errors).toMatch(/opportunity\.biography\/blueberries\.sourceIds: needs at least 1 source/)
    expect(errors).toMatch(/media "nasa-lib-pia05044" does not show this machine/)
  })

  it('accepts sourced "for Earth" items and parts placed on a photo of the machine (V17, V18)', () => {
    const c = clone()
    const opportunity = c.machines.find((m) => m.id === 'opportunity')!
    opportunity.biography = {
      ...biography(),
      forEarth: [{ id: 'water', title: { en: 'Water', fr: 'Eau' }, text: { en: 'It showed water.', fr: 'Il a montré de l’eau.' }, mediaIds: [], sourceIds: ['nasa-science-mer-highlights'] }],
    }
    opportunity.parts = {
      status: 'draft',
      photoMediaId: 'mer-lion-king-panorama-pia05755',
      modelMediaId: null,
      items: [
        {
          id: 'pancam',
          name: { en: 'Pancam', fr: 'Pancam' },
          description: { en: 'Its eyes.', fr: 'Ses yeux.' },
          sourceIds: ['nssdca-2003-032a'],
          photo: { x: 40, y: 30 },
          modelNode: null,
        },
      ],
    }
    expect(errorsOf(c)).toEqual([])
    expect(validateContent(c).warnings.some((w) => w.includes('opportunity.parts: draft'))).toBe(true)
  })

  it("rejects parts out of the photo, unsourced, unplaced, or on another machine's photo (V18)", () => {
    const c = clone()
    const opportunity = c.machines.find((m) => m.id === 'opportunity')!
    const part = (id: string, photo: { x: number; y: number } | null, sourceIds = ['nssdca-2003-032a']) => ({
      id,
      name: { en: id, fr: id },
      description: { en: 'A part.', fr: 'Une pièce.' },
      sourceIds,
      photo,
      modelNode: null,
    })
    opportunity.parts = {
      status: 'draft',
      photoMediaId: 'nasa-lib-pia05044',
      modelMediaId: null,
      items: [part('off-photo', { x: 140, y: 20 }), part('no-source', { x: 10, y: 10 }, []), part('nowhere', null)],
    }
    const errors = errorsOf(c).join(' | ')
    expect(errors).toMatch(/photo "nasa-lib-pia05044" must exist and show this machine/)
    expect(errors).toMatch(/off-photo: photo position must be in percent/)
    expect(errors).toMatch(/no-source\.sourceIds: needs at least 1 source/)
    expect(errors).toMatch(/nowhere: must be placed on the photo or on the 3D model/)
  })

  it('rejects a timeline event without source', () => {
    const c = clone()
    c.missions[0]!.timeline[0]!.date.sourceIds = []
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('needs at least 1 source'))
  })

  it('rejects timeline events out of chronological order', () => {
    const c = clone()
    const timeline = c.missions.find((m) => m.timeline.length > 2)!.timeline
    ;[timeline[0], timeline[1]] = [timeline[1]!, timeline[0]!]
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('chronological order'))
  })

  it('accepts a partial date right after a full date of the same month', () => {
    const c = clone()
    const mission = c.missions.find((m) => m.id === 'surveyor-3')!
    expect(mission.timeline.map((e) => e.date.value).slice(1, 3)).toEqual(['1967-04-20', '1967-04'])
    expect(errorsOf(c)).toEqual([])
  })

  it('rejects a timeline illustration that belongs to another mission', () => {
    const c = clone()
    const mission = c.missions.find((m) => m.id === 'apollo-11')!
    mission.timeline[1]!.mediaIds = ['ingenuity-anatomy']
    expect(errorsOf(c)).toContainEqual(expect.stringContaining('is not linked to this mission'))
  })
})

describe('content for a general audience (real content)', () => {
  it('illustrates every step of every story', () => {
    for (const story of real.stories) {
      for (const step of story.steps) {
        expect(step.blocks.some((b) => (b.mediaIds ?? []).length > 0), `${story.id}/${step.key}`).toBe(true)
      }
    }
  })

  it('gives every mission a timeline in both languages', () => {
    for (const mission of real.missions) {
      expect(mission.timeline.length, mission.id).toBeGreaterThan(0)
      for (const e of mission.timeline) {
        expect(e.description.fr.length, `${mission.id}/${e.id}`).toBeGreaterThan(0)
        expect(e.description.en.length, `${mission.id}/${e.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('has a real French alt text for every media (not the English title copied)', () => {
    for (const m of real.media) {
      expect(m.alt.fr, m.id).not.toMatch(/^(Image|Vidéo) de la NASA \(/)
      expect(m.alt.fr, m.id).not.toBe(m.alt.en)
    }
  })

  it('flags artist concepts and simulations instead of passing them off as photos', () => {
    const byNasaId = (id: string) => real.media.find((m) => m.nasaId === id)!
    expect(byNasaId('PIA23720').depiction).toBe('artwork')
    expect(byNasaId('PIA03241').depiction).toBe('simulation')
    expect(real.media.some((m) => m.credit === 'NASA/JPCaltech')).toBe(false)
  })
})
