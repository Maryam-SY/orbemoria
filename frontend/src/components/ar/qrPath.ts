/** The grid of a QR code: `size` × `size` modules, `dark(row, col)` true for a black module. */
export interface QrGrid {
  size: number
  dark: (row: number, col: number) => boolean
}

/**
 * One SVG path drawing every dark module of a QR code as a 1 × 1 square, offset by a quiet zone
 * of `margin` modules (US-5.16). Built from the grid as an SVG image: no HTML is injected into the page.
 */
export function qrPath({ size, dark }: QrGrid, margin = 4): string {
  let path = ''
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (dark(row, col)) path += `M${col + margin} ${row + margin}h1v1h-1z`
    }
  }
  return path
}

/** Builds the grid of a QR code for `text` with the lazily loaded qrcode-generator (ADR-028). */
export async function makeQrGrid(text: string): Promise<QrGrid> {
  const { default: qrcode } = await import('qrcode-generator')
  // Type 0 = smallest size that fits; level M survives a little blur or glare on a screen.
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  return { size: qr.getModuleCount(), dark: (row, col) => qr.isDark(row, col) }
}
