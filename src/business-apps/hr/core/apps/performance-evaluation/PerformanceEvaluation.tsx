import React, { useState, useEffect, useMemo } from 'react'
import { PageLayout, useTranslation, toast } from '@newwork/nw-design-system'
import { ListChecks } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { usePerformanceCycles } from './hooks/usePerformanceCycles'
import { useRatingScales } from './hooks/useRatingScales'
import { useInsertRatingScale } from './hooks/useInsertRatingScale'
import { useSavePerformanceCycle } from './hooks/useSavePerformanceCycle'
import { deleteRatingScale } from './services/ratingScaleApi'
import type { PerformanceCycle, RatingScale, ValueItemStored } from './types'
import translations from './_i18n'
import type { CycleEditorValues, EvaluationStage as EditorStage } from './CycleEditorModal'
import type { RatingScaleValues } from './RatingScaleEditorModal'
import type { ValueEditorValues } from './ValuesEditorModal'
import { PerformanceCycles } from './tabs/PerformanceCycles'
import { RatingScales } from './tabs/RatingScales'
import { CompanyValues } from './tabs/CompanyValues'

const STORAGE_KEY = 'hr.performance.cycles.v1'
const RATING_SCALES_STORAGE_KEY = 'hr.performance.ratingScales.v1'
const VALUES_STORAGE_KEY = 'hr.performance.values.v1'

function loadCycles(): PerformanceCycle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PerformanceCycle[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCycles(cycles: PerformanceCycle[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cycles))
  } catch {
    // ignore persistence errors
  }
}

