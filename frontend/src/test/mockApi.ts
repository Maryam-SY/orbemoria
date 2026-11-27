import { vi } from 'vitest'
import type {
  DestinationDetail,
  GlossaryEntry,
  Machine,
  MachineDetail,
  Media,
  MissionDetail,
  Source,
  StoryDetail,
} from '@/api/types'

/** Small, hand-written fixtures shaped like the real API responses (not real content). */
const source: Source = {
  id: 'src-1',
  organization: 'Test Archive',
  title: 'Test source page',
  url: 'https://example.org/source',
  type: 'nssdca',
  publishedOn: null,
  accessedOn: '2026-11-14',
}

const photo: Media = {
  id: 'media-photo',
  type: 'image',
  url: 'https://example.org/photo.jpg',
  pageUrl: 'https://example.org/photo',
  title: 'A photo',
  caption: null,
  alt: 'A rover on the ground',
  credit: 'NASA/JPL',
  license: 'Test',
  depiction: 'photo',
  missionIds: ['mission-a'],
  machineIds: ['machine-a'],
  sourceId: 'src-1',
}

const artwork: Media = {
  ...photo,
  id: 'media-art',
  alt: 'Drawing of a helicopter',
  depiction: 'artwork',
  credit: null,
  description: 'An artist drew this helicopter years before one flew.',
  descriptionStatus: 'draft',
}

/** A NASA video file of the rover (US-5.12 video reel). */
const video: Media = {
  ...photo,
  id: 'media-video',
  type: 'video',
  url: 'https://example.org/videos/rover~medium.mp4',
  title: 'Rover video',
  alt: 'Video of the test rover',
  depiction: 'mixed',
  description: 'The rover rolls off its lander.',
}

const model: Media = {
  ...photo,
  id: 'media-model',
  type: '3d-model',
  url: 'https://example.org/models/Test%20Rover.glb',
  // SHA-256 of MODEL_BYTES below: the viewer shows the model only when they match (V19).
  sha256: '8af1ae905dc9f27b90fd8780bc2f9c2b8bb577e80e8a2f4e1619ae82fbef984a',
  pageUrl: 'https://example.org/models/test-rover',
  alt: '3D model of the test rover',
  depiction: 'simulation',
  description: 'A fictional 3D model.',
}

const machine: Machine = {
  id: 'machine-a',
  name: 'Test Rover',
  missionId: 'mission-a',
  type: 'rover',
  nssdcaId: null,
  date: { value: '2004-01-04', sourceIds: ['src-1'] },
  dateLabel: 'landing',
  locationName: { value: 'Test Crater', sourceIds: ['src-1'] },
  coordinates: null,
  status: { value: 'mission-ended', sourceIds: ['src-1'] },
  scienceSummary: { value: 'It found traces of ancient water.', sourceIds: ['src-1'] },
  storyIds: [],
  lifespan: {
    status: 'draft',
    planned: { value: { amount: 90, unit: 'sols' }, sourceIds: ['src-1'] },
    lastContact: { value: '2010-03-22', sourceIds: ['src-1'] },
    missionEnd: null,
    stillWorking: null,
    achievements: [{ value: 'It drove 7.73 kilometres.', sourceIds: ['src-1'] }],
  },
}

/** On the Moon fixture the machine has sourced coordinates and a cover photo (site map, US-5.7). */
const mappedMachine: Machine = {
  ...machine,
  id: 'machine-m',
  name: 'Test Lander',
  type: 'lander',
  locationName: { value: 'Test Sea', sourceIds: ['src-1'] },
  coordinates: { value: { lat: 0.67, lon: 23.47 }, sourceIds: ['src-1'] },
  status: { value: 'inactive', sourceIds: ['src-1'] },
  cover: { ...photo, id: 'media-cover', alt: 'A lander on grey ground', machineIds: ['machine-m'] },
}

/** Dated steps of the Mars test mission, shown on the world's own timeline (US-5.13). */
const marsEvents = [
  { id: 'launch', date: { value: '1969-07-16', sourceIds: ['src-1'] }, title: 'Launch', description: 'A rocket leaves Earth.', mediaIds: [] },
  { id: 'arrival', date: { value: '2004-01-04', sourceIds: ['src-1'] }, title: 'Arrival', description: 'The rover lands on Mars.', mediaIds: [] },
]

const destination = (id: 'moon' | 'mars', name: string): DestinationDetail => ({
  id,
  name,
  kind: id === 'moon' ? 'natural-satellite' : 'planet',
  intro: `Machines left on ${name}.`,
  order: 1,
  missionCount: 1,
  machineCount: 1,
  missions: [
    {
      id: 'mission-a',
      name: 'Test Mission',
      destinationId: id,
      agency: ['NASA'],
      nssdcaIds: [],
      period: { value: { start: '2004-01-04', end: '2010-03-22' }, sourceIds: ['src-1'] },
      summary: 'A test mission.',
      mainStoryId: 'story-a',
      sourceIds: ['src-1'],
      order: 1,
      timeline: id === 'mars' ? marsEvents : [],
      machines: id === 'moon' ? [mappedMachine] : [machine],
      mainStory: { id: 'story-a', title: 'The test story', status: 'draft', missionIds: ['mission-a'] },
    },
  ],
})

