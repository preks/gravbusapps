import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  DateInput,
  Label,
  Checkbox,
  Combobox,
  Separator,
  useTranslation
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
  version?: number
  name: string
  startDate: string
  endDate: string
  frequency: FrequencyType
  participants: ParticipantType[]
  stages: EvaluationStage[]
  ratingScaleId?: string
  valueIds?: string[]
}

const frequencyOptions: FrequencyType[] = ['Annual', 'Quarterly', 'Custom']
const participantOptions: ParticipantType[] = ['Self', 'Peer', 'Manager', 'Team']

// Stages are managed outside this modal; no stage templates here.

// (no-op helper previously used for stages removed)
import translations from './_i18n'

/** Value option for the cycle editor (from API; id, title, active). */
export interface CycleEditorValueOption {
  id: string
  title: string
  active?: boolean
}

interface CycleEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: CycleEditorValues) => void
  initialValues?: CycleEditorValues
  /** Values for the Valori dropdown (from DB). When provided, localStorage is not used. */
  availableValues?: CycleEditorValueOption[]
}

function defaultParticipantsState(initialValues?: CycleEditorValues): Record<ParticipantType, boolean> {
  return {
    Self: initialValues?.participants?.includes('Self') ?? true,
    Peer: initialValues?.participants?.includes('Peer') ?? true,
    Manager: initialValues?.participants?.includes('Manager') ?? true,
    Calibration: false,
    Team: initialValues?.participants?.includes('Team') ?? true
  }
}

