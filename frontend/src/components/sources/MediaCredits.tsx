import { ExternalLink } from 'lucide-react'
import { api } from '@/api/client'
import type { Media } from '@/api/types'
import { LoadState } from '@/components/common/LoadState'
import { DepictionBadge } from '@/components/media/DepictionBadge'
import { useApi } from '@/hooks/useApi'
import { useTranslation } from '@/i18n'

/** Visual assets built into the site itself (backgrounds and globes), not served by the API. */
const SITE_VISUALS = [
  { key: 'about.visualSky', url: 'https://svs.gsfc.nasa.gov/4851' },
  { key: 'about.visualMoon', url: 'https://svs.gsfc.nasa.gov/4720' },
  { key: 'about.visualMars', url: 'https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m' },
  { key: 'about.visualPlanets', url: 'https://nssdc.gsfc.nasa.gov/photo_gallery/' },
  { key: 'about.visualIntro', url: 'https://images.nasa.gov/' },
  { key: 'about.soundIntro', url: 'https://images.nasa.gov/details/JPL-20210222-M2020f-0003b-M2020_Audio_B_002' },
] as const

/**
 * ABOUT-001 §2 (US-5.11): every picture credit in one place. Pictures in the stories carry only
 * their "not a photo" label; who made them, under which terms, and the link to the original
 * page are listed here, grouped by credit holder.
 */
export function MediaCredits() {
  const { t } = useTranslation()
  const media = useApi('media', (lang, signal) => api.media(lang, signal))

  return (
    <div className="mt-4 space-y-6">
      <ul className="space-y-2 text-sm text-moon-dust">
        {SITE_VISUALS.map(({ key, url }) => (
          <li key={key}>
            {t(key)}{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-cosmic-cyan hover:underline">
              {t('about.visualLink')}
              <ExternalLink aria-hidden="true" className="size-3" />
              <span className="sr-only">{t('media.newTab')}</span>
            </a>
          </li>
        ))}
      </ul>

      {media.status !== 'success' ? (
        <LoadState status={media.status} onRetry={media.retry} />
      ) : (
        <CreditGroups media={media.data} />
      )}
    </div>
  )
}

function CreditGroups({ media }: { media: Media[] }) {
  const { t } = useTranslation()
  const groups = new Map<string, Media[]>()
  for (const item of media) {
    const key = item.credit ?? t('media.noCredit')
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div>
      <p className="text-sm text-moon-dust">{t('about.mediaIntro', { count: media.length })}</p>
      <div className="mt-4 space-y-2">
        {sorted.map(([credit, items]) => (
          <details key={credit} className="group rounded-xl border border-white/8 bg-void/30 px-4">
            <summary className="flex min-h-11 min-w-0 cursor-pointer list-none items-center gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span>{credit}</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-xs text-moon-dust">{items.length}</span>
              <span aria-hidden="true" className="ml-auto text-xs text-moon-dust transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <ul className="space-y-2 pb-4 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <a href={item.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-cosmic-cyan hover:underline">
                    {item.title ?? item.alt}
                    <span className="sr-only"> {t('media.newTab')}</span>
                  </a>
                  {item.depiction !== 'photo' && item.depiction !== 'document' && <DepictionBadge depiction={item.depiction} />}
                  <span className="basis-full text-xs text-moon-dust/80">{item.license}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  )
}
