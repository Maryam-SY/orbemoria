/**
 * Response shapes of the OrbeMoria API (backend/src/routes/content.ts), already localized:
 * every bilingual text arrives as a plain string for the requested language.
 * Contract: docs/architecture/ARCHITECTURE.md §16.
 */
import type { DestinationId } from '@/types/content'

export type Lang = 'en' | 'fr'

export interface Sourced<T> {
  value: T
  sourceIds: string[]
  note?: string
}

export type MachineStatus = 'operational' | 'contact-lost' | 'inactive' | 'mission-ended' | 'unknown'
export type MachineType = 'lander' | 'rover' | 'descent-stage' | 'experiment' | 'helicopter' | 'impactor' | 'other'
export type MediaType = 'image' | 'animation' | 'video' | '3d-model' | 'document'
export type Depiction = 'photo' | 'artwork' | 'simulation' | 'diagram' | 'mixed' | 'document'
export type Voice = 'data' | 'interpretation' | 'imagination'
export type StepKey = 'signal' | 'why' | 'how' | 'discovery' | 'relay' | 'your-turn'

export interface Source {
  id: string
  organization: string
  title: string
  url: string
  type: string
  publishedOn: string | null
  accessedOn: string
  note?: string
}

export interface Media {
  id: string
  type: MediaType
  url: string
  /** SHA-256 of the file, for 3D models (V19): the viewer checks it before showing the model. */
  sha256?: string
  thumbnailUrl?: string | null
  /** Verified mid-size copy of the picture, when the library has one (US-5.14). */
  largeUrl?: string | null
  /** NASA Image and Video Library / Photojournal identifier, when the media comes from it. */
  nasaId?: string
  pageUrl: string
  title: string | null
  caption: string | null
  alt: string
  credit: string | null
  license: string
  depiction: Depiction
  description?: string
  descriptionStatus?: 'draft' | 'reviewed'
  missionIds: string[]
  machineIds: string[]
  sourceId: string
}

export interface StorySummary {
  id: string
  title: string
  status: 'draft' | 'reviewed'
  missionIds: string[]
}

export interface Machine {
  id: string
  name: string
  missionId: string
  type: MachineType
  nssdcaId: string | null
  date: Sourced<string> | null
  dateLabel?: 'landing' | 'deployment' | 'impact' | 'last-contact'
  locationName: Sourced<string> | null
  coordinates: Sourced<{ lat: number; lon: number }> | null
  status: Sourced<MachineStatus>
  scienceSummary: Sourced<string> | null
  storyIds: string[]
  /** First real photo of the machine (never a drawing), on destination and mission lists. */
  cover?: Media | null
  /** Planned life and real end (US-5.12); absent while the content does not tell it. */
  lifespan?: Lifespan | null
  /** The machine's own life story (US-5.13); absent while the content does not tell it. */
  biography?: Biography | null
  parts?: MachineParts | null
}

/** One dated moment of a single machine's life, in full sentences (US-5.13). */
export interface MachineChapter {
  id: string
  date: Sourced<string> | null
  title: string
  text: string
  mediaIds: string[]
  sourceIds: string[]
}

export interface Biography {
  status: 'draft' | 'reviewed'
  description: Sourced<string>
  chapters: MachineChapter[]
  /** What it brought to people on Earth or to human progress (US-5.13). */
  forEarth?: EarthBenefit[]
}

export interface EarthBenefit {
  id: string
  title: string
  text: string
  mediaIds: string[]
  sourceIds: string[]
}

/** Touch points on the machine's photo and 3D model (US-5.13, rule V18). */
export interface MachineParts {
  status: 'draft' | 'reviewed'
  photoMediaId: string | null
  modelMediaId: string | null
  items: MachinePart[]
}

export interface MachinePart {
  id: string
  name: string
  description: string
  sourceIds: string[]
  photo: { x: number; y: number } | null
  modelNode: string | null
  modelPosition?: { x: number; y: number; z: number } | null
}

export type LifespanUnit = 'days' | 'sols' | 'flights' | 'years'

