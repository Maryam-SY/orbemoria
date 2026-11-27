import { describe, expect, it } from 'vitest'
import { INTRO_MOMENTS } from './introSound'

describe('intro soundtrack timeline (2026-11-27 edit)', () => {
  it('follows the edited footage in order, each moment overlapping the next (no silent gap)', () => {
    const moments = [INTRO_MOMENTS.launch, INTRO_MOMENTS.moon, INTRO_MOMENTS.mars, INTRO_MOMENTS.flight]
    expect(moments[0]![0]).toBe(0)
    for (let i = 1; i < moments.length; i += 1) {
      expect(moments[i]![0]).toBeGreaterThan(moments[i - 1]![0])
      expect(moments[i]![0]).toBeLessThanOrEqual(moments[i - 1]![1])
    }
    // The edited video (public/media/intro-nasa.mp4) lasts 17.97 s.
    expect(INTRO_MOMENTS.flight[1]).toBeCloseTo(18, 0)
  })
})
