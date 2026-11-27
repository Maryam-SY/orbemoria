import type { MachinePart } from '@/api/types'

/** Parts of the machine that can be touched on the model (US-5.13): only those with a 3D position. */
export type PlacedPart = MachinePart & { modelPosition: { x: number; y: number; z: number } }

/** The parts placed on the 3D model: the ones the parts hunt asks to find (US-5.16). */
export const placedParts = (parts: readonly MachinePart[]) => parts.filter((part): part is PlacedPart => Boolean(part.modelPosition))
