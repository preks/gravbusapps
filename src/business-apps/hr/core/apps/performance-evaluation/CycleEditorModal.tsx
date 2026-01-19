import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Checkbox,
  Combobox,
  Separator
} from '@newwork/nw-design-system'

export type FrequencyType = 'Annual' | 'Quarterly' | 'Custom'
export type ParticipantType = 'Self' | 'Peer' | 'Manager' | 'Calibration' | 'Team'

export interface EvaluationStage {
  id: string
  type: ParticipantType
  label: string
}

export interface CycleEditorValues {
  id?: string
  name: string
  startDate: string
  endDate: string
  frequency: FrequencyType
  participants: ParticipantType[]
  stages: EvaluationStage[]
  ratingScaleId?: string
}

const frequencyOptions: FrequencyType[] = ['Annual', 'Quarterly', 'Custom']
const participantOptions: ParticipantType[] = ['Self', 'Peer', 'Manager', 'Team']

// Stages are managed outside this modal; no stage templates here.

// (no-op helper previously used for stages removed)

interface CycleEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: CycleEditorValues) => void
  initialValues?: CycleEditorValues
}

export const CycleEditorModal: React.FC<CycleEditorModalProps> = ({ open, onOpenChange, onSave, initialValues }) => {
  const [name, setName] = useState(initialValues?.name || '')
  const [startDate, setStartDate] = useState(initialValues?.startDate || '')
  const [endDate, setEndDate] = useState(initialValues?.endDate || '')
  const [frequency, setFrequency] = useState<FrequencyType>(initialValues?.frequency || 'Annual')
  const [participantsState, setParticipantsState] = useState<Record<ParticipantType, boolean>>({
    Self: initialValues?.participants?.includes('Self') ?? true,
    Peer: initialValues?.participants?.includes('Peer') ?? true,
    Manager: initialValues?.participants?.includes('Manager') ?? true,
    Calibration: false,
    Team: initialValues?.participants?.includes('Team') ?? true
  })
  const initialStages: EvaluationStage[] = initialValues?.stages ?? []

  // Rating scales (managed in Rating Scales tab)
  const RATING_SCALES_STORAGE_KEY = 'hr.performance.ratingScales.v1'
  type RatingScale = { id: string; name: string; values: string[] }
  const [availableScales, setAvailableScales] = useState<RatingScale[]>([])
  const [selectedScaleId, setSelectedScaleId] = useState<string | undefined>(initialValues?.ratingScaleId)

  // Auto-calc end date based on start date and selected frequency (Annual = +12 months, Quarterly = +3 months).
  useEffect(() => {
    if (!startDate) return
    if (frequency === 'Custom') return
    const parts = startDate.split('-')
    if (parts.length !== 3) return
    const y = Number(parts[0])
    const m = Number(parts[1]) // 1-12
    const d = Number(parts[2])
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return

    let addMonths = 0
    if (frequency === 'Annual') addMonths = 12
    else if (frequency === 'Quarterly') addMonths = 3
    else return

    const totalMonths = y * 12 + (m - 1) + addMonths
    const newYear = Math.floor(totalMonths / 12)
    const newMonthZeroBased = totalMonths % 12 // 0-11
    const daysInNewMonth = new Date(newYear, newMonthZeroBased + 1, 0).getDate()
    const newDay = Math.min(d, daysInNewMonth)
    const pad2 = (n: number) => n.toString().padStart(2, '0')
    const computed = `${newYear.toString().padStart(4, '0')}-${pad2(newMonthZeroBased + 1)}-${pad2(newDay)}`
    setEndDate(computed)
  }, [startDate, frequency])

  // Load available rating scales when modal opens
  useEffect(() => {
    if (!open) return
    try {
      const rawScales = localStorage.getItem(RATING_SCALES_STORAGE_KEY)
      const parsedScales = rawScales ? (JSON.parse(rawScales) as RatingScale[]) : []
      setAvailableScales(Array.isArray(parsedScales) ? parsedScales : [])
    } catch {
      setAvailableScales([])
    }
  }, [open])

  const selectedParticipants = useMemo(() => participantOptions.filter(p => participantsState[p]), [participantsState])

  const handleSave = () => {
    if (!name.trim() || !startDate || !endDate) return
    onSave({
      id: initialValues?.id,
      name: name.trim(),
      startDate,
      endDate,
      frequency,
      participants: selectedParticipants,
      stages: initialStages,
      ratingScaleId: selectedScaleId
    })
    onOpenChange(false)
  }

  const handleCancel = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="performance-cycle-editor-modal">
        <DialogHeader>
          <DialogTitle>{initialValues ? 'Edit Cycle' : 'Create New Cycle'}</DialogTitle>
          <DialogDescription>Configure details and stages for the performance cycle.</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6">
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="cycle-name">Name</Label>
              <Input
                id="cycle-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., 2026 Annual Performance"
              />
            </div>
            <div className="gba:space-y-2">
              <Label>Frequency/Type</Label>
              <Combobox
                value={frequency}
                onValueChange={v => setFrequency((v as FrequencyType) || 'Annual')}
                options={frequencyOptions.map(v => ({ label: v, value: v }))}
                placeholder="Select a frequency"
              />
            </div>
            <div className="gba:space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="gba:space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="gba:space-y-2">
            <Label>Rating Scale</Label>
            <Combobox
              value={selectedScaleId}
              onValueChange={v => setSelectedScaleId((v as string) || undefined)}
              options={availableScales.map(s => ({ label: `${s.name} (${s.values.join(', ')})`, value: s.id }))}
              placeholder={availableScales.length ? 'Select a rating scale' : 'No scales. Add from Rating Scales tab.'}
            />
          </div>

          <div className="gba:space-y-3">
            <div className="gba:text-sm gba:text-muted-foreground">Evaluation Participants</div>
            <div className="gba:flex gba:flex-wrap gba:gap-6">
              {participantOptions.map(p => (
                <label key={p} className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox
                    checked={!!participantsState[p]}
                    onCheckedChange={(v: boolean) => setParticipantsState(prev => ({ ...prev, [p]: !!v }))}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Evaluation Stages section removed */}

          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSave} disabled={!name.trim() || !startDate || !endDate}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CycleEditorModal