/** How long a machine was meant to live, and when it really fell silent (US-5.12). */
export interface Lifespan {
  /** "draft" until a human has checked these figures (rule V16). */
  status: 'draft' | 'reviewed'
  /** Designed / primary-mission duration announced before launch. */
  planned: Sourced<{ amount: number; unit: LifespanUnit }> | null
  /** Last signal received from the machine. */
  lastContact: Sourced<string> | null
  /** Official end of its mission, when it differs from the last contact. */
  missionEnd: Sourced<string> | null
  /** Still in use today (e.g. a laser reflector). */
  stillWorking: Sourced<boolean> | null
  /** What it achieved beyond the plan, in plain words (each sourced). */
  achievements: Sourced<string>[]
}

export interface TimelineEvent {
  id: string
  date: Sourced<string>
  title: string
  description: string
  mediaIds: string[]
}

export interface Mission {
  id: string
  name: string
  destinationId: DestinationId
  agency: string[]
  nssdcaIds: string[]
  period: Sourced<{ start: string; end?: string | null }> | null
  summary: string
  mainStoryId: string | null
  sourceIds: string[]
  order: number
  timeline: TimelineEvent[]
}

/** One end of a relation, named by the API (machine and story details). */
export interface EntityLabel {
  kind: 'machine' | 'mission'
  id: string
  name: string
  destinationId: DestinationId | null
}

export interface Relation {
  id: string
  from: { kind: 'machine' | 'mission'; id: string }
  to: { kind: 'machine' | 'mission'; id: string }
  type: string
  transmitted: string
  evidence: string
  sourceIds: string[]
  /** Present on GET /api/machines/:id and /api/stories/:id. */
  fromEntity?: EntityLabel | null
  toEntity?: EntityLabel | null
}

export interface DestinationSummary {
  id: DestinationId
  name: string
  kind: 'natural-satellite' | 'planet'
  intro: string
  order: number
  missionCount: number
  machineCount: number
}

export interface DestinationDetail extends DestinationSummary {
  missions: (Mission & { machines: Machine[]; mainStory: StorySummary | null })[]
}

export interface MissionDetail extends Omit<Mission, 'timeline'> {
  timeline: (TimelineEvent & { media: Media[] })[]
  machines: Machine[]
  stories: StorySummary[]
  relations: Relation[]
  media: Media[]
  /** Sources of the mission and of every dated step (resolved by the API). */
  sources?: Source[]
}

export interface MachineDetail extends Machine {
  destinationId: DestinationId | null
  mission: { id: string; name: string; destinationId: DestinationId } | null
  relations: Relation[]
  media: Media[]
  storyTarget: StorySummary | null
  sources: Source[]
}

export interface StoryBlock {
  voice: Voice
  text: string
  sourceIds: string[]
  mediaIds?: string[]
}

export interface StoryStep {
  key: StepKey
  title: string
  blocks: StoryBlock[]
  relationIds?: string[]
}

export interface StoryDetail {
  id: string
  kind: 'mission' | 'machine'
  missionIds: string[]
  machineIds: string[]
  title: string
  status: 'draft' | 'reviewed'
  steps: StoryStep[]
  destinationId: DestinationId | null
  missions: { id: string; name: string; destinationId: DestinationId }[]
  /** Machines cited by the story (STORY-008), with the destination where each one is. */
  machines: { id: string; name: string; destinationId: DestinationId | null }[]
  /** Opening photo of the story (first real photo among its media). */
  cover?: Media | null
  relations: Relation[]
  media: Media[]
  sources: Source[]
}

/** A word explained next to the story steps (GET /api/glossary, rule V14). */
export interface GlossaryEntry {
  id: string
  status: 'draft' | 'reviewed'
  /** Forms of the word in the story texts — not localized by the API: pick `terms[locale]`. */
  terms: { en: string[]; fr: string[] }
  label: string
  definition: string
  sourceIds: string[]
  sources: Source[]
}

/** One dated machine on the Moon + Mars timeline (GET /api/timeline). */
export interface TimelineEntry {
  machineId: string
  name: string
  missionId: string
  missionName: string
  destinationId: DestinationId
  date: Sourced<string>
  dateLabel: 'landing' | 'deployment' | 'impact' | 'last-contact' | null
  status: Sourced<MachineStatus>
}
