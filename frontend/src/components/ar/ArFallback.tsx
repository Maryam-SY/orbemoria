import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { makeQrGrid, qrPath, type QrGrid } from './qrPath'

const MARGIN = 4

/** Mouse-driven devices (computers) get the QR code; touch devices without AR get a short note. */
/** Addresses that only mean something on this computer (development server). */
const isLocalAddress = (url: string) => {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || host.startsWith('127.')
  } catch {
    return false
  }
}

const hasFinePointer = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches

/**
 * Shown under the 3D model when this device cannot place it in the room (US-5.16). On a
 * computer: a QR code that opens the machine's AR page on a phone, with the address written out
 * for those who cannot scan. On a phone or tablet without AR: a note that the model can still be
 * turned here.
 */
export function ArFallback({ url, name }: { url: string; name: string }) {
  const { t } = useTranslation()
  const [grid, setGrid] = useState<QrGrid | null>(null)
  const computer = hasFinePointer()
  const local = isLocalAddress(url)

  useEffect(() => {
    if (!computer || local) return
    let alive = true
    makeQrGrid(url).then(
      (made) => alive && setGrid(made),
      () => alive && setGrid(null),
    )
    return () => {
      alive = false
    }
  }, [computer, local, url])

  if (!computer) {
    return <p className="mt-3 text-sm text-moon-dust">{t('ar.unsupported')}</p>
  }
  // A "localhost" address would open the phone itself, not this computer: no code to scan.
  if (local) {
    return <p className="mt-3 text-sm text-moon-dust">{t('ar.localOnly')}</p>
  }

  const side = grid ? grid.size + MARGIN * 2 : 0
  return (
    <div className="reading-panel mt-4 flex flex-col items-center gap-4 rounded-2xl p-4 sm:flex-row sm:items-start">
      {grid && (
        <img
          alt={t('ar.qrLabel', { name })}
          src={`data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges"><rect width="${side}" height="${side}" fill="#fff"/><path d="${qrPath(grid, MARGIN)}" fill="#000"/></svg>`,
          )}`}
          width={144}
          height={144}
          className="size-36 shrink-0 rounded-lg [image-rendering:pixelated]"
        />
      )}
      <div className="text-sm">
        <p className="flex items-center gap-2 font-heading text-lg font-bold text-world">
          <Smartphone aria-hidden="true" className="size-5" />
          {t('ar.scanTitle')}
        </p>
        <p className="mt-1 leading-relaxed">{t('ar.scanHelp')}</p>
        <p className="mt-2 font-mono text-xs break-all text-moon-dust">{url}</p>
      </div>
    </div>
  )
}
