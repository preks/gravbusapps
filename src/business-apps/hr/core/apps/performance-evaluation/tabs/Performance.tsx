import React, { useMemo, useState } from 'react'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useTranslation,
  Spinner
} from '@newwork/nw-design-system'
import { CheckCircle, Lightning, PencilSimple, Play } from '@phosphor-icons/react'
import type { CycleStatus, PerformanceCycle, RatingScale, ValueItemStored } from '../types'
import CycleEditorModal, {
  CycleEditorValues,
  EvaluationStage as EditorStage,
  ParticipantType as EditorParticipantType,
  FrequencyType as EditorFrequencyType
} from '../CycleEditorModal'
import translations from '../_i18n'

export interface PerformanceProps {
  cycles: PerformanceCycle[]
  cyclesLoading: boolean
  cyclesError: string | null
  ratingScales: RatingScale[]
  valuesStore: ValueItemStored[]
  onCompleteCycle: (cycleId: string) => Promise<void>
  onStartCycle: (cycleId: string) => void
  onManualRun: () => void
  onSaveFromModal: (values: CycleEditorValues) => Promise<void>
}

function computeDisplayStatus(c: PerformanceCycle): CycleStatus {
  if (c.status === 'Completed') return 'Completed'
  if (c.status === 'In Progress') return 'In Progress'
  if (c.startDate && c.endDate) {
    const today = new Date()
    if (today >= new Date(c.startDate) && today <= new Date(c.endDate)) return 'Active'
  }
  return 'Inactive'
}

