/**
 * JSX typing of the <model-viewer> custom element (@google/model-viewer, ADR-020).
 * Only the attributes OrbeMoria uses are listed.
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

interface ModelViewerAttributes extends HTMLAttributes<HTMLElement> {
  src: string
  alt: string
  'camera-controls'?: boolean
  'disable-zoom'?: boolean
  'auto-rotate'?: boolean
  'rotation-per-second'?: string
  'touch-action'?: 'pan-y' | 'pan-x' | 'none'
  'interaction-prompt'?: 'auto' | 'none'
  'shadow-intensity'?: string
  loading?: 'auto' | 'lazy' | 'eager'
  reveal?: 'auto' | 'manual'
  /** Augmented reality (US-5.16, ADR-028). */
  ar?: boolean
  'ar-modes'?: string
  'ar-scale'?: 'auto' | 'fixed'
  'ar-placement'?: 'floor' | 'wall'
  'xr-environment'?: boolean
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<ModelViewerAttributes, HTMLElement>
    }
  }
}