const mission: MissionDetail = {
  ...destination('mars', 'Mars').missions[0]!,
  timeline: [
    {
      id: 'landing',
      date: { value: '2004-01-04', sourceIds: ['src-1'] },
      title: 'Landing',
      description: 'The rover bounces on its airbags.',
      mediaIds: ['media-photo'],
      media: [photo],
    },
    {
      id: 'helicopter-plan',
      date: { value: '2004-02', sourceIds: ['src-1'] },
      title: 'A plan for later',
      description: 'Engineers draw a future helicopter.',
      mediaIds: ['media-art', 'media-photo'],
      media: [artwork, photo],
    },
  ],
  stories: [],
  relations: [],
  media: [photo, model],
  sources: [source],
}

const machineDetail: MachineDetail = {
  ...machine,
  destinationId: 'mars',
  mission: { id: 'mission-a', name: 'Test Mission', destinationId: 'mars' },
  relations: [
    {
      id: 'rel-1',
      from: { kind: 'mission', id: 'mission-0' },
      to: { kind: 'machine', id: 'machine-a' },
      type: 'technology',
      transmitted: 'The airbag landing system.',
      evidence: 'A test document says so.',
      sourceIds: ['src-1'],
      fromEntity: { kind: 'mission', id: 'mission-0', name: 'Earlier Mission', destinationId: 'mars' },
      toEntity: { kind: 'machine', id: 'machine-a', name: 'Test Rover', destinationId: 'mars' },
    },
  ],
  media: [photo, artwork, video],
  storyTarget: { id: 'story-a', title: 'The test story', status: 'draft', missionIds: ['mission-a'] },
  sources: [source],
}

const steps = (['signal', 'why', 'how', 'discovery', 'relay', 'your-turn'] as const).map((key, i) => ({
  key,
  title: ['Signal', 'Why', 'How', 'Discovery', 'Relay', 'Your turn'][i]!,
  ...(key === 'relay' ? { relationIds: ['rel-1'] } : {}),
  blocks: [
    {
      voice: key === 'your-turn' ? ('imagination' as const) : ('data' as const),
      text: `Text of step ${key}.`,
      sourceIds: key === 'your-turn' ? [] : ['src-1'],
      mediaIds: key === 'signal' ? ['media-photo'] : [],
    },
  ],
}))

const story: StoryDetail = {
  id: 'story-a',
  kind: 'mission',
  missionIds: ['mission-a'],
  machineIds: ['machine-a'],
  title: 'The test story',
  status: 'draft',
  steps,
  destinationId: 'mars',
  missions: [{ id: 'mission-a', name: 'Test Mission', destinationId: 'mars' }],
  machines: [{ id: 'machine-a', name: 'Test Rover', destinationId: 'mars' }],
  relations: [
    {
      id: 'rel-1',
      from: { kind: 'mission', id: 'mission-0' },
      to: { kind: 'mission', id: 'mission-a' },
      type: 'technology',
      transmitted: 'The airbag landing system.',
      evidence: 'A test document says so.',
      sourceIds: ['src-1'],
      fromEntity: { kind: 'mission', id: 'mission-0', name: 'Earlier Mission', destinationId: 'mars' },
      toEntity: { kind: 'mission', id: 'mission-a', name: 'Test Mission', destinationId: 'mars' },
    },
  ],
  media: [photo],
  sources: [source],
}

const glossary: GlossaryEntry[] = [
  {
    id: 'signal-word',
    status: 'draft',
    terms: { en: ['signal'], fr: ['signal'] },
    label: 'Signal',
    definition: 'A test definition of a signal.',
    sourceIds: ['src-1'],
    sources: [source],
  },
]


const ROUTES: Record<string, unknown> = {
  '/api/destinations': [
    { ...destination('moon', 'Moon'), missions: undefined },
    { ...destination('mars', 'Mars'), missions: undefined },
  ],
  '/api/glossary': glossary,
  '/api/destinations/moon': destination('moon', 'Moon'),
  '/api/destinations/mars': destination('mars', 'Mars'),
  '/api/missions/mission-a': mission,
  '/api/machines/machine-a': machineDetail,
  '/api/stories/story-a': story,
  '/api/sources': [source],
  '/api/media': [photo, artwork, model],
}

/** Bytes served for any .glb file (a fake model; its SHA-256 is the fixture's `sha256`). */
export const MODEL_BYTES = 'glTF test model'

/** Replaces global fetch with a router over the fixtures. Unknown paths answer 404. */
export function installMockApi() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname.endsWith('.glb')) return new Response(MODEL_BYTES, { status: 200, headers: { 'Content-Type': 'model/gltf-binary' } })
    const body = ROUTES[url.pathname]
    return new Response(JSON.stringify(body ?? { error: 'Not found' }), {
      status: body ? 200 : 404,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
