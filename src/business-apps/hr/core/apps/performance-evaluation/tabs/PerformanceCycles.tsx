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
import { CalendarBlank, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import type { PerformanceCycle, RatingScale, ValueItemStored } from '../types'
import CycleEditorModal, {
  CycleEditorValues,
  EvaluationStage as EditorStage,
  ParticipantType as EditorParticipantType,
  FrequencyType as EditorFrequencyType
} from '../CycleEditorModal'
import translations from '../_i18n'

export interface PerformanceCyclesProps {
  cycles: PerformanceCycle[]
  cyclesLoading: boolean
  cyclesError: string | null
  ratingScales: RatingScale[]
  valuesStore: ValueItemStored[]
  onSaveFromModal: (values: CycleEditorValues) => Promise<void>
  onDeleteCycle: (cycle: PerformanceCycle) => Promise<void>
}

export const PerformanceCycles: React.FC<PerformanceCyclesProps> = ({
  cycles,
  cyclesLoading,
  cyclesError,
  ratingScales,
  valuesStore,
  onSaveFromModal,
  onDeleteCycle
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

  const isEvalPeriodActive = (c: PerformanceCycle): boolean => {
    if (c.evaluationPeriodStartDate && c.evaluationPeriodEndDate) {
      const today = new Date()
      return today >= new Date(c.evaluationPeriodStartDate) && today <= new Date(c.evaluationPeriodEndDate)
    }
    return false
  }

  const handleEdit = (cycle: PerformanceCycle) => {
    setDateOverlapError(null)
    setEditing(cycle)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setDateOverlapError(null)
    setEditing(null)
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
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <CalendarBlank size={20} />
              {t('tab-cycles')}
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2">
              {cyclesLoading && <Spinner className="gba:h-5 gba:w-5" data-testid="performance-cycles-loading" />}
              <Button variant="default" onClick={handleAdd} data-testid="performance-cycles-add-button">
                <Plus className="gba:mr-2" size={16} />
                {t('button-add')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cyclesError && (
            <div
              className="gba:mb-4 gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm"
              data-testid="performance-cycles-error"
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
                  <TableHead>{t('table-values')}</TableHead>
                  <TableHead>{t('table-status')}</TableHead>
                  <TableHead className="gba:text-right">{t('table-actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cyclesLoading && sortedCycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="gba:py-8 gba:text-center">
                      <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                    </TableCell>
                  </TableRow>
                ) : sortedCycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="gba:text-center gba:text-muted-foreground">
                      {t('empty-no-cycles')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCycles.map((c, i) => {
                    const evalPeriod =
                      c.evaluationPeriodStartDate && c.evaluationPeriodEndDate
                        ? `${c.evaluationPeriodStartDate} → ${c.evaluationPeriodEndDate}`
                        : '-'
                    const valueNames = (c.valueIds ?? [])
                      .map(vid => valuesStore.find(v => v.id === vid)?.title)
                      .filter(Boolean)
                      .join(', ')
                    return (
                      <TableRow key={c.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="gba:font-medium">{c.name}</TableCell>
                        <TableCell>{evalPeriod}</TableCell>
                        <TableCell>{valueNames || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={isEvalPeriodActive(c) ? 'success' : 'secondary'}>
                            {isEvalPeriodActive(c) ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="gba:text-right">
                          <div className="gba:flex gba:justify-end gba:gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} aria-label="Edit">
                              <PencilSimple />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteCycle(c)}
                              data-testid={`cycle-delete-${c.id}`}
                              aria-label="Delete"
                            >
                              <Trash />
                            </Button>
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
        mode="cycle"
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

export default PerformanceCycles
