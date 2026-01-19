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
  CardContent
} from '@newwork/nw-design-system'
import { CalendarBlank, ListChecks, PencilSimple, Plus } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import CycleEditorModal, {
  CycleEditorValues,
  EvaluationStage as EditorStage,
  ParticipantType as EditorParticipantType,
  FrequencyType as EditorFrequencyType
} from './CycleEditorModal'
import RatingScaleEditorModal, { RatingScaleValues } from './RatingScaleEditorModal'

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
}

const STORAGE_KEY = 'hr.performance.cycles.v1'
const RATING_SCALES_STORAGE_KEY = 'hr.performance.ratingScales.v1'

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
    RatingScales = 'rating-scales'
  }
  const [activeTab, setActiveTab] = useState<PerformanceTabEnum>(PerformanceTabEnum.Cycles)
  const handleTabChange = (value: string) => setActiveTab(value as PerformanceTabEnum)
  const [ratingScales, setRatingScales] = useState<RatingScale[]>([])
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false)
  const [editingScale, setEditingScale] = useState<RatingScale | null>(null)

  useEffect(() => {
    setCycles(loadCycles())
    setRatingScales(loadRatingScales())
  }, [])

  useEffect(() => {
    saveCycles(cycles)
  }, [cycles])
  useEffect(() => {
    saveRatingScales(ratingScales)
  }, [ratingScales])

  const pageTitle = getTranslationFromI18nKeyAndLabel(
    'lowcoder:hr_performance_cycle_config.title',
    'Performance Cycle Configuration'
  )
  const pageSubtitle = getTranslationFromI18nKeyAndLabel(
    'lowcoder:hr_performance_cycle_config.subtitle',
    'Create and manage performance evaluation cycles'
  )

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
      ratingScaleId: values.ratingScaleId
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

  const renderTable = () => (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <CalendarBlank size={20} />
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_performance_cycle_config.cycles', 'Cycles')}
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
            {getTranslationFromI18nKeyAndLabel('lowcoder:common.add', 'Add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[24px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scale</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="gba:text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="gba:text-center gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_performance_cycle_config.no_cycles',
                      'No cycles created yet.'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                cycles.map((c, i) => {
                  const participants = c.participants.join(', ')
                  const dates = `${c.startDate} → ${c.endDate}`
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="gba:font-medium">{c.name}</TableCell>
                      <TableCell>{dates}</TableCell>
                      <TableCell>{c.frequency}</TableCell>
                      <TableCell>
                        {c.ratingScaleId ? ratingScales.find(s => s.id === c.ratingScaleId)?.name || '-' : '-'}
                      </TableCell>
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
                              Activate
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeactivate(c.id)}
                              data-testid={`cycle-deactivate-${c.id}`}
                            >
                              Deactivate
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCycle(c.id)}
                            data-testid={`cycle-delete-${c.id}`}
                          >
                            Delete
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
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_performance_cycle_config.rating_scales_tab',
              'Rating Scales'
            )}
          </CardTitle>
          <Button
            variant="default"
            onClick={() => {
              setEditingScale(null)
              setIsScaleModalOpen(true)
            }}
            data-testid="performance-rating-scales-add-button"
          >
            <Plus className="gba:mr-2" size={16} />
            {getTranslationFromI18nKeyAndLabel('lowcoder:common.add', 'Add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[24px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Values</TableHead>
                <TableHead className="gba:text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratingScales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_performance_cycle_config.no_rating_scales',
                      'No rating scales defined yet.'
                    )}
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
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteScale(s.id)}
                          aria-label="Delete Scale"
                        >
                          Delete
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
              label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_performance_cycle_config.cycles_tab', 'Cycles')
            },
            {
              value: PerformanceTabEnum.RatingScales,
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_performance_cycle_config.rating_scales_tab',
                'Rating Scales'
              )
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
                ratingScaleId: editing.ratingScaleId
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
    </div>
  )
}

export default PerformanceEvaluation
