import { describe, expect, it } from 'vitest'
import { makeQrGrid, qrPath } from './qrPath'

describe('QR code (US-5.16)', () => {
  it('draws one square per dark module, shifted by the quiet zone', () => {
    const grid = { size: 2, dark: (row: number, col: number) => row === col }
    expect(qrPath(grid, 4)).toBe('M4 4h1v1h-1zM5 5h1v1h-1z')
    expect(qrPath({ size: 2, dark: () => false })).toBe('')
  })

  it('encodes an AR page address in a scannable grid (finder patterns in the corners)', async () => {
    const grid = await makeQrGrid('https://orbemoria.example/ar/mars/ingenuity')
    // Version 3 (29 × 29) is the smallest that holds this address at level M.
    expect(grid.size).toBeGreaterThanOrEqual(21)
    expect((grid.size - 17) % 4).toBe(0)
    // The three 7 × 7 finder squares: dark outer ring, light ring, dark centre.
    for (const [row, col] of [
      [0, 0],
      [0, grid.size - 7],
      [grid.size - 7, 0],
    ] as const) {
      expect(grid.dark(row, col)).toBe(true)
      expect(grid.dark(row + 1, col + 1)).toBe(false)
      expect(grid.dark(row + 3, col + 3)).toBe(true)
    }
  })
})