export const CycleEditorModal: React.FC<CycleEditorModalProps> = ({
  open,
  onOpenChange,
  onSave,
  initialValues,
  availableValues: availableValuesProp = []
}) => {
  const { t } = useTranslation(translations)
  const [name, setName] = useState(initialValues?.name || '')
  const [startDate, setStartDate] = useState(initialValues?.startDate || '')
  const [endDate, setEndDate] = useState(initialValues?.endDate || '')
  const [frequency, setFrequency] = useState<FrequencyType>(initialValues?.frequency || 'Annual')
  const [participantsState, setParticipantsState] = useState<Record<ParticipantType, boolean>>(() =>
    defaultParticipantsState(initialValues)
  )
  const initialStages: EvaluationStage[] = initialValues?.stages ?? []

  // Rating scales (managed in Rating Scales tab)
  const RATING_SCALES_STORAGE_KEY = 'hr.performance.ratingScales.v1'
  type RatingScale = { id: string; name: string; values: string[] }
  const [availableScales, setAvailableScales] = useState<RatingScale[]>([])
  const [selectedScaleId, setSelectedScaleId] = useState<string | undefined>(initialValues?.ratingScaleId)

  // Values: from prop (real data from DB via parent's valuesStore)
  const [selectedValueIds, setSelectedValueIds] = useState<string[]>(initialValues?.valueIds ?? [])
  const availableValues = availableValuesProp

  // Populate form when modal opens: from initialValues (edit) or empty (create)
  useEffect(() => {
    if (!open) return
    if (initialValues) {
      setName(initialValues.name || '')
      setStartDate(initialValues.startDate || '')
      setEndDate(initialValues.endDate || '')
      setFrequency(initialValues.frequency || 'Annual')
      setParticipantsState(defaultParticipantsState(initialValues))
      setSelectedScaleId(initialValues.ratingScaleId)
      setSelectedValueIds(initialValues.valueIds ?? [])
    } else {
      setName('')
      setStartDate('')
      setEndDate('')
      setFrequency('Annual')
      setParticipantsState(defaultParticipantsState())
      setSelectedScaleId(undefined)
      setSelectedValueIds([])
    }
  }, [open])

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
    // Send only the currently selected value IDs (deduped) so backend receives exact selection
    const valueIdsToSave = [...new Set(selectedValueIds)]
    onSave({
      id: initialValues?.id,
      version: initialValues?.version,
      name: name.trim(),
      startDate,
      endDate,
      frequency,
      participants: selectedParticipants,
      stages: initialStages,
      ratingScaleId: selectedScaleId,
      valueIds: valueIdsToSave
    })
    onOpenChange(false)
  }

  const handleCancel = () => onOpenChange(false)

  const getParticipantLabel = (p: ParticipantType): string => {
    switch (p) {
      case 'Self':
        return t('participant-self')
      case 'Peer':
        return t('participant-peer')
      case 'Manager':
        return t('participant-manager')
      case 'Team':
        return t('participant-team')
      default:
        return p
    }
  }

  const getFrequencyLabel = (f: FrequencyType): string => {
    switch (f) {
      case 'Annual':
        return t('frequency-annual')
      case 'Quarterly':
        return t('frequency-quarterly')
      case 'Custom':
        return t('frequency-custom')
      default:
        return f
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="performance-cycle-editor-modal">
        <DialogHeader>
          <DialogTitle>{initialValues ? t('modal-edit-title') : t('modal-create-title')}</DialogTitle>
          <DialogDescription>{t('modal-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6">
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="cycle-name">{t('field-name')} *</Label>
              <Input
                id="cycle-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('placeholder-name')}
              />
            </div>
            <div className="gba:space-y-2">
              <Label>{t('field-start-date')} *</Label>
              <DateInput
                type="date"
                value={startDate}
                onChange={(value: string | null) => setStartDate(value || '')}
                outputFormat="iso"
              />
            </div>
            <div className="gba:space-y-2">
              <Label>{t('field-frequency')} *</Label>
              <Combobox
                value={frequency}
                onValueChange={v => setFrequency((v as FrequencyType) || 'Annual')}
                options={frequencyOptions.map(v => ({ label: getFrequencyLabel(v), value: v }))}
                placeholder={t('placeholder-select-frequency')}
              />
            </div>
            <div className="gba:space-y-2">
              <Label>{t('field-end-date')} *</Label>
              <DateInput
                type="date"
                value={endDate}
                onChange={(value: string | null) => setEndDate(value || '')}
                outputFormat="iso"
              />
            </div>
          </div>

          <Separator />

          <div className="gba:space-y-2">
            <Label>{t('field-rating-scale')} *</Label>
            <Combobox
              value={selectedScaleId}
              onValueChange={v => setSelectedScaleId((v as string) || undefined)}
              options={availableScales.map(s => ({ label: `${s.name} (${s.values.join(', ')})`, value: s.id }))}
              placeholder={availableScales.length ? t('placeholder-select-scale') : t('placeholder-no-scales')}
            />
          </div>

          <div className="gba:space-y-2">
            <Label>{t('field-values')}</Label>
            {availableValues.filter(v => v.active !== false).length === 0 ? (
              <div className="gba:text-sm gba:text-muted-foreground">{t('placeholder-no-values')}</div>
            ) : (
              <Combobox
                key={`cycle-values-${open ? (initialValues?.id ?? 'new') : 'closed'}`}
                mode="multiple"
                value={selectedValueIds}
                onValueChange={(ids: string[] | string) => {
                  const next = Array.isArray(ids) ? ids : ids ? [ids] : []
                  setSelectedValueIds([...new Set(next)])
                }}
                options={availableValues.filter(v => v.active !== false).map(v => ({ label: v.title, value: v.id }))}
                placeholder="Select values"
                searchPlaceholder="Type to search values..."
                emptyText="No results"
              />
            )}
          </div>

          <div className="gba:space-y-3">
            <div className="gba:text-sm gba:text-muted-foreground">{t('label-evaluation-participants')} *</div>
            <div className="gba:flex gba:flex-wrap gba:gap-6">
              {participantOptions.map(p => (
                <label key={p} className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox
                    checked={!!participantsState[p]}
                    onCheckedChange={(v: boolean) => setParticipantsState(prev => ({ ...prev, [p]: !!v }))}
                  />
                  <span>{getParticipantLabel(p)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Evaluation Stages section removed */}

          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button variant="secondary" onClick={handleCancel}>
              {t('button-cancel')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={!name.trim() || !startDate || !endDate || !selectedScaleId || selectedParticipants.length === 0}
            >
              {t('button-save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CycleEditorModal
