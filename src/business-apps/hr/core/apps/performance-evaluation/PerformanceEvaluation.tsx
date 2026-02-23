import React, { useState, useEffect } from 'react'
import { PageLayout, useTranslation, toast, Spinner, Toaster } from '@newwork/nw-design-system'
import { ListChecks } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import { startProcess, getPlatformContext } from '@/common/utils/start-process'
import { usePerformanceCycles } from './hooks/usePerformanceCycles'
import { useRatingScales } from './hooks/useRatingScales'
import { useCompanyValues } from './hooks/useCompanyValues'
import { useInsertRatingScale } from './hooks/useInsertRatingScale'
import { useSavePerformanceCycle } from './hooks/useSavePerformanceCycle'
import { useSaveCompanyValue } from './hooks/useSaveCompanyValue'
import { useManagerUserId } from './hooks/useManagerUserId'
import { deleteRatingScale } from './services/ratingScaleApi'
import type { PerformanceCycle, RatingScale, ValueItemStored } from './types'
import translations from './_i18n'
import type { CycleEditorValues, EvaluationStage as EditorStage } from './CycleEditorModal'
import type { RatingScaleValues } from './RatingScaleEditorModal'
import type { ValueEditorValues } from './ValuesEditorModal'
import { PerformanceCycles } from './tabs/PerformanceCycles'
import { RatingScales } from './tabs/RatingScales'
import { CompanyValues } from './tabs/CompanyValues'
import { StartCycleConfirmDialog } from './components/StartCycleConfirmDialog'

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

/** Returns true if [startA, endA] and [startB, endB] overlap (inclusive). Dates in YYYY-MM-DD or parseable by Date. */
function doDateRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = new Date(startA).getTime()
  const aEnd = new Date(endA).getTime()
  const bStart = new Date(startB).getTime()
  const bEnd = new Date(endB).getTime()
  return aStart <= bEnd && aEnd >= bStart
}

enum PerformanceTabEnum {
  Cycles = 'cycles',
  RatingScales = 'rating-scales',
  Values = 'values'
}

