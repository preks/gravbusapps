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
export type ParticipantType = 'Self' | 'Peer' | 'Manager'

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
  /** Raw API participants with id/version for updates */
  _apiParticipants?: Array<{
    id: string
    version: number | null
    participantType: string | null
    enabled: boolean | null
  }>
  /** Raw API company values with id/version for updates */
  _apiCompanyValues?: Array<{ id: string; version: number | null; companyValueId: string | null }>
}

const frequencyOptions: FrequencyType[] = ['Annual', 'Quarterly', 'Custom']
const participantOptions: ParticipantType[] = ['Self', 'Peer', 'Manager']

// Stages are managed outside this modal; no stage templates here.

// (no-op helper previously used for stages removed)
import translations from './_i18n'
import { PERFORMANCE_VALIDATION } from './constants/validationConstants'

/** Value option for the cycle editor (from API; id, title, recordState). */
export interface CycleEditorValueOption {
  id: string
  title: string
  recordState: string
  active?: boolean
}

/** Rating scale option for the cycle editor (from API; id, name, values). */
export interface CycleEditorRatingScaleOption {
  id: string
  name: string
  values: string[]
}

export interface CycleEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: CycleEditorValues) => void | Promise<void>
  initialValues?: CycleEditorValues
  /** Shown under date fields when cycle dates overlap with an existing cycle. */
  dateOverlapError?: string | null
  /** Called when start or end date changes to clear the overlap error. */
  onClearDateError?: () => void
  /** Values for the Valori dropdown (from DB). When provided, localStorage is not used. */
  availableValues?: CycleEditorValueOption[]
  /** Rating scales from the database (not localStorage). */
  availableRatingScales?: CycleEditorRatingScaleOption[]
}

function defaultParticipantsState(initialValues?: CycleEditorValues): Record<ParticipantType, boolean> {
  return {
    Self: initialValues?.participants?.includes('Self') ?? true,
    Peer: initialValues?.participants?.includes('Peer') ?? true,
    Manager: initialValues?.participants?.includes('Manager') ?? true
  }
}

