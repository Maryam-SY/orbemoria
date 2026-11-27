import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Box, Check, ExternalLink, Scan, ShieldAlert } from 'lucide-react'
import type { MachinePart, Media } from '@/api/types'
import { LoadState } from '@/components/common/LoadState'
import { DepictionBadge } from '@/components/media/DepictionBadge'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useTranslation } from '@/i18n'
import { ModelIntegrityError, verifiedModelUrl } from '@/lib/modelIntegrity'
import { placedParts, type PlacedPart } from '@/lib/parts'
import { cn } from '@/lib/utils'

/** "tampered": the file no longer matches the fingerprint the team verified (V19): not shown. */
type Status = 'loading' | 'ready' | 'error' | 'tampered'

type ModelViewerConfig = { dracoDecoderLocation?: string; ktx2TranscoderLocation?: string }

/**
 * <model-viewer> downloads its mesh decoders from a Google CDN by default. NASA models are
 * Draco-compressed, so the decoder is served by this site instead (public/draco/, ADR-020).
 * Must run before the library is imported. KTX2 points to a local path too, so that no
 * request ever leaves for a third party (no current model uses KTX2).
 */
function configureModelViewer() {
  const scope = self as unknown as { ModelViewerElement?: ModelViewerConfig }
  scope.ModelViewerElement = {
    ...scope.ModelViewerElement,
    dracoDecoderLocation: `${import.meta.env.BASE_URL}draco/`,
    ktx2TranscoderLocation: `${import.meta.env.BASE_URL}basis/`,
  }
}

/**
 * A NASA 3D model (.glb from NASA 3D Resources) the visitor can turn, zoom and inspect,
 * rendered by <model-viewer> (ADR-020). The library (with three.js) is only downloaded when
 * this component mounts, i.e. after the visitor asked for the 3D view; the .glb file is read
 * from NASA servers (ADR-017). No auto-rotation under reduced motion.
 */
type ModelElement = HTMLElement & {
  positionAndNormalFromPoint?: (x: number, y: number) => { position: { x: number; y: number; z: number } } | null
  /** True once the model is loaded on a device that can place it in the room (US-5.16). */
  canActivateAR?: boolean
}


interface ModelViewer3DProps {
  model: Media
  parts?: readonly MachinePart[]
  /** Parts already found in the parts hunt (US-5.16): their marker gets a check. */
  found?: ReadonlySet<string>
  /** Called each time the visitor opens a part (marker or touch on the model). */
  onPartOpen?: (id: string) => void
  /** Shown under the model when this device cannot place it in the room (QR code, note…). */
  arFallback?: ReactNode
  /** Shown over the model, also inside the AR view (progress of the hunt). */
  overlay?: ReactNode
}

/**
 * US-5.16: on a phone or tablet that supports it, "See it in my room" places the NASA model on
 * the floor through the camera — WebXR (Android) or Quick Look (iOS). Scene Viewer is left out:
 * it would hand the model to a Google app (no request to Google, ADR-020). The model keeps the
 * scale NASA published it at; the visitor can pinch to resize it (ar-scale="auto").
 */
const AR_MODES = 'webxr quick-look'

