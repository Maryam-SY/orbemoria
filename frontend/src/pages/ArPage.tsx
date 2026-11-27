import { useState } from 'react'
import { ArrowLeft, Trophy } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ApiError, api } from '@/api/client'
import type { MachineDetail, MissionDetail } from '@/api/types'
import { paths } from '@/app/paths'
import { ArFallback } from '@/components/ar/ArFallback'
import { LoadState } from '@/components/common/LoadState'
import { ModelViewer3D } from '@/components/journey/ModelViewer3D'
import { placedParts } from '@/lib/parts'
import { useApi } from '@/hooks/useApi'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useTranslation } from '@/i18n'
import { modelOf } from '@/lib/journey'
import { eyebrow } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { isDestinationId, type DestinationId } from '@/types/content'
import { NotFoundPage } from './NotFoundPage'

/**
 * The page a QR code opens (US-5.16): one machine's NASA 3D model, ready to be placed in the
 * visitor's room, and a parts hunt — find every named, sourced part by touching the model.
 * Only NASA models are used (ADR-020); a machine without one says so instead.
 */
export function ArPage() {
  const { destinationId, machineId = '' } = useParams()
  if (!isDestinationId(destinationId)) return <NotFoundPage />
  return <ArView key={machineId} destinationId={destinationId} machineId={machineId} />
}

function ArView({ destinationId, machineId }: { destinationId: DestinationId; machineId: string }) {
  const { t } = useTranslation()
  const machine = useApi(`machine:${machineId}`, (lang, signal) => api.machine(machineId, lang, signal))
  const missionId = machine.status === 'success' ? machine.data.missionId : null
  const mission = useApi(`mission:${missionId}`, (lang, signal) => api.mission(missionId ?? '', lang, signal), {
    enabled: missionId !== null,
  })
  useDocumentTitle(machine.status === 'success' ? t('ar.pageTitle', { name: machine.data.name }) : t('ar.launch'), null)

  if (machine.status === 'error' && machine.error instanceof ApiError && machine.error.status === 404) return <NotFoundPage />
  if (machine.status === 'success' && machine.data.destinationId !== destinationId) return <NotFoundPage />
  if (machine.status !== 'success' || (mission.status !== 'success' && mission.status !== 'error')) {
    const failed = machine.status === 'error' ? machine : mission
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col justify-center px-5 py-16">
        <LoadState status={failed.status === 'error' ? 'error' : 'loading'} onRetry={failed.retry} />
      </div>
    )
  }
  return <ArRoom machine={machine.data} mission={mission.status === 'success' ? mission.data : null} />
}

function ArRoom({ machine, mission }: { machine: MachineDetail; mission: MissionDetail | null }) {
  const { t } = useTranslation()
  const destinationId = machine.destinationId as DestinationId
  const model = mission ? modelOf(mission, machine.id) : undefined
  // Same rule as the machine page (US-5.13): parts only for a machine with a real 3D model.
  const parts = machine.parts?.modelMediaId ? placedParts(machine.parts.items) : []
  const [found, setFound] = useState<ReadonlySet<string>>(new Set())
  const done = parts.length > 0 && found.size === parts.length
  const machinePath = paths.machine(destinationId, machine.id)
  const here = typeof window === 'undefined' ? paths.ar(destinationId, machine.id) : `${window.location.origin}${paths.ar(destinationId, machine.id)}`

  const onPartOpen = (id: string) =>
    setFound((current) => {
      if (current.has(id)) return current
      const next = new Set(current)
      next.add(id)
      return next
    })

  const progress =
    parts.length > 0 ? (
      <p className={cn('reading-panel rounded-full px-4 py-1.5 text-sm font-semibold', done && 'text-world')}>
        {t('ar.huntProgress', { found: found.size, count: parts.length })}
      </p>
    ) : undefined

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link to={machinePath} className="inline-flex min-h-11 items-center gap-2 text-sm text-moon-dust hover:text-world">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t('ar.backToMachine', { name: machine.name })}
      </Link>
      <p className={cn(eyebrow, 'mt-6 text-world')}>{parts.length > 0 ? t('ar.huntTitle') : t('ar.eyebrow')}</p>
      <h1 className="mt-2 font-heading text-4xl font-bold sm:text-5xl">{t('ar.pageTitle', { name: machine.name })}</h1>

      {model ? (
        <>
          <p className="mt-4 max-w-2xl leading-relaxed">{t('ar.intro')}</p>
          {parts.length > 0 && <p className="mt-2 max-w-2xl leading-relaxed">{t('ar.huntHelp', { count: parts.length })}</p>}
          <div className="mt-8 h-[70dvh] min-h-[24rem]">
            <ModelViewer3D
              model={model}
              parts={parts}
              found={found}
              onPartOpen={onPartOpen}
              overlay={progress}
              arFallback={<ArFallback url={here} name={machine.name} />}
            />
          </div>
          {parts.length > 0 && (
            <section aria-labelledby="hunt-title" className="mt-10">
              <h2 id="hunt-title" className="font-heading text-2xl font-bold">
                {t('ar.huntTitle')}
              </h2>
              <p aria-live="polite" className="mt-2 text-moon-dust">
                {t('ar.huntProgress', { found: found.size, count: parts.length })}
              </p>
              {done && (
                <div className="reading-panel mt-4 flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center">
                  <Trophy aria-hidden="true" className="size-8 shrink-0 text-world" />
                  <p className="flex-1 font-semibold">{t('ar.huntDone', { name: machine.name })}</p>
                  <Link
                    to={`${machinePath}#quiz`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-world px-5 font-semibold text-void"
                  >
                    {t('ar.toQuiz')}
                  </Link>
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <p className="mt-6 max-w-2xl leading-relaxed">{mission ? t('ar.noModel') : t('journey.modelUnavailable')}</p>
      )}
    </div>
  )
}