function loadRatingScales(): RatingScale[] {
  try {
    const raw = localStorage.getItem(RATING_SCALES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RatingScale[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRatingScales(scales: RatingScale[]) {
  try {
    localStorage.setItem(RATING_SCALES_STORAGE_KEY, JSON.stringify(scales))
  } catch {
    // ignore
  }
}

function loadValues(): ValueItemStored[] {
  try {
    const raw = localStorage.getItem(VALUES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ValueItemStored[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function computeStatus(cycle: Omit<PerformanceCycle, 'status'> & { deactivated?: boolean }) {
  if (cycle.deactivated) return 'Inactive' as const
  const today = new Date()
  const start = new Date(cycle.startDate)
  const end = new Date(cycle.endDate)
  if (today < start) return 'Upcoming' as const
  if (today >= start && today <= end) return 'Active' as const
  return 'Inactive' as const
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

enum PerformanceTabEnum {
  Cycles = 'cycles',
  RatingScales = 'rating-scales',
  Values = 'values'
}

export const PerformanceEvaluation: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const devFeatureFlag = useFeature(Feature.Dev.Enabled.Key)
  const { t } = useTranslation(translations)
  const {
    cycles: apiCycles,
    loading: cyclesLoading,
    error: cyclesError,
    refetch: refetchCycles
  } = usePerformanceCycles(accessToken)
  const {
    ratingScales: apiRatingScales,
    loading: ratingScalesLoading,
    error: ratingScalesError,
    refetch: refetchRatingScales
  } = useRatingScales(accessToken)
  const { saveRatingScale } = useInsertRatingScale(accessToken)
  const { savePerformanceCycle, updateCycleActive, deletePerformanceCycle } = useSavePerformanceCycle(accessToken)

  const [cycles, setCycles] = useState<PerformanceCycle[]>([])
  const [ratingScales, setRatingScales] = useState<RatingScale[]>([])
  const [valuesStore, setValuesStore] = useState<ValueItemStored[]>([])
  const [activeTab, setActiveTab] = useState<PerformanceTabEnum>(PerformanceTabEnum.Cycles)
  const handleTabChange = (value: string) => setActiveTab(value as PerformanceTabEnum)

  useEffect(() => {
    setValuesStore(loadValues())
  }, [])

  const apiScaleIds = useMemo(() => new Set(apiRatingScales.map(s => s.id)), [apiRatingScales])
  useEffect(() => {
    if (!ratingScalesLoading) {
      const localOnly = loadRatingScales().filter(s => !apiScaleIds.has(s.id))
      setRatingScales([...apiRatingScales, ...localOnly])
    }
  }, [ratingScalesLoading, apiRatingScales, apiScaleIds])

  const apiCycleIds = useMemo(() => new Set(apiCycles.map(c => c.id)), [apiCycles])
  useEffect(() => {
    if (!cyclesLoading) {
      const localOnly = loadCycles().filter(c => !apiCycleIds.has(c.id))
      setCycles([...apiCycles, ...localOnly])
    }
  }, [cyclesLoading, apiCycles, apiCycleIds])

  useEffect(() => {
    saveCycles(cycles)
  }, [cycles])
  useEffect(() => {
    saveRatingScales(ratingScales)
  }, [ratingScales])
  useEffect(() => {
    try {
      localStorage.setItem(VALUES_STORAGE_KEY, JSON.stringify(valuesStore))
    } catch {
      // ignore
    }
  }, [valuesStore])

  const pageTitle = t('title')
  const pageSubtitle = t('subtitle')

  const handleSaveFromModal = async (values: CycleEditorValues) => {
    if (accessToken) {
      try {
        await savePerformanceCycle(values)
        await refetchCycles()
        toast.success(
          t('cycle-saved-to-database', { name: values.name }) ?? `Performance cycle "${values.name}" saved.`
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save performance cycle'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
        return
      }
    } else {
      const base: Omit<PerformanceCycle, 'status'> = {
        id: values.id || makeId('cycle'),
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        frequency: values.frequency as PerformanceCycle['frequency'],
        participants: values.participants as PerformanceCycle['participants'],
        stages: (values.stages as EditorStage[]).map(s => ({
          id: s.id,
          type: s.type as PerformanceCycle['participants'][number],
          label: s.label
        })),
        deactivated: false,
        ratingScaleId: values.ratingScaleId,
        valueIds: values.valueIds ?? []
      }
      const status = computeStatus(base)
      const next: PerformanceCycle = { ...base, status }
      setCycles(prev => {
        const exists = prev.some(c => c.id === next.id)
        return exists ? prev.map(c => (c.id === next.id ? next : c)) : [next, ...prev]
      })
    }
  }

  const handleActivate = async (cycleId: string) => {
    const cycle = cycles.find(c => c.id === cycleId)
    if (!cycle) return
    if (accessToken) {
      try {
        await updateCycleActive(cycle, true)
        await refetchCycles()
        toast.success(t('cycle-activated-to-database', { name: cycle.name }) ?? `"${cycle.name}" activated.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to activate cycle'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
        return
      }
    } else {
      setCycles(prev =>
        prev.map(c =>
          c.id === cycleId ? { ...c, deactivated: false, status: computeStatus({ ...c, deactivated: false }) } : c
        )
      )
    }
  }

  const handleDeactivate = async (cycleId: string) => {
    const cycle = cycles.find(c => c.id === cycleId)
    if (!cycle) return
    if (accessToken) {
      try {
        await updateCycleActive(cycle, false)
        await refetchCycles()
        toast.success(t('cycle-deactivated-to-database', { name: cycle.name }) ?? `"${cycle.name}" deactivated.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deactivate cycle'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
        return
      }
    } else {
      setCycles(prev => prev.map(c => (c.id === cycleId ? { ...c, deactivated: true, status: 'Inactive' } : c)))
    }
  }

  const handleDeleteCycle = async (cycle: PerformanceCycle) => {
    if (accessToken) {
      try {
        await deletePerformanceCycle(cycle)
        setCycles(prev => prev.filter(c => c.id !== cycle.id))
        await refetchCycles()
        toast.success(t('cycle-deleted-to-database', { name: cycle.name }) ?? `"${cycle.name}" deleted.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete cycle'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
        return
      }
    } else {
      setCycles(prev => prev.filter(c => c.id !== cycle.id))
    }
  }

  const handleSaveFromScaleModal = async (values: RatingScaleValues) => {
    const isNewScale = !values.id || values.id.startsWith('scale_')
    if (accessToken && isNewScale) {
      try {
        await saveRatingScale({
          id: values.id,
          name: values.name,
          values: values.values,
          numValues: values.numValues,
          displayMode: values.displayMode
        })
        await refetchRatingScales()
        toast.success(t('scale-saved-to-database', { name: values.name }) ?? `Rating scale "${values.name}" saved.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save rating scale'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
        return
      }
    } else {
      const base: RatingScale = {
        id: values.id || makeId('scale'),
        name: values.name,
        values: values.values
      }
      setRatingScales(prev => {
        const exists = prev.some(s => s.id === base.id)
        return exists ? prev.map(s => (s.id === base.id ? base : s)) : [base, ...prev]
      })
    }
  }

  const handleDeleteScale = async (scale: RatingScale) => {
    if (accessToken) {
      try {
        await deleteRatingScale(accessToken, {
          ratingScale: { id: scale.id, version: scale.version ?? 0 }
        })
        setRatingScales(prev => prev.filter(s => s.id !== scale.id))
        await refetchRatingScales()
        toast.success(t('scale-deleted-to-database', { name: scale.name }) ?? `Rating scale "${scale.name}" deleted.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete rating scale'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
        return
      }
    } else {
      setRatingScales(prev => prev.filter(s => s.id !== scale.id))
    }
  }

  const handleSaveFromValuesModal = (values: ValueEditorValues) => {
    const base: ValueItemStored = {
      id: values.id || makeId('value'),
      title: values.title,
      description: values.description,
      active: values.active
    }
    setValuesStore(prev => {
      const exists = prev.some(v => v.id === base.id)
      return exists ? prev.map(v => (v.id === base.id ? base : v)) : [base, ...prev]
    })
  }

  const handleDeleteValue = (id: string) => {
    setValuesStore(prev => prev.filter(v => v.id !== id))
  }

  const handleActivateValue = (id: string) => {
    setValuesStore(prev => prev.map(v => (v.id === id ? { ...v, active: true } : v)))
  }

  const handleDeactivateValue = (id: string) => {
    setValuesStore(prev => prev.map(v => (v.id === id ? { ...v, active: false } : v)))
  }

  if (!devFeatureFlag) {
    return null
  }

  return (
    <div data-testid="performance-evaluation-container">
      <PageLayout
        headerIcon={ListChecks}
        headerTitle={pageTitle}
        headerDescription={pageSubtitle}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: [
            { value: PerformanceTabEnum.Cycles, label: t('tab-cycles') },
            { value: PerformanceTabEnum.RatingScales, label: t('tab-rating-scales') },
            { value: PerformanceTabEnum.Values, label: t('tab-values') }
          ]
        }}
        variant={MODULE_COLORS.HR}
        className="gba:min-h-screen gba:space-y-6"
      >
        {activeTab === PerformanceTabEnum.Cycles && (
          <PerformanceCycles
            cycles={cycles}
            cyclesLoading={cyclesLoading}
            cyclesError={cyclesError}
            ratingScales={ratingScales}
            valuesStore={valuesStore}
            refetchCycles={refetchCycles}
            accessToken={accessToken}
            onSaveFromModal={handleSaveFromModal}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onDeleteCycle={handleDeleteCycle}
          />
        )}
        {activeTab === PerformanceTabEnum.RatingScales && (
          <RatingScales
            ratingScales={ratingScales}
            ratingScalesLoading={ratingScalesLoading}
            ratingScalesError={ratingScalesError}
            refetchRatingScales={refetchRatingScales}
            onSaveFromScaleModal={handleSaveFromScaleModal}
            onDeleteScale={handleDeleteScale}
          />
        )}
        {activeTab === PerformanceTabEnum.Values && (
          <CompanyValues
            valuesStore={valuesStore}
            cycles={cycles}
            onSaveFromValuesModal={handleSaveFromValuesModal}
            onDeleteValue={handleDeleteValue}
            onActivateValue={handleActivateValue}
            onDeactivateValue={handleDeactivateValue}
          />
        )}
      </PageLayout>
    </div>
  )
}

export default PerformanceEvaluation
