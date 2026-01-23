import React, { useState, useEffect } from 'react'
import {
  PageLayout,
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
  toast
} from '@newwork/nw-design-system'
import { CalendarBlank, ListChecks, PencilSimple, Plus, Warning as WarningIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import translations from './_i18n'
import CycleEditorModal, {
  CycleEditorValues,
  EvaluationStage as EditorStage,
  ParticipantType as EditorParticipantType,
  FrequencyType as EditorFrequencyType
} from './CycleEditorModal'
import RatingScaleEditorModal, { RatingScaleValues } from './RatingScaleEditorModal'
import ValuesEditorModal, { ValueEditorValues } from './ValuesEditorModal'

type FrequencyType = 'Annual' | 'Quarterly' | 'Custom'
type ParticipantType = 'Self' | 'Peer' | 'Manager' | 'Calibration' | 'Team'

type CycleStatus = 'Active' | 'Upcoming' | 'Inactive'

interface EvaluationStage {
  id: string
  type: ParticipantType
  label: string
}

interface PerformanceCycle {
  id: string
  name: string
  startDate: string // ISO (yyyy-mm-dd)
  endDate: string // ISO
  frequency: FrequencyType
  participants: ParticipantType[]
  stages: EvaluationStage[]
  status: CycleStatus
  deactivated?: boolean
  ratingScaleId?: string
  valueIds?: string[]
}

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

// Stages feature removed

interface RatingScale {
  id: string
  name: string
  values: string[]
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

interface ValueItemStored {
  id: string
  title: string
  description: string
  active: boolean
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

function computeStatus(cycle: Omit<PerformanceCycle, 'status'> & { deactivated?: boolean }): CycleStatus {
  if (cycle.deactivated) return 'Inactive'
  const today = new Date()
  const start = new Date(cycle.startDate)
  const end = new Date(cycle.endDate)
  if (today < start) return 'Upcoming'
  if (today >= start && today <= end) return 'Active'
  return 'Inactive'
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export const PerformanceEvaluation: React.FC<BusinessAppContextProps> = () => {
  const [cycles, setCycles] = useState<PerformanceCycle[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<PerformanceCycle | null>(null)
  enum PerformanceTabEnum {
    Cycles = 'cycles',
    RatingScales = 'rating-scales',
    Values = 'values'
  }
  const [activeTab, setActiveTab] = useState<PerformanceTabEnum>(PerformanceTabEnum.Cycles)
  const handleTabChange = (value: string) => setActiveTab(value as PerformanceTabEnum)
  const [ratingScales, setRatingScales] = useState<RatingScale[]>([])
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false)
  const [editingScale, setEditingScale] = useState<RatingScale | null>(null)
  const [valuesStore, setValuesStore] = useState<ValueItemStored[]>([])
  const { t } = useTranslation(translations)

  useEffect(() => {
    setCycles(loadCycles())
    setRatingScales(loadRatingScales())
    setValuesStore(loadValues())
  }, [])

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

  const handleEdit = (cycle: PerformanceCycle) => {
    setEditing(cycle)
    setIsModalOpen(true)
  }

  const handleDeactivate = (cycleId: string) => {
    setCycles(prev =>
      prev.map(c =>
        c.id === cycleId
          ? {
              ...c,
              deactivated: true,
              status: 'Inactive'
            }
          : c
      )
    )
  }

  const handleActivate = (cycleId: string) => {
    setCycles(prev =>
      prev.map(c =>
        c.id === cycleId
          ? {
              ...c,
              deactivated: false,
              status: computeStatus({ ...c, deactivated: false })
            }
          : c
      )
    )
  }

  const handleSaveFromModal = (values: CycleEditorValues) => {
    const base: Omit<PerformanceCycle, 'status'> = {
      id: values.id || makeId('cycle'),
      name: values.name,
      startDate: values.startDate,
      endDate: values.endDate,
      frequency: values.frequency as FrequencyType,
      participants: values.participants as ParticipantType[],
      stages: (values.stages as EditorStage[]).map(s => ({
        id: s.id,
        type: s.type as ParticipantType,
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
    setEditing(null)
  }

  // Stages management tab removed as per requirements

  const handleSaveFromScaleModal = (values: RatingScaleValues) => {
    const base: RatingScale = {
      id: values.id || makeId('scale'),
      name: values.name,
      values: values.values
    }
    setRatingScales(prev => {
      const exists = prev.some(s => s.id === base.id)
      return exists ? prev.map(s => (s.id === base.id ? base : s)) : [base, ...prev]
    })
    setEditingScale(null)
  }

  const handleDeleteScale = (id: string) => {
    setRatingScales(prev => prev.filter(s => s.id !== id))
  }

  const handleDeleteCycle = (cycleId: string) => {
    setCycles(prev => prev.filter(c => c.id !== cycleId))
  }

  // Values handlers
  const [isValuesModalOpen, setIsValuesModalOpen] = useState(false)
  const [editingValue, setEditingValue] = useState<ValueItemStored | null>(null)

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
    setEditingValue(null)
  }

  const handleDeleteValue = (id: string) => {
    setValuesStore(prev => prev.filter(v => v.id !== id))
  }

  const handleActivateValue = (id: string) => {
    setValuesStore(prev => prev.map(v => (v.id === id ? { ...v, active: true } : v)))
  }

  const handleDeactivateValue = (id: string) => {
    // Guard: prevent deactivation if value is used in any active cycle
    const usedInActiveCycle = cycles.some(c => c.status === 'Active' && (c.valueIds ?? []).includes(id))
    if (usedInActiveCycle) {
      // Inform the user and abort
      toast.warning(t('values-error-cannot-deactivate-active-cycle'), {
        position: 'bottom-right',
        className: 'gba:text-base',
        icon: <WarningIcon size={18} weight="fill" className="gba:text-warning" />
      })
      return
    }
    setValuesStore(prev => prev.map(v => (v.id === id ? { ...v, active: false } : v)))
  }

  const renderTable = () => (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <CalendarBlank size={20} />
            {t('tab-cycles')}
          </CardTitle>
          <Button
            variant="default"
            onClick={() => {
              setEditing(null)
              setIsModalOpen(true)
            }}
            data-testid="performance-cycles-add-button"
          >
            <Plus className="gba:mr-2" size={16} />
            {t('button-add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
              {cycles.length === 0 ? (
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
                              onClick={() => handleActivate(c.id)}
                              data-testid={`cycle-activate-${c.id}`}
                            >
                              {t('button-activate')}
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeactivate(c.id)}
                              data-testid={`cycle-deactivate-${c.id}`}
                            >
                              {t('button-deactivate')}
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCycle(c.id)}
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
  )

  // Stages table removed

  const renderRatingScalesTable = () => (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">{t('tab-rating-scales')}</CardTitle>
          <Button
            variant="default"
            onClick={() => {
              setEditingScale(null)
              setIsScaleModalOpen(true)
            }}
            data-testid="performance-rating-scales-add-button"
          >
            <Plus className="gba:mr-2" size={16} />
            {t('button-add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[24px]"></TableHead>
                <TableHead>{t('table-name')}</TableHead>
                <TableHead>{t('table-values')}</TableHead>
                <TableHead className="gba:text-right">{t('table-actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratingScales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground">
                    {t('empty-no-rating-scales')}
                  </TableCell>
                </TableRow>
              ) : (
                ratingScales.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="gba:font-medium">{s.name}</TableCell>
                    <TableCell>{s.values.join(', ')}</TableCell>
                    <TableCell className="gba:text-right">
                      <div className="gba:flex gba:justify-end gba:gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingScale(s)
                            setIsScaleModalOpen(true)
                          }}
                          aria-label="Edit Scale"
                        >
                          {t('button-edit')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteScale(s.id)}
                          aria-label="Delete Scale"
                        >
                          {t('button-delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  const renderValuesTable = () => (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">{t('tab-values')}</CardTitle>
          <Button
            variant="default"
            onClick={() => {
              setEditingValue(null)
              setIsValuesModalOpen(true)
            }}
            data-testid="performance-values-add-button"
          >
            <Plus className="gba:mr-2" size={16} />
            {t('button-add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[24px]"></TableHead>
                <TableHead>{t('field-title')}</TableHead>
                <TableHead>{t('field-description')}</TableHead>
                <TableHead>{t('table-status')}</TableHead>
                <TableHead className="gba:text-right">{t('table-actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valuesStore.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="gba:text-center gba:text-muted-foreground">
                    {t('empty-no-values')}
                  </TableCell>
                </TableRow>
              ) : (
                valuesStore.map((v, i) => (
                  <TableRow key={v.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="gba:font-medium">{v.title}</TableCell>
                    <TableCell>{v.description}</TableCell>
                    <TableCell>
                      <Badge variant={v.active ? 'success' : 'secondary'}>{v.active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="gba:text-right">
                      <div className="gba:flex gba:justify-end gba:gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingValue(v)
                            setIsValuesModalOpen(true)
                          }}
                          aria-label="Edit Value"
                        >
                          {t('button-edit')}
                        </Button>
                        {v.active ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeactivateValue(v.id)}
                            data-testid={`value-deactivate-${v.id}`}
                          >
                            {t('button-deactivate')}
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleActivateValue(v.id)}
                            data-testid={`value-activate-${v.id}`}
                          >
                            {t('button-activate')}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteValue(v.id)}
                          data-testid={`value-delete-${v.id}`}
                        >
                          {t('button-delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

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
            {
              value: PerformanceTabEnum.Cycles,
              label: t('tab-cycles')
            },
            {
              value: PerformanceTabEnum.RatingScales,
              label: t('tab-rating-scales')
            },
            {
              value: PerformanceTabEnum.Values,
              label: t('tab-values')
            }
          ]
        }}
        variant={MODULE_COLORS.HR}
        className="gba:min-h-screen gba:space-y-6"
      >
        {activeTab === PerformanceTabEnum.Cycles && <div className="gba:space-y-6">{renderTable()}</div>}
        {activeTab === PerformanceTabEnum.RatingScales && (
          <div className="gba:space-y-6">{renderRatingScalesTable()}</div>
        )}
        {activeTab === PerformanceTabEnum.Values && <div className="gba:space-y-6">{renderValuesTable()}</div>}
      </PageLayout>
      <CycleEditorModal
        open={isModalOpen}
        onOpenChange={open => setIsModalOpen(open)}
        onSave={handleSaveFromModal}
        initialValues={
          editing
            ? {
                id: editing.id,
                name: editing.name,
                startDate: editing.startDate,
                endDate: editing.endDate,
                frequency: editing.frequency as EditorFrequencyType,
                participants: editing.participants as EditorParticipantType[],
                stages: editing.stages as unknown as EditorStage[],
                ratingScaleId: editing.ratingScaleId,
                valueIds: editing.valueIds ?? []
              }
            : undefined
        }
      />
      <RatingScaleEditorModal
        open={isScaleModalOpen}
        onOpenChange={open => setIsScaleModalOpen(open)}
        onSave={handleSaveFromScaleModal}
        initialValues={
          editingScale
            ? {
                id: editingScale.id,
                name: editingScale.name,
                values: editingScale.values
              }
            : undefined
        }
      />
      <ValuesEditorModal
        open={isValuesModalOpen}
        onOpenChange={open => setIsValuesModalOpen(open)}
        onSave={handleSaveFromValuesModal}
        initialValues={
          editingValue
            ? {
                id: editingValue.id,
                title: editingValue.title,
                description: editingValue.description,
                active: editingValue.active
              }
            : undefined
        }
      />
    </div>
  )
}

export default PerformanceEvaluation