export const PerformanceEvaluation: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
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
  const {
    values: apiValues,
    loading: valuesLoading,
    error: valuesError,
    refetch: refetchValues
  } = useCompanyValues(accessToken)
  const { saveRatingScale } = useInsertRatingScale(accessToken)
  const { savePerformanceCycle, updateCycleActive, deletePerformanceCycle } = useSavePerformanceCycle(accessToken)
  const { saveCompanyValue, deleteCompanyValue, updateCompanyValueRecordState } = useSaveCompanyValue(accessToken)

  const hrBackoffice = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-hr-backoffice',
    accessToken
  )

  // Fetch manager's userId and current employee's userId for process payload
  const platformContext = getPlatformContext()
  const { managerUserId } = useManagerUserId({
    accessToken,
    managerId: platformContext.managerId
  })

  // Fetch current employee's userId (not to be confused with employeeId)
  const { managerUserId: currentEmployeeUserId } = useManagerUserId({
    accessToken,
    managerId: platformContext.employeeId // Using the hook to get userId for current employee
  })

  const [cycles, setCycles] = useState<PerformanceCycle[]>([])
  const [ratingScales, setRatingScales] = useState<RatingScale[]>([])
  const [valuesStore, setValuesStore] = useState<ValueItemStored[]>([])
  const [activeTab, setActiveTab] = useState<PerformanceTabEnum>(PerformanceTabEnum.RatingScales)
  const [startingCycleId, setStartingCycleId] = useState<string | null>(null)
  const handleTabChange = (value: string) => setActiveTab(value as PerformanceTabEnum)

  // Values: use only API data (no localStorage merge) to avoid duplicates
  useEffect(() => {
    if (!valuesLoading) {
      setValuesStore(apiValues)
    }
  }, [valuesLoading, apiValues])

  // Rating Scales: use only API data (no localStorage merge) to always show live data
  useEffect(() => {
    if (!ratingScalesLoading) {
      setRatingScales(apiRatingScales)
    }
  }, [ratingScalesLoading, apiRatingScales])

  // Cycles: use only API data (no localStorage merge) to always show live data
  useEffect(() => {
    if (!cyclesLoading) {
      setCycles(apiCycles)
    }
  }, [cyclesLoading, apiCycles])

  // Remove localStorage persistence - use API as single source of truth for all data

  const pageTitle = t('title')
  const pageSubtitle = t('subtitle')

  const handleSaveFromModal = async (values: CycleEditorValues) => {
    const otherCycles = cycles.filter(c => c.id !== values.id)
    const overlaps = otherCycles.some(c =>
      doDateRangesOverlap(values.startDate, values.endDate, c.startDate, c.endDate)
    )
    if (overlaps) {
      const err = new Error(t('cycles-error-dates-overlap')) as Error & { code?: string }
      err.code = 'DATES_OVERLAP'
      throw err
    }

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

  const handleStartCycle = (cycleId: string) => {
    const cycle = cycles.find(c => c.id === cycleId)
    if (!cycle) return

    // Validation: Only active cycles can be started
    if (cycle.status !== 'Active') {
      toast.warning(t('cycle-not-active', { name: cycle.name }) ?? `Only active cycles can be started`)
      return
    }

    // Show confirmation dialog
    setStartingCycleId(cycleId)
  }

  const handleConfirmStartCycle = (options: { runFor: 'self' | 'team'; teamIds: string[] }) => {
    if (!startingCycleId) return

    const cycle = cycles.find(c => c.id === startingCycleId)
    if (!cycle) return

    const { runFor, teamIds: selectedTeamIds } = options

    if (runFor === 'team' && selectedTeamIds.length === 0) {
      toast.error('Please select at least one team to start the evaluation', {
        position: 'bottom-right',
        className: 'gba:text-base'
      })
      return
    }

    try {
      // Build the payload according to the API specification
      const payload = {
        employeePerformanceEvaluation: {
          employee: platformContext.employeeId,
          performanceCycle: cycle.id
        },
        managerUserId: managerUserId || '',
        employeeUserId: userInfo?.id || currentEmployeeUserId || ''
      }
      // Start the Kogito process
      startProcess({
        domain: 'employee',
        processName: 'performanceEvaluation',
        payload
      })

      const message =
        runFor === 'self'
          ? (t('cycle-started', { name: cycle.name }) ?? `Starting evaluation for: ${cycle.name} (yourself)`)
          : (t('cycle-started', { name: cycle.name }) ??
            `Starting evaluation for: ${cycle.name} (${selectedTeamIds.length} team${selectedTeamIds.length > 1 ? 's' : ''})`)
      toast.success(message)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start performance evaluation'
      toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
    } finally {
      setStartingCycleId(null)
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

  const handleSaveFromValuesModal = async (values: ValueEditorValues) => {
    if (accessToken) {
      try {
        await saveCompanyValue(values)
        await refetchValues()
        toast.success(t('value-saved-to-database', { title: values.title }) ?? `Company value "${values.title}" saved.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save company value'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
        throw err
      }
    }
  }

  const handleDeleteValue = async (id: string) => {
    const value = valuesStore.find(v => v.id === id)
    if (accessToken && value) {
      try {
        await deleteCompanyValue(value)
        await refetchValues()
        toast.success(t('value-deleted-to-database', { title: value.title }) ?? `"${value.title}" deleted.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete company value'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
      }
    }
  }

  const handleActivateValue = async (id: string) => {
    const value = valuesStore.find(v => v.id === id)
    if (accessToken && value) {
      try {
        await updateCompanyValueRecordState(value, 'active')
        await refetchValues()
        toast.success(t('value-activated-to-database', { title: value.title }) ?? `"${value.title}" activated.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to activate value'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
        return
      }
      return
    }
  }

  const handleDeactivateValue = async (id: string) => {
    const value = valuesStore.find(v => v.id === id)
    if (accessToken && value) {
      try {
        await updateCompanyValueRecordState(value, 'inactive')
        await refetchValues()
        toast.success(t('value-deactivated-to-database', { title: value.title }) ?? `"${value.title}" deactivated.`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deactivate value'
        toast.error(message, { position: 'bottom-right', className: 'gba:text-base' })
      }
    }
  }

  if (!devFeatureFlag) {
    return null
  }

  if (hrBackoffice.loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-screen">
        <Spinner size="lg" data-testid="performance-evaluation-loading" />
      </div>
    )
  }

  // if (!hrBackoffice.hasPermission) {
  //   return null
  // }

  return (
    <div data-testid="performance-evaluation-container">
      <Toaster position="bottom-right" />
      <PageLayout
        headerIcon={ListChecks}
        headerTitle={pageTitle}
        headerDescription={pageSubtitle}
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: [
            { value: PerformanceTabEnum.RatingScales, label: t('tab-rating-scales') },
            { value: PerformanceTabEnum.Values, label: t('tab-values') },
            { value: PerformanceTabEnum.Cycles, label: t('tab-cycles') }
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
            onSaveFromModal={handleSaveFromModal}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onDeleteCycle={handleDeleteCycle}
            onStartCycle={handleStartCycle}
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
            valuesLoading={valuesLoading}
            valuesError={valuesError}
            cycles={cycles}
            onSaveFromValuesModal={handleSaveFromValuesModal}
            onDeleteValue={handleDeleteValue}
            onActivateValue={handleActivateValue}
            onDeactivateValue={handleDeactivateValue}
          />
        )}
      </PageLayout>

      <StartCycleConfirmDialog
        open={startingCycleId !== null}
        cycle={cycles.find(c => c.id === startingCycleId) || null}
        accessToken={accessToken}
        onConfirm={handleConfirmStartCycle}
        onCancel={() => setStartingCycleId(null)}
      />
    </div>
  )
}

export default PerformanceEvaluation
