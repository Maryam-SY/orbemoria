import {
  DEPICTIONS,
  DESTINATION_IDS,
  LANGS,
  LIFESPAN_UNITS,
  MACHINE_STATUSES,
  MACHINE_TYPES,
  MEDIA_TYPES,
  RELATION_TYPES,
  SOURCE_TYPES,
  STEP_KEYS,
  VOICES,
  type Content,
  type EntityRef,
  type LocalizedText,
  type Sourced,
} from './types.js'

export interface ValidationReport {
  errors: string[]
  warnings: string[]
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PARTIAL_DATE = /^\d{4}(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/
const FULL_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const SHA256 = /^[0-9a-f]{64}$/
/** raw.githubusercontent.com/<owner>/<repo>/<40-hex commit>/… — a commit never changes, a branch can. */
const GITHUB_PINNED = /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\//

/**
 * Integrity rules V1–V19 from docs/architecture/DATA_MODEL.md §5.
 * Errors block startup and CI; warnings are reported but tolerated.
 */
export function validateContent(content: Content): ValidationReport {
  const errors: string[] = []
  const warnings: string[] = []
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`)

  const ids = <T extends { id: string }>(name: string, items: T[]) => {
    const set = new Set<string>()
    for (const item of items) {
      if (!KEBAB.test(item.id)) err(`${name}/${item.id}`, 'id must be kebab-case (V1)')
      if (set.has(item.id)) err(`${name}/${item.id}`, 'duplicate id (V1)')
      set.add(item.id)
    }
    return set
  }

  const destinationIds = ids('destinations', content.destinations)
  const missionIds = ids('missions', content.missions)
  const machineIds = ids('machines', content.machines)
  const relationIds = ids('relations', content.relations)
  const storyIds = ids('stories', content.stories)
  const sourceIds = ids('sources', content.sources)
  const mediaIds = ids('media', content.media)
  const citedSources = new Set<string>()

  const text = (where: string, value: LocalizedText | undefined, required = true) => {
    if (!value) {
      if (required) err(where, 'missing localized text')
      return
    }
    for (const lang of LANGS) {
      if (typeof value[lang] !== 'string' || value[lang].trim() === '') err(where, `missing "${lang}" text`)
    }
  }
  const sources = (where: string, list: string[] | undefined, min = 1) => {
    if (!Array.isArray(list) || list.length < min) {
      err(where, `needs at least ${min} source (V4)`)
      return
    }
    for (const id of list) {
      citedSources.add(id)
      if (!sourceIds.has(id)) err(where, `unknown source "${id}" (V3)`)
    }
  }
  const sourced = <T>(where: string, fact: Sourced<T> | null | undefined, check?: (v: T) => void) => {
    if (fact === null || fact === undefined) return
    sources(where, fact.sourceIds)
    if (fact.note) text(`${where}.note`, fact.note)
    check?.(fact.value)
  }
  const ref = (where: string, r: EntityRef) => {
    const known = r.kind === 'machine' ? machineIds : r.kind === 'mission' ? missionIds : null
    if (!known) err(where, `unknown entity kind "${String(r.kind)}"`)
    else if (!known.has(r.id)) err(where, `unknown ${r.kind} "${r.id}" (V3)`)
  }

  // Destinations
  for (const d of content.destinations) {
    if (!(DESTINATION_IDS as readonly string[]).includes(d.id)) err(`destinations/${d.id}`, 'only moon and mars are allowed (V2)')
    text(`destinations/${d.id}.name`, d.name)
    text(`destinations/${d.id}.intro`, d.intro)
  }

  // Missions
  for (const m of content.missions) {
    const w = `missions/${m.id}`
    if (!destinationIds.has(m.destinationId)) err(w, `unknown destination "${m.destinationId}" (V2/V3)`)
    text(`${w}.summary`, m.summary)
    sources(`${w}.sourceIds`, m.sourceIds)
    sourced(`${w}.period`, m.period, (p) => {
      if (!PARTIAL_DATE.test(p.start)) err(`${w}.period`, `invalid start date "${p.start}" (V11)`)
      if (p.end != null) {
        if (!PARTIAL_DATE.test(p.end)) err(`${w}.period`, `invalid end date "${p.end}" (V11)`)
        else if (p.end < p.start) err(`${w}.period`, 'end is before start (V11)')
      }
    })
    if (m.mainStoryId !== null) {
      const story = content.stories.find((s) => s.id === m.mainStoryId)
      if (!story) err(w, `unknown main story "${m.mainStoryId}" (V3)`)
      else if (!story.missionIds.includes(m.id)) err(w, `main story "${story.id}" does not list this mission (V10)`)
    }
    if (!content.machines.some((machine) => machine.missionId === m.id)) warnings.push(`${w}: mission has no machine`)

    // Timeline (V13): dated, sourced, chronological, bilingual, illustrated with this mission's media.
    if (!Array.isArray(m.timeline)) err(w, 'timeline must be an array (V13)')
    else {
      if (m.timeline.length === 0) warnings.push(`${w}: empty timeline`)
      const eventIds = new Set<string>()
      let previous = ''
      for (const e of m.timeline) {
        const we = `${w}/timeline/${e.id}`
        if (!KEBAB.test(e.id) || eventIds.has(e.id)) err(we, 'event id must be unique kebab-case (V13)')
        eventIds.add(e.id)
        sourced(`${we}.date`, e.date, (d) => {
          if (!PARTIAL_DATE.test(d)) err(`${we}.date`, `invalid date "${d}" (V13)`)
          // Partial dates ("1967-04") are compared at their own precision with the previous event.
          else if (d < previous.slice(0, d.length)) err(`${we}.date`, 'events must be in chronological order (V13)')
          else previous = d
        })
        if (!e.date) err(we, 'missing date (V13)')
        text(`${we}.title`, e.title)
        text(`${we}.description`, e.description)
        if (e.mediaIds.length === 0) warnings.push(`${we}: no illustration`)
        for (const id of e.mediaIds) {
          const media = content.media.find((x) => x.id === id)
          if (!media) err(we, `unknown media "${id}" (V3)`)
          else if (!media.missionIds.includes(m.id)) err(we, `media "${id}" is not linked to this mission (V13)`)
        }
      }
    }
  }

  // Machines
  for (const m of content.machines) {
    const w = `machines/${m.id}`
    if (!missionIds.has(m.missionId)) err(w, `unknown mission "${m.missionId}" (V3)`)
    if (!(MACHINE_TYPES as readonly string[]).includes(m.type)) err(w, `unknown type "${m.type}"`)
    sourced(`${w}.date`, m.date, (v) => {
      if (!PARTIAL_DATE.test(v)) err(`${w}.date`, `invalid date "${v}" (V11)`)
    })
    sourced(`${w}.locationName`, m.locationName)
    sourced(`${w}.coordinates`, m.coordinates, (c) => {
      if (typeof c.lat !== 'number' || c.lat < -90 || c.lat > 90) err(`${w}.coordinates`, 'latitude out of [-90, 90] (V5)')
      if (typeof c.lon !== 'number' || c.lon < -180 || c.lon > 180) err(`${w}.coordinates`, 'longitude out of [-180, 180] east-positive (V5)')
    })
    if (!m.status) err(w, 'missing status')
    sourced(`${w}.status`, m.status, (s) => {
      if (!(MACHINE_STATUSES as readonly string[]).includes(s)) err(`${w}.status`, `unknown status "${s}" (DATA-006)`)
    })
    sourced(`${w}.scienceSummary`, m.scienceSummary, (t) => text(`${w}.scienceSummary`, t))
    if (!m.scienceSummary) warnings.push(`${w}: no science summary`)
    for (const id of m.storyIds) if (!storyIds.has(id)) err(w, `unknown story "${id}" (V3)`)

    // V16 — lifespan: sourced amounts and full dates, in order.
    const life = m.lifespan
    if (life) {
      const lw = `${w}.lifespan`
      if (life.status !== 'draft' && life.status !== 'reviewed') err(lw, `invalid status "${String(life.status)}" (V16)`)
      if (life.status === 'draft') warnings.push(`${lw}: draft — needs scientific review before publication (V16)`)
      sourced(`${lw}.planned`, life.planned, (p) => {
        if (typeof p.amount !== 'number' || !(p.amount > 0)) err(`${lw}.planned`, 'amount must be a positive number (V16)')
        if (!(LIFESPAN_UNITS as readonly string[]).includes(p.unit)) err(`${lw}.planned`, `unknown unit "${p.unit}" (V16)`)
      })
      for (const key of ['lastContact', 'missionEnd'] as const) {
        sourced(`${lw}.${key}`, life[key], (v) => {
          if (!FULL_DATE.test(v)) err(`${lw}.${key}`, `must be a full date YYYY-MM-DD, got "${v}" (V16)`)
          if (m.date && FULL_DATE.test(m.date.value) && v < m.date.value) err(`${lw}.${key}`, 'ends before the machine arrived (V16)')
        })
      }
      sourced(`${lw}.stillWorking`, life.stillWorking, (v) => {
        if (typeof v !== 'boolean') err(`${lw}.stillWorking`, 'must be a boolean (V16)')
      })
      if (life.stillWorking?.value && (life.lastContact || life.missionEnd)) err(lw, 'a machine still working has no end date (V16)')
      if (!Array.isArray(life.achievements)) err(lw, 'achievements must be a list (V16)')
      else life.achievements.forEach((a, i) => sourced(`${lw}.achievements[${i}]`, a, (t) => text(`${lw}.achievements[${i}]`, t)))
    }

    // V17 — biography: sourced description and chapters, in order, pictures of this machine only.
    const bio = m.biography
    if (bio) {
      const bw = `${w}.biography`
      if (bio.status !== 'draft' && bio.status !== 'reviewed') err(bw, `invalid status "${String(bio.status)}" (V17)`)
      if (bio.status === 'draft') warnings.push(`${bw}: draft — needs scientific review before publication (V17)`)
      if (!bio.description) err(bw, 'missing description (V17)')
      else sourced(`${bw}.description`, bio.description, (t) => text(`${bw}.description`, t))
      if (!Array.isArray(bio.chapters) || bio.chapters.length === 0) err(bw, 'needs at least one chapter (V17)')
      const chapterIds = new Set<string>()
      let before = ''
      for (const c of bio.chapters ?? []) {
        const wc = `${bw}/${c.id}`
        if (!KEBAB.test(c.id) || chapterIds.has(c.id)) err(wc, 'chapter id must be unique kebab-case (V17)')
        chapterIds.add(c.id)
        sourced(`${wc}.date`, c.date, (d) => {
          if (!PARTIAL_DATE.test(d)) err(`${wc}.date`, `invalid date "${d}" (V17)`)
          else if (d < before.slice(0, d.length)) err(`${wc}.date`, 'chapters must be in chronological order (V17)')
          else before = d
        })
        text(`${wc}.title`, c.title)
        text(`${wc}.text`, c.text)
        sources(`${wc}.sourceIds`, c.sourceIds)
        for (const id of c.mediaIds ?? []) {
          const media = content.media.find((x) => x.id === id)
          if (!media) err(wc, `unknown media "${id}" (V3)`)
          else if (!media.machineIds.includes(m.id)) err(wc, `media "${id}" does not show this machine (V17)`)
        }
      }
      for (const e of bio.forEarth ?? []) {
        const we = `${bw}/forEarth/${e.id}`
        if (!KEBAB.test(e.id) || chapterIds.has(e.id)) err(we, 'id must be unique kebab-case (V17)')
        chapterIds.add(e.id)
        text(`${we}.title`, e.title)
        text(`${we}.text`, e.text)
        sources(`${we}.sourceIds`, e.sourceIds)
        for (const id of e.mediaIds ?? []) if (!mediaIds.has(id)) err(we, `unknown media "${id}" (V3)`)
      }
    }

    // V18 — parts: sourced names placed on a photo of this machine or on its 3D model.
    const parts = m.parts
    if (parts) {
      const pw = `${w}.parts`
      if (parts.status !== 'draft' && parts.status !== 'reviewed') err(pw, `invalid status "${String(parts.status)}" (V18)`)
      if (parts.status === 'draft') warnings.push(`${pw}: draft — needs scientific review before publication (V18)`)
      const photo = parts.photoMediaId ? content.media.find((x) => x.id === parts.photoMediaId) : null
      if (parts.photoMediaId && (!photo || !photo.machineIds.includes(m.id))) err(pw, `photo "${parts.photoMediaId}" must exist and show this machine (V18)`)
      const model = parts.modelMediaId ? content.media.find((x) => x.id === parts.modelMediaId) : null
      if (parts.modelMediaId && (!model || model.type !== '3d-model' || !model.machineIds.includes(m.id))) err(pw, `model "${parts.modelMediaId}" must be a 3D model of this machine (V18)`)
      const partIds = new Set<string>()
      for (const part of parts.items ?? []) {
        const wp = `${pw}/${part.id}`
        if (!KEBAB.test(part.id) || partIds.has(part.id)) err(wp, 'part id must be unique kebab-case (V18)')
        partIds.add(part.id)
        text(`${wp}.name`, part.name)
        text(`${wp}.description`, part.description)
        sources(`${wp}.sourceIds`, part.sourceIds)
        if (part.photo) {
          if (!photo) err(wp, 'placed on a photo, but the parts have no photo (V18)')
          const inRange = (v: number) => typeof v === 'number' && v >= 0 && v <= 100
          if (!inRange(part.photo.x) || !inRange(part.photo.y)) err(wp, 'photo position must be in percent, 0–100 (V18)')
        }
        if ((part.modelNode || part.modelPosition) && !model) err(wp, 'placed on a 3D model, but the parts have no model (V18)')
        if (part.modelPosition && ![part.modelPosition.x, part.modelPosition.y, part.modelPosition.z].every((v) => Number.isFinite(v))) err(wp, 'modelPosition needs x, y, z numbers (V18)')
        if (!part.photo && !part.modelPosition) err(wp, 'must be placed on the photo or on the 3D model (V18)')
      }
    }
  }

  // Relations
  for (const r of content.relations) {
    const w = `relations/${r.id}`
    ref(`${w}.from`, r.from)
    ref(`${w}.to`, r.to)
    if (!(RELATION_TYPES as readonly string[]).includes(r.type)) err(w, `unknown type "${r.type}"`)
    text(`${w}.transmitted`, r.transmitted)
    text(`${w}.evidence`, r.evidence)
    sources(`${w}.sourceIds`, r.sourceIds)
  }

  // Stories
  for (const s of content.stories) {
    const w = `stories/${s.id}`
    text(`${w}.title`, s.title)
    if (!Array.isArray(s.missionIds) || s.missionIds.length === 0) err(w, 'needs at least one mission (V10)')
    for (const id of s.missionIds ?? []) if (!missionIds.has(id)) err(w, `unknown mission "${id}" (V3)`)
    for (const id of s.machineIds) if (!machineIds.has(id)) err(w, `unknown machine "${id}" (V3)`)
    if (s.kind === 'machine' && s.machineIds.length === 0) err(w, 'machine story needs a machine (V10)')
    if (s.status === 'draft') warnings.push(`${w}: draft — needs scientific review before publication`)
    const keys = s.steps.map((step) => step.key)
    if (keys.length !== STEP_KEYS.length || keys.some((k, i) => k !== STEP_KEYS[i])) {
      err(w, `steps must be exactly ${STEP_KEYS.join(' → ')} (V6)`)
    }
    for (const step of s.steps) {
      const ws = `${w}/${step.key}`
      text(`${ws}.title`, step.title)
      if (step.blocks.length === 0) err(ws, 'step has no block')
      if (!step.blocks.some((b) => (b.mediaIds ?? []).length > 0)) warnings.push(`${ws}: step has no illustration`)
      if (step.relationIds?.length && step.key !== 'relay') err(ws, 'relationIds are only allowed in the relay step (V7)')
      for (const id of step.relationIds ?? []) if (!relationIds.has(id)) err(ws, `unknown relation "${id}" (V3)`)
      step.blocks.forEach((b, i) => {
        const wb = `${ws}[${i}]`
        if (!(VOICES as readonly string[]).includes(b.voice)) err(wb, `unknown voice "${b.voice}"`)
        text(`${wb}.text`, b.text)
        if (b.voice === 'data') sources(wb, b.sourceIds)
        else for (const id of b.sourceIds) {
          citedSources.add(id)
          if (!sourceIds.has(id)) err(wb, `unknown source "${id}" (V3)`)
        }
        if (b.voice === 'interpretation' && b.sourceIds.length === 0) warnings.push(`${wb}: interpretation without source`)
        for (const id of b.mediaIds ?? []) if (!mediaIds.has(id)) err(wb, `unknown media "${id}" (V3)`)
      })
    }
  }

  // Sources
  for (const s of content.sources) {
    const w = `sources/${s.id}`
    if (!s.organization?.trim() || !s.title?.trim()) err(w, 'organization and title are required (V9)')
    if (!/^https?:\/\//.test(s.url)) err(w, 'url must be http(s) (V9)')
    else if (!s.url.startsWith('https://')) warnings.push(`${w}: url is not https`)
    if (!FULL_DATE.test(s.accessedOn)) err(w, `invalid accessedOn "${s.accessedOn}" (V9)`)
    if (s.publishedOn !== null && !FULL_DATE.test(s.publishedOn)) err(w, `invalid publishedOn "${s.publishedOn}" (V9)`)
    if (!(SOURCE_TYPES as readonly string[]).includes(s.type)) err(w, `unknown type "${s.type}"`)
    if (s.note) text(`${w}.note`, s.note)
  }

  // Media
  let draftDescriptions = 0
  for (const m of content.media) {
    const w = `media/${m.id}`
    if (!(MEDIA_TYPES as readonly string[]).includes(m.type)) err(w, `unknown type "${m.type}"`)
    if (!/^https?:\/\//.test(m.url) || !/^https?:\/\//.test(m.pageUrl)) err(w, 'url and pageUrl must be http(s)')
    if (m.largeUrl && !/^https:\/\//.test(m.largeUrl)) err(w, 'largeUrl must be https')
    text(`${w}.alt`, m.alt)
    if (!m.license?.trim()) err(w, 'license is required (V12)')
    if (!m.credit) warnings.push(`${w}: no credit shown on the source page`)
    if (!sourceIds.has(m.sourceId)) err(w, `unknown source "${m.sourceId}" (V3)`)
    citedSources.add(m.sourceId)
    if (m.missionIds.length === 0) err(w, 'needs at least one mission')
    for (const id of m.missionIds) if (!missionIds.has(id)) err(w, `unknown mission "${id}" (V3)`)
    for (const id of m.machineIds) if (!machineIds.has(id)) err(w, `unknown machine "${id}" (V3)`)
    if (!(DEPICTIONS as readonly string[]).includes(m.depiction)) err(w, `depiction must be one of ${DEPICTIONS.join(', ')}`)
    if (m.description) {
      text(`${w}.description`, m.description)
      // V15: a picture story always says whether it has been checked.
      if (m.descriptionStatus !== 'draft' && m.descriptionStatus !== 'reviewed') err(w, 'description needs descriptionStatus draft|reviewed (V15)')
      else if (m.descriptionStatus === 'draft') draftDescriptions += 1
    } else if (m.descriptionStatus !== undefined) err(w, 'descriptionStatus without description (V15)')
    if (m.thumbnailUrl != null && !/^https?:\/\//.test(m.thumbnailUrl)) err(w, 'thumbnailUrl must be http(s)')
    if (m.dateCreated != null && !FULL_DATE.test(m.dateCreated)) err(w, `invalid dateCreated "${m.dateCreated}"`)
    // V19 — 3D models: verified bytes (SHA-256), https, and never a moving GitHub branch.
    if (m.type === '3d-model') {
      if (!m.url.startsWith('https://')) err(w, '3D model url must be https (V19)')
      if (!SHA256.test(m.sha256 ?? '')) err(w, '3D model needs sha256: 64 lowercase hex characters (V19)')
      if (m.url.startsWith('https://raw.githubusercontent.com/') && !GITHUB_PINNED.test(m.url)) err(w, 'GitHub model url must be pinned to a 40-character commit, not a branch (V19)')
    } else if (m.sha256 !== undefined && !SHA256.test(m.sha256)) err(w, 'sha256 must be 64 lowercase hex characters (V19)')
  }

  // Glossary (V14): bilingual label and definition, at least one form per language, sourced.
  ids('glossary', content.glossary ?? [])
  for (const g of content.glossary ?? []) {
    const w = `glossary/${g.id}`
    text(`${w}.label`, g.label)
    text(`${w}.definition`, g.definition)
    for (const lang of LANGS) {
      const forms = g.terms?.[lang]
      if (!Array.isArray(forms) || forms.length === 0 || forms.some((f) => typeof f !== 'string' || f.trim() === '')) {
        err(`${w}.terms`, `needs at least one "${lang}" form (V14)`)
      }
    }
    sources(`${w}.sourceIds`, g.sourceIds)
    if (g.status !== 'draft' && g.status !== 'reviewed') err(w, `unknown status "${String(g.status)}" (V14)`)
    else if (g.status === 'draft') warnings.push(`${w}: draft — needs scientific review before publication`)
  }

  if (draftDescriptions > 0) warnings.push(`media: ${draftDescriptions} picture stories in draft — need review before publication (V15)`)

  for (const id of sourceIds) if (!citedSources.has(id)) warnings.push(`sources/${id}: never cited`)

  return { errors, warnings }
}