export function ModelViewer3D({ model, parts = [], found, onPartOpen, arFallback, overlay }: ModelViewer3DProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [canAr, setCanAr] = useState(false)
  const [inAr, setInAr] = useState(false)
  const placed = placedParts(parts)
  const active = placed.find((part) => part.id === open)
  const [attempt, setAttempt] = useState(0)
  const viewerRef = useRef<HTMLElement>(null)

  // Three independent things must go right; kept apart so a late success never hides a refusal.
  const [library, setLibrary] = useState<'loading' | 'ready' | 'error'>('loading')
  const [viewerFailed, setViewerFailed] = useState(false)
  /** The verified local copy of the model (ADR-028), for this model and this attempt only. */
  const fileKey = `${model.url}#${model.sha256 ?? ''}#${attempt}`
  const [file, setFile] = useState<{ key: string; src?: string; failure?: 'error' | 'tampered' } | null>(null)
  const current = file?.key === fileKey ? file : null
  const src = current?.src ?? null
  const status: Status =
    current?.failure === 'tampered'
      ? 'tampered'
      : library === 'error' || viewerFailed || current?.failure === 'error'
        ? 'error'
        : library === 'ready' && src
          ? 'ready'
          : 'loading'

  const { url: modelUrl, sha256: modelSha256 } = model
  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null
    verifiedModelUrl({ url: modelUrl, sha256: modelSha256 }, controller.signal).then(
      (url) => {
        objectUrl = url
        if (controller.signal.aborted) URL.revokeObjectURL(url)
        else setFile({ key: fileKey, src: url })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setFile({ key: fileKey, failure: error instanceof ModelIntegrityError ? 'tampered' : 'error' })
      },
    )
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileKey, modelUrl, modelSha256])

  const onPartOpenRef = useRef(onPartOpen)
  useEffect(() => {
    onPartOpenRef.current = onPartOpen
  })
  useEffect(() => {
    if (open) onPartOpenRef.current?.(open)
  }, [open])

  useEffect(() => {
    let alive = true
    configureModelViewer()
    import('@google/model-viewer').then(
      () => alive && setLibrary('ready'),
      () => alive && setLibrary('error'),
    )
    return () => {
      alive = false
    }
  }, [attempt])

  // The custom element reports a model that cannot be fetched or parsed with an "error" event.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const onError = () => setViewerFailed(true)
    const onLoad = () => {
      setLoaded(true)
      setCanAr(Boolean((viewer as ModelElement).canActivateAR))
    }
    // "ar-status": session-started / object-placed while in the room, not-presenting once back.
    const onArStatus = (event: Event) => setInAr((event as CustomEvent<{ status?: string }>).detail?.status !== 'not-presenting')
    viewer.addEventListener('error', onError)
    viewer.addEventListener('load', onLoad)
    viewer.addEventListener('ar-status', onArStatus)
    return () => {
      viewer.removeEventListener('error', onError)
      viewer.removeEventListener('load', onLoad)
      viewer.removeEventListener('ar-status', onArStatus)
    }
  }, [status, src])

  // US-5.13: touching the model itself opens the nearest named part.
  const placedRef = useRef(placed)
  useEffect(() => {
    placedRef.current = placed
  })
  useEffect(() => {
    const viewer = viewerRef.current as ModelElement | null
    if (!viewer || status !== 'ready') return
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest?.('[slot^="hotspot"]')) return
      const hit = viewer.positionAndNormalFromPoint?.(event.clientX, event.clientY)
      const list = placedRef.current
      if (!hit || list.length === 0) return
      const distance = (part: PlacedPart) =>
        Math.hypot(part.modelPosition.x - hit.position.x, part.modelPosition.y - hit.position.y, part.modelPosition.z - hit.position.z)
      const nearest = list.reduce((best, part) => (distance(part) < distance(best) ? part : best))
      setOpen(nearest.id)
    }
    viewer.addEventListener('click', onClick)
    return () => viewer.removeEventListener('click', onClick)
  }, [status, src])

  const retry = () => {
    setLibrary('loading')
    setViewerFailed(false)
    setAttempt((n) => n + 1)
  }

  return (
    <figure className="flex size-full flex-col">
      <div className="relative min-h-72 flex-1 overflow-hidden rounded-2xl border border-stellar-border/70 bg-[radial-gradient(circle_at_50%_40%,rgba(54,214,231,0.12),transparent_65%)]">
        {status === 'ready' && src ? (
          <model-viewer
            ref={viewerRef}
            src={src}
            alt={model.alt}
            camera-controls
            // The wheel must keep scrolling the journey: zooming would capture it (preventDefault).
            disable-zoom
            auto-rotate={(!reduced && !open) || undefined}
            rotation-per-second="18deg"
            touch-action="pan-y"
            interaction-prompt="auto"
            shadow-intensity="1"
            loading="eager"
            ar
            ar-modes={AR_MODES}
            ar-scale="auto"
            ar-placement="floor"
            style={{ width: '100%', height: '100%', minHeight: '18rem', background: 'transparent' }}
          >
            {/* model-viewer shows this slot only on a device that can open the AR view. */}
            <button
              type="button"
              slot="ar-button"
              className="absolute right-3 bottom-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-world px-5 font-semibold text-void shadow-lg"
            >
              <Scan aria-hidden="true" className="size-5" />
              {t('ar.launch')}
            </button>
            {/* Top left, under the depiction badge: never over the top of the machine (mast markers). */}
            {overlay && <div className="pointer-events-none absolute top-12 left-3">{overlay}</div>}
            {/* Inside the AR view only the model-viewer element is drawn: the touched part is told here. */}
            {inAr && active && (
              <div className="reading-panel pointer-events-none absolute inset-x-3 bottom-20 rounded-2xl p-4">
                <p className="font-heading text-lg font-bold text-world">{active.name}</p>
                <p className="mt-1 text-sm leading-relaxed">{active.description}</p>
              </div>
            )}
            {placed.map((part) => (
              <button
                key={part.id}
                type="button"
                slot={`hotspot-${part.id}`}
                data-position={`${part.modelPosition.x}m ${part.modelPosition.y}m ${part.modelPosition.z}m`}
                data-visibility-attribute="visible"
                aria-expanded={open === part.id}
                onClick={() => setOpen((current) => (current === part.id ? null : part.id))}
                className={cn('part-marker model-hotspot', open === part.id && 'is-open')}
              >
                <span className={cn('model-hotspot-label', open === part.id && 'is-open')}>
                  {found?.has(part.id) && <Check aria-hidden="true" className="mr-1 inline size-3.5" />}
                  {part.name}
                  {found?.has(part.id) && <span className="sr-only"> ({t('ar.found')})</span>}
                </span>
              </button>
            ))}
          </model-viewer>
        ) : status === 'loading' || status === 'ready' ? (
          <div className="flex size-full min-h-72 items-center justify-center">
            <LoadState status="loading" onRetry={retry} />
          </div>
        ) : status === 'tampered' ? (
          // Retrying would fetch the same changed file: say why the model is not shown.
          <div role="alert" className="flex size-full min-h-72 flex-col items-center justify-center gap-3 p-4 text-center text-sm text-moon-dust">
            <ShieldAlert aria-hidden="true" className="size-8" />
            <p>{t('journey.modelTampered')}</p>
          </div>
        ) : (
          <div className="flex size-full min-h-72 flex-col items-center justify-center gap-3 p-4 text-center text-sm text-moon-dust">
            <Box aria-hidden="true" className="size-8" />
            <p>{t('journey.modelUnavailable')}</p>
            <button type="button" onClick={retry} className="min-h-11 rounded-md border border-moon-dust/50 px-4 font-medium hover:bg-nebula-surface">
              {t('loading.retry')}
            </button>
          </div>
        )}
        {status === 'ready' && src && !loaded && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex items-center gap-3 font-mono text-[0.72rem] tracking-[0.3em] text-world uppercase">
              <span className="signal-acquire">
                <i />
                <i />
                <i />
                <i />
              </span>
              {t('loading.acquiring')}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute top-2 left-2">
          <DepictionBadge depiction={model.depiction} />
        </div>
        {/* Large screens (US-5.13): the touched part's card opens on the model view. */}
        {active && (
          <div key={`on-model-${active.id}`} aria-hidden="true" className="part-card-on-photo reading-panel pointer-events-none absolute right-3 bottom-3 hidden w-72 rounded-2xl p-4 lg:block">
            <p className="font-heading text-lg font-bold text-world">{active.name}</p>
            <p className="mt-1 text-sm leading-relaxed">{active.description}</p>
          </div>
        )}
      </div>
      {placed.length > 0 && (
        <div aria-live="polite" className="mt-3 min-h-[5.5rem] lg:min-h-0">
          {active ? (
            <div key={active.id} className="part-card reading-panel rounded-2xl p-4 lg:sr-only">
              <p className="font-heading text-lg font-bold text-world">{active.name}</p>
              <p className="mt-1 leading-relaxed">{active.description}</p>
            </div>
          ) : (
            <p className="text-legible text-sm text-starlight/85">{t('parts.hintModel')}</p>
          )}
        </div>
      )}
      {status === 'ready' && loaded && !canAr && arFallback}
      <figcaption className="mt-2 space-y-1 text-xs text-moon-dust">
        {model.description && <p className="text-sm text-starlight/90">{model.description}</p>}
        <p>{t('journey.modelHelp')}</p>
        {canAr && <p>{t('ar.scale')}</p>}
        {model.credit && (
          <p>
            <a href={model.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center gap-1 underline underline-offset-2 hover:text-world">
              {t('ar.credit', { credit: model.credit })}
              <ExternalLink aria-hidden="true" className="size-3" />
              <span className="sr-only">{t('ar.newTab')}</span>
            </a>
          </p>
        )}
      </figcaption>
    </figure>
  )
}