export const CycleEditorModal: React.FC<CycleEditorModalProps> = ({
  open,
  onOpenChange,
  onSave,
  initialValues,
  dateOverlapError = null,
  onClearDateError,
  availableValues: availableValuesProp = [],
  availableRatingScales: availableRatingScalesProp = []
}) => {
  const { t } = useTranslation(translations)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(initialValues?.name || '')
  const [startDate, setStartDate] = useState(initialValues?.startDate || '')
  const [endDate, setEndDate] = useState(initialValues?.endDate || '')
  const [frequency, setFrequency] = useState<FrequencyType>(initialValues?.frequency || 'Annual')
  const [participantsState, setParticipantsState] = useState<Record<ParticipantType, boolean>>(() =>
    defaultParticipantsState(initialValues)
  )
  const initialStages: EvaluationStage[] = initialValues?.stages ?? []

  // Rating scales: from prop (real data from DB via parent)
  const [selectedScaleId, setSelectedScaleId] = useState<string | undefined>(initialValues?.ratingScaleId)
  const availableScales = availableRatingScalesProp

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
      setFrequency('Custom')
      setParticipantsState(defaultParticipantsState())
      setSelectedScaleId(undefined)
      setSelectedValueIds([])
    }
  }, [open])

  /** Parse date string in YYYY-MM-DD, ISO datetime (YYYY-MM-DDTHH:mm:...), or MM/DD/YYYY to { y, m, d }. */
  const parseStartDate = (dateStr: string): { y: number; m: number; d: number } | null => {
    if (!dateStr?.trim()) return null
    const s = dateStr.trim()
    // ISO datetime from DateInput with outputFormat="iso": take date part only
    const datePart = s.includes('T') ? s.split('T')[0].trim() : s
    const byDash = datePart.split('-')
    const bySlash = s.split('/')
    if (byDash.length === 3) {
      const y = Number(byDash[0])
      const m = Number(byDash[1])
      const d = Number(byDash[2])
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) return { y, m, d }
    }
    if (bySlash.length === 3 && !s.includes('T')) {
      const a = Number(bySlash[0])
      const b = Number(bySlash[1])
      const c = Number(bySlash[2])
      if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c)) return null
      // MM/DD/YYYY (US) when first part <= 12; else DD/MM/YYYY
      const m = a <= 12 ? a : b
      const d = a <= 12 ? b : a
      const y = c
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return { y, m, d }
    }
    return null
  }

  /** Compute end date from { y, m, d } and frequency (Annual +12 months, Quarterly +3). */
  const computeEndDateFromStart = (parsed: { y: number; m: number; d: number }, freq: FrequencyType): string | null => {
    let addMonths = 0
    if (freq === 'Annual') addMonths = 12
    else if (freq === 'Quarterly') addMonths = 3
    else return null
    const totalMonths = parsed.y * 12 + (parsed.m - 1) + addMonths
    const newYear = Math.floor(totalMonths / 12)
    const newMonthZeroBased = totalMonths % 12
    const daysInNewMonth = new Date(newYear, newMonthZeroBased + 1, 0).getDate()
    const newDay = Math.min(parsed.d, daysInNewMonth)
    const pad2 = (n: number) => n.toString().padStart(2, '0')
    return `${newYear.toString().padStart(4, '0')}-${pad2(newMonthZeroBased + 1)}-${pad2(newDay)}`
  }

  // Auto-calc end date when start date or frequency changes (e.g. from useEffect or when user changes frequency).
  useEffect(() => {
    const parsed = parseStartDate(startDate)
    if (!parsed) {
      // If no start date is selected, set frequency to Custom
      if (frequency !== 'Custom') {
        setFrequency('Custom')
      }
      return
    }
    const computed = computeEndDateFromStart(parsed, frequency)
    if (computed) setEndDate(computed)
  }, [startDate, frequency])

  const selectedParticipants = useMemo(() => participantOptions.filter(p => participantsState[p]), [participantsState])

  const handleSave = async () => {
    if (!name.trim() || !startDate || !endDate) return
    const valueIdsToSave = [...new Set(selectedValueIds)]
    const values: CycleEditorValues = {
      id: initialValues?.id,
      version: initialValues?.version,
      name: name.trim(),
      startDate,
      endDate,
      frequency,
      participants: selectedParticipants,
      stages: initialStages,
      ratingScaleId: selectedScaleId,
      valueIds: valueIdsToSave,
      _apiParticipants: initialValues?._apiParticipants,
      _apiCompanyValues: initialValues?._apiCompanyValues
    }
    try {
      setIsSaving(true)
      await onSave(values)
      onOpenChange(false)
    } catch {
      // Overlap or other error: parent sets dateOverlapError; keep modal open
    } finally {
      setIsSaving(false)
    }
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
      <DialogContent data-testid="performance-cycle-editor-modal" onInteractOutside={e => e.preventDefault()}>
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
                maxLength={PERFORMANCE_VALIDATION.CYCLE_NAME_MAX_LENGTH}
              />
            </div>
            <div className="gba:space-y-2">
              <Label>{t('field-start-date')} *</Label>
              <DateInput
                type="date"
                value={startDate}
                onChange={(value: string | [string | null, string | null] | null) => {
                  onClearDateError?.()
                  const raw = typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : ''
                  const parsed = parseStartDate(raw)
                  if (parsed) {
                    const pad2 = (n: number) => n.toString().padStart(2, '0')
                    const isoStart = `${parsed.y.toString().padStart(4, '0')}-${pad2(parsed.m)}-${pad2(parsed.d)}`
                    setStartDate(isoStart)
                    const end = computeEndDateFromStart(parsed, frequency)
                    if (end) setEndDate(end)
                  } else {
                    setStartDate(raw)
                  }
                }}
                outputFormat="iso"
              />
            </div>
            <div className="gba:space-y-2">
              <Label>{t('field-frequency')}</Label>
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
                onChange={(value: string | [string | null, string | null] | null) => {
                  onClearDateError?.()
                  const raw = typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : ''
                  setEndDate(raw)
                  if (frequency !== 'Custom') {
                    setFrequency('Custom')
                  }
                }}
                outputFormat="iso"
              />
            </div>
          </div>
          {dateOverlapError && (
            <p className="gba:text-sm gba:text-destructive gba:col-span-full" role="alert">
              {dateOverlapError}
            </p>
          )}

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
            {(() => {
              const hasValues = availableValues.some(v => v.recordState?.toLowerCase() === 'active')
              const cycleValuesKey = open ? (initialValues?.id ?? 'new') : 'closed'
              if (!hasValues) {
                return <div className="gba:text-sm gba:text-muted-foreground">{t('placeholder-no-values')}</div>
              }
              return (
                <Combobox
                  key={`cycle-values-${cycleValuesKey}`}
                  mode="multiple"
                  value={selectedValueIds}
                  onValueChange={(ids: string[] | string) => {
                    const next = Array.isArray(ids) ? ids : ids ? [ids] : []
                    setSelectedValueIds([...new Set(next)])
                  }}
                  options={availableValues
                    .filter(v => v.recordState?.toLowerCase() === 'active')
                    .map(v => ({ label: v.title, value: v.id }))}
                  placeholder="Select values"
                  searchPlaceholder="Type to search values..."
                  emptyText="No results"
                  className="gba:flex-wrap"
                />
              )
            })()}
          </div>

          <div className="gba:space-y-3">
            <Label>{t('label-evaluation-participants')} *</Label>
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
              disabled={
                !name.trim() ||
                !startDate ||
                !endDate ||
                !selectedScaleId ||
                selectedParticipants.length === 0 ||
                isSaving
              }
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