export const Performance: React.FC<PerformanceProps> = ({
  cycles,
  cyclesLoading,
  cyclesError,
  ratingScales,
  valuesStore,
  onCompleteCycle,
  onStartCycle,
  onManualRun,
  onSaveFromModal
}) => {
  const { t } = useTranslation(translations)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<PerformanceCycle | null>(null)
  const [dateOverlapError, setDateOverlapError] = useState<string | null>(null)

  const sortedCycles = useMemo(
    () =>
      [...cycles].sort(
        (a, b) =>
          new Date(b.evaluationPeriodStartDate ?? '').getTime() - new Date(a.evaluationPeriodStartDate ?? '').getTime()
      ),
    [cycles]
  )

  const canStartCycle = (cycle: PerformanceCycle): boolean => {
    return computeDisplayStatus(cycle) === 'Active'
  }

  const handleEdit = (cycle: PerformanceCycle) => {
    setDateOverlapError(null)
    setEditing(cycle)
    setIsModalOpen(true)
  }

  const handleSaveFromModal = async (values: CycleEditorValues) => {
    try {
      setDateOverlapError(null)
      await onSaveFromModal(values)
      setEditing(null)
      setIsModalOpen(false)
    } catch (err) {
      const isOverlap = err instanceof Error && (err as Error & { code?: string }).code === 'DATES_OVERLAP'
      if (isOverlap) {
        setDateOverlapError(err instanceof Error ? err.message : t('cycles-error-dates-overlap'))
      }
      throw err
    }
  }

  return (
    <div className="gba:space-y-6">
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <Lightning size={20} />
                {t('tab-performance')}
              </CardTitle>
              <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('review-cycle-description')}</p>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:min-h-9">
              {cyclesLoading && <Spinner className="gba:h-5 gba:w-5" data-testid="performance-tab-loading" />}
              <Button size="sm" onClick={onManualRun} data-testid="performance-manual-run-button">
                <Play weight="fill" className="gba:mr-1" size={16} />
                {t('button-manual-run')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cyclesError && (
            <div
              className="gba:mb-4 gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm"
              data-testid="performance-tab-error"
            >
              {cyclesError}
            </div>
          )}
          <div className="gba:border gba:rounded-lg gba:overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[24px]"></TableHead>
                  <TableHead>{t('table-name')}</TableHead>
                  <TableHead>{t('table-evaluation-period')}</TableHead>
                  <TableHead>{t('table-dates')}</TableHead>
                  <TableHead>{t('table-scale')}</TableHead>
                  <TableHead>{t('table-participants')}</TableHead>
                  <TableHead>{t('table-status')}</TableHead>
                  <TableHead className="gba:text-right">{t('table-actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cyclesLoading && sortedCycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="gba:py-8 gba:text-center">
                      <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                    </TableCell>
                  </TableRow>
                ) : sortedCycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="gba:text-center gba:text-muted-foreground">
                      {t('empty-no-cycles')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCycles.map((c, i) => {
                    const evalPeriod =
                      c.evaluationPeriodStartDate && c.evaluationPeriodEndDate
                        ? `${c.evaluationPeriodStartDate} → ${c.evaluationPeriodEndDate}`
                        : '-'
                    const executionDates = `${c.startDate} → ${c.endDate}`
                    const scaleName = c.ratingScaleId
                      ? ratingScales.find(s => s.id === c.ratingScaleId)?.name || '-'
                      : '-'
                    const participants = c.participants.join(', ')
                    const displayStatus = computeDisplayStatus(c)
                    return (
                      <TableRow key={c.id} className="gba:h-[52px]">
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="gba:font-medium">{c.name}</TableCell>
                        <TableCell>{evalPeriod}</TableCell>
                        <TableCell>{executionDates}</TableCell>
                        <TableCell>{scaleName}</TableCell>
                        <TableCell>{participants}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              displayStatus === 'Active'
                                ? 'success'
                                : displayStatus === 'In Progress'
                                  ? 'info'
                                  : displayStatus === 'Completed'
                                    ? 'default'
                                    : 'secondary'
                            }
                          >
                            {displayStatus === 'Completed'
                              ? t('status-completed')
                              : displayStatus === 'In Progress'
                                ? t('status-in-progress')
                                : displayStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="gba:text-right">
                          <div className="gba:flex gba:justify-end gba:gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} aria-label="Edit">
                              <PencilSimple />
                            </Button>
                            {displayStatus === 'In Progress' && (
                              <Button
                                variant="default"
                                size="sm"
                                className="gba:bg-success gba:hover:bg-success/90"
                                onClick={() => onCompleteCycle(c.id)}
                                data-testid={`perf-complete-${c.id}`}
                              >
                                <CheckCircle weight="fill" className="gba:mr-1" size={16} />
                                {t('button-complete')}
                              </Button>
                            )}
                            {displayStatus !== 'In Progress' && displayStatus !== 'Completed' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => onStartCycle(c.id)}
                                disabled={!canStartCycle(c)}
                                data-testid={`perf-start-${c.id}`}
                              >
                                <Play weight="fill" className="gba:mr-1" size={16} />
                                {t('button-start')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <CycleEditorModal
        open={isModalOpen}
        onOpenChange={open => {
          if (!open) setDateOverlapError(null)
          setIsModalOpen(open)
        }}
        onSave={handleSaveFromModal}
        mode="performance"
        dateOverlapError={dateOverlapError}
        onClearDateError={() => setDateOverlapError(null)}
        availableValues={valuesStore}
        availableRatingScales={ratingScales}
        initialValues={
          editing
            ? {
                id: editing.id,
                version: editing.version,
                name: editing.name,
                startDate: editing.startDate,
                endDate: editing.endDate,
                evaluationPeriodStartDate: editing.evaluationPeriodStartDate,
                evaluationPeriodEndDate: editing.evaluationPeriodEndDate,
                frequency:
                  (String(editing.frequency).toUpperCase().includes('QUARTERLY')
                    ? 'Quarterly'
                    : String(editing.frequency).toUpperCase().includes('ANNUAL')
                      ? 'Annual'
                      : String(editing.frequency).toUpperCase().includes('MONTHLY') ||
                          String(editing.frequency).toUpperCase().includes('CUSTOM')
                        ? 'Monthly'
                        : (editing.frequency as EditorFrequencyType)) ?? 'Annual',
                participants: editing.participants as EditorParticipantType[],
                stages: editing.stages as unknown as EditorStage[],
                ratingScaleId: editing.ratingScaleId,
                valueIds: editing.valueIds ?? [],
                _apiParticipants: editing._apiParticipants,
                _apiCompanyValues: editing._apiCompanyValues
              }
            : undefined
        }
      />
    </div>
  )
}

export default Performance
