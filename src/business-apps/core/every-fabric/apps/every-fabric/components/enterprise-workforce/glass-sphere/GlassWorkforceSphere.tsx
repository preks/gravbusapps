// Workforce overview of the reusable 3D glass card sphere.
//
// Builds one card per active workforce agent, layers a subtle value/status
// jitter ticker on top, and hands the finished cards to the shared
// GlassCardScene. Running agents pulse; a couple of status flavours drift every
// few seconds for visual life.

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { GlassCardScene } from '../../glass-card-sphere/GlassCardScene'
import translations from '../../../_i18n'
import { detectWebGL, usePrefersReducedMotion } from '../../glass-card-sphere/glassCardEnv'
import type { GlassCardModel } from '../../glass-card-sphere/glassCardModel'
import type { WorkforceAgentSummary } from '../useWorkforceData'
import { buildValueKpis } from './backgroundKpiModel'
import {
  applyCardJitter,
  buildWorkforceCardModel,
  type WorkforceCardJitter,
  type WorkforceCardStatus
} from './workforceCardModel'

// Keep the cluster legible and the frame budget bounded even for large fleets.
const MAX_CARDS = 9
const JITTER_INTERVAL_MS = 3_500
const FLAVOUR_STATUSES: WorkforceCardStatus[] = ['renewing', 'trial']

interface GlassWorkforceSphereProps {
  summaries: WorkforceAgentSummary[]
  isAgentWorking: (agentId: string) => boolean
}

// Decorative-only PRNG (mulberry32). The jitter ticker drives nothing but
// visuals, so it deliberately avoids Math.random() and carries no security
// expectation; a per-tick time seed keeps the drift lively.
function createJitterRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Subtle, non-aggressive drift: re-roll a couple of cards every few seconds.
function useCardJitter(ids: string[], enabled: boolean): Record<string, WorkforceCardJitter> {
  const [jitter, setJitter] = useState<Record<string, WorkforceCardJitter>>({})
  const idsKey = ids.join('|')

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setJitter({})
      return
    }
    const tick = () => {
      setJitter(prev => {
        const next = { ...prev }
        const rolls = Math.min(2, ids.length)
        const rand = createJitterRandom(Date.now())
        for (let i = 0; i < rolls; i += 1) {
          const id = ids[Math.floor(rand() * ids.length)]
          const flavour = rand()
          next[id] = {
            priceDelta: Math.round((rand() - 0.5) * 4),
            statusOverride: flavour < 0.55 ? FLAVOUR_STATUSES[Math.floor(rand() * FLAVOUR_STATUSES.length)] : null
          }
        }
        return next
      })
    }
    const timer = window.setInterval(tick, JITTER_INTERVAL_MS)
    return () => window.clearInterval(timer)
    // idsKey captures membership changes without re-running on array identity.
  }, [idsKey, enabled])

  return jitter
}

export const GlassWorkforceSphere: React.FC<GlassWorkforceSphereProps> = ({ summaries, isAgentWorking }) => {
  const { t } = useTranslation(translations)
  const reducedMotion = usePrefersReducedMotion()
  const supportsWebGL = useMemo(() => detectWebGL(), [])

  const visibleSummaries = useMemo(() => summaries.slice(0, MAX_CARDS), [summaries])

  const baseModels = useMemo(
    () => visibleSummaries.map(summary => buildWorkforceCardModel(summary, isAgentWorking(summary.agent.agent_id))),
    [visibleSummaries, isAgentWorking]
  )

  const jitterEnabled = supportsWebGL && !reducedMotion
  const jitterableIds = useMemo(() => baseModels.filter(m => m.status === 'active').map(m => m.id), [baseModels])
  const jitter = useCardJitter(jitterableIds, jitterEnabled)

  const cards = useMemo<GlassCardModel[]>(
    () =>
      baseModels.map(model => {
        const jittered = applyCardJitter(model, jitter[model.id])
        return {
          id: jittered.id,
          title: jittered.title,
          subtitle: jittered.subtitle,
          initials: jittered.initials,
          value: String(jittered.basePrice),
          valueUnit: t('glass-sphere-credits-unit'),
          status: jittered.status
        }
      }),
    [baseModels, jitter, t]
  )

  const kpis = useMemo(() => buildValueKpis(summaries), [summaries])

  const headingValue =
    summaries.length === 1
      ? t('glass-sphere-value-one', { count: summaries.length })
      : t('glass-sphere-value-other', { count: summaries.length })

  return (
    <GlassCardScene
      cards={cards}
      kpis={kpis}
      heading={{
        label: t('glass-sphere-heading'),
        value: headingValue
      }}
      testId="glass-workforce-sphere"
    />
  )
}

export default GlassWorkforceSphere
