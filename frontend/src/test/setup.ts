import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// Pages are code-split (lazy imports): give `findBy…` time to fetch and render them when the
// whole suite runs in parallel.
configure({ asyncUtilTimeout: 5000 })

// Warm the code-split pages once per worker, so the first test that navigates to one does not
// pay their transform time inside its own wait.
beforeAll(async () => {
  await Promise.all([import('@/pages/DestinationPage'), import('@/pages/MachinePage'), import('@/pages/StoryPage'), import('@/pages/AboutPage'), import('@/pages/ArPage'), import('@/pages/NotFoundPage')])
})
import { installMockApi } from './mockApi'

// Every test talks to a fake API built from fixtures; tests can override it with vi.stubGlobal.
beforeEach(() => {
  installMockApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// jsdom has no canvas implementation; WarpField simply skips drawing when there is no context.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext

// jsdom does not scroll; the router's scroll restoration and the immersive pages call these.
window.scrollTo = (() => {}) as typeof window.scrollTo

// jsdom cannot play media: by default the intro video "refuses" to play (as a browser that
// blocks autoplay would), so pages render straight away. Intro tests override this.
window.HTMLMediaElement.prototype.play = () => Promise.reject(new Error('jsdom cannot play media'))
window.HTMLMediaElement.prototype.pause = () => {}

// jsdom has no object URLs: a verified 3D model (ADR-028) gets a recognisable fake one.
let objectUrls = 0
URL.createObjectURL = (() => `blob:verified-model-${(objectUrls += 1)}`) as typeof URL.createObjectURL
URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL
