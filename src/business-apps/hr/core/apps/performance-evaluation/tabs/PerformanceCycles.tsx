import React, { useState } from 'react'
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
  toast,
  Spinner
} from '@newwork/nw-design-system'
import { CalendarBlank, PencilSimple, Play, Plus, Warning as WarningIcon } from '@phosphor-icons/react'
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
  onActivate: (cycleId: string) => Promise<void>
  onDeactivate: (cycleId: string) => Promise<void>
  onDeleteCycle: (cycle: PerformanceCycle) => Promise<void>
  onStartCycle: (cycleId: string) => void
}

export const PerformanceCycles: React.FC<PerformanceCyclesProps> = ({
  cycles,
  cyclesLoading,
  cyclesError,
  ratingScales,
  valuesStore,
  onSaveFromModal,
  onActivate,
  onDeactivate,
  onDeleteCycle,
  onStartCycle
}) => {
  const { t } = useTranslation(translations)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<PerformanceCycle | null>(null)

  const isDateWithinCyclePeriod = (cycle: PerformanceCycle): boolean => {
    const today = new Date()
    const start = new Date(cycle.startDate)
    const end = new Date(cycle.endDate)
    return today >= start && today <= end
  }

  const canStartCycle = (cycle: PerformanceCycle): boolean => {
    return cycle.status === 'Active' && isDateWithinCyclePeriod(cycle)
  }

  const canActivateCycle = (cycle: PerformanceCycle): boolean => {
    return isDateWithinCyclePeriod(cycle)
  }

  const handleActivateClick = (cycle: PerformanceCycle) => {
    if (!canActivateCycle(cycle)) {
      toast.warning(t('error-activate-out-of-period'), {
        position: 'bottom-right',
        className: 'gba:text-base',
        icon: <WarningIcon size={18} weight="fill" className="gba:text-warning" />
      })
      return
    }
    onActivate(cycle.id)
  }

  const handleEdit = (cycle: PerformanceCycle) => {
    setEditing(cycle)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    if (ratingScales.length === 0) {
      toast.warning(t('cycles-error-no-rating-scales'), {
        position: 'bottom-right',
        className: 'gba:text-base',
        icon: <WarningIcon size={18} weight="fill" className="gba:text-warning" />
      })
    }
    setEditing(null)
    setIsModalOpen(true)
  }

  const handleSaveFromModal = async (values: CycleEditorValues) => {
    await onSaveFromModal(values)
    setEditing(null)
    setIsModalOpen(false)
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
                  <TableHead>{t('table-dates')}</TableHead>
                  <TableHead>{t('table-type')}</TableHead>
                  <TableHead>{t('table-scale')}</TableHead>
                  <TableHead>{t('table-values')}</TableHead>
                  <TableHead>{t('table-participants')}</TableHead>
                  <TableHead>{t('table-status')}</TableHead>
                  <TableHead className="gba:text-right">{t('table-actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cyclesLoading && cycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="gba:py-8 gba:text-center">
                      <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                    </TableCell>
                  </TableRow>
                ) : cycles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="gba:text-center gba:text-muted-foreground">
                      {t('empty-no-cycles')}
                    </TableCell>
                  </TableRow>
                ) : (
                  cycles.map((c, i) => {
                    const participants = c.participants.join(', ')
                    const dates = `${c.startDate} → ${c.endDate}`
                    const valueTitles =
                      (c.valueIds ?? [])
                        .map(id => valuesStore.find(v => v.id === id)?.title)
                        .filter(Boolean)
                        .join(', ') || '-'
                    return (
                      <TableRow key={c.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="gba:font-medium">{c.name}</TableCell>
                        <TableCell>{dates}</TableCell>
                        <TableCell>{c.frequency}</TableCell>
                        <TableCell>
                          {c.ratingScaleId ? ratingScales.find(s => s.id === c.ratingScaleId)?.name || '-' : '-'}
                        </TableCell>
                        <TableCell>{valueTitles}</TableCell>
                        <TableCell>{participants}</TableCell>
                        <TableCell>
                          <Badge
                            variant={c.status === 'Active' ? 'success' : c.status === 'Upcoming' ? 'info' : 'secondary'}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="gba:text-right">
                          <div className="gba:flex gba:justify-end gba:gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} aria-label="Edit">
                              <PencilSimple />
                            </Button>
                            {c.status === 'Inactive' ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleActivateClick(c)}
                                data-testid={`cycle-activate-${c.id}`}
                              >
                                {t('button-activate')}
                              </Button>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onDeactivate(c.id)}
                                data-testid={`cycle-deactivate-${c.id}`}
                              >
                                {t('button-deactivate')}
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => onStartCycle(c.id)}
                              disabled={!canStartCycle(c)}
                              data-testid={`cycle-start-${c.id}`}
                            >
                              <Play weight="fill" className="gba:mr-1" size={16} />
                              {t('button-start')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDeleteCycle(c)}
                              data-testid={`cycle-delete-${c.id}`}
                            >
                              {t('button-delete')}
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
        onOpenChange={open => setIsModalOpen(open)}
        onSave={handleSaveFromModal}
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
                frequency:
                  (String(editing.frequency).toUpperCase().includes('QUARTERLY')
                    ? 'Quarterly'
                    : String(editing.frequency).toUpperCase().includes('ANNUAL')
                      ? 'Annual'
                      : String(editing.frequency).toUpperCase().includes('CUSTOM')
                        ? 'Custom'
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
