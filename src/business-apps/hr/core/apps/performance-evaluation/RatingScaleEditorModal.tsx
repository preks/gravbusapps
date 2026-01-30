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
  Combobox,
  useTranslation
} from '@newwork/nw-design-system'
import translations from './_i18n'

export interface RatingScaleValues {
  id?: string
  name: string
  values: string[]
  // Optional metadata for future use/backward compatibility
  numValues?: number
  displayMode?: 'value' | 'letters' | 'stars' | 'custom'
}

interface RatingScaleEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (values: RatingScaleValues) => void
  initialValues?: RatingScaleValues
}

type DisplayMode = 'value' | 'letters' | 'stars' | 'custom'

/** Infer display mode from saved values (e.g. 1,2,3 -> value; A,B,C -> letters; ★,★★ -> stars; else custom). */
function inferDisplayMode(values: string[]): DisplayMode {
  if (!values.length) return 'value'
  const numeric = values.every((v, i) => v.trim() === String(i + 1))
  if (numeric) return 'value'
  const letters = values.every((v, i) => v.trim() === String.fromCharCode(65 + i))
  if (letters) return 'letters'
  const stars = values.every((v, i) => v.trim() === '★'.repeat(i + 1))
  if (stars) return 'stars'
  return 'custom'
}

export const RatingScaleEditorModal: React.FC<RatingScaleEditorModalProps> = ({
  open,
  onOpenChange,
  onSave,
  initialValues
}) => {
  const { t } = useTranslation(translations)
  const [name, setName] = useState(initialValues?.name || '')
  const defaultCount = initialValues?.values?.length ? Math.min(Math.max(initialValues.values.length, 2), 10) : 5
  const [count, setCount] = useState<number>(defaultCount)
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialValues ? 'custom' : 'value')
  const [customLabels, setCustomLabels] = useState<string[]>(
    initialValues?.values?.length
      ? [...initialValues.values]
      : Array.from({ length: defaultCount }, (_, i) => String(i + 1))
  )

  // Populate form when modal opens: from initialValues (edit) or reset (add)
  useEffect(() => {
    if (!open) return
    if (initialValues?.name != null && initialValues?.values?.length) {
      setName(initialValues.name)
      const len = Math.min(Math.max(initialValues.values.length, 2), 10)
      setCount(len)
      setDisplayMode(initialValues.displayMode ?? inferDisplayMode(initialValues.values))
      setCustomLabels(initialValues.values.length <= 10 ? [...initialValues.values] : initialValues.values.slice(0, 10))
    } else {
      setName('')
      setCount(5)
      setDisplayMode('value')
      setCustomLabels(Array.from({ length: 5 }, (_, i) => String(i + 1)))
    }
  }, [open])

  // Ensure customLabels length matches count
  const ensureCustomLength = (nextCount: number) => {
    setCustomLabels(prev => {
      const arr = [...prev]
      if (arr.length < nextCount) {
        for (let i = arr.length; i < nextCount; i++) arr.push(String(i + 1))
      } else if (arr.length > nextCount) {
        arr.length = nextCount
      }
      return arr
    })
  }

  const handleCountChange = (raw: string) => {
    const n = Number(raw)
    if (Number.isNaN(n)) return
    const clamped = Math.min(Math.max(Math.floor(n), 2), 10)
    setCount(clamped)
    ensureCustomLength(clamped)
  }

  const displayModeOptions = [
    { label: t('scale-display-numeric'), value: 'value' as DisplayMode },
    { label: t('scale-display-letters'), value: 'letters' as DisplayMode },
    { label: t('scale-display-stars'), value: 'stars' as DisplayMode },
    { label: t('scale-display-custom'), value: 'custom' as DisplayMode }
  ]

  const generatedValues: string[] = useMemo(() => {
    if (displayMode === 'letters') {
      const letters: string[] = []
      for (let i = 0; i < count; i++) {
        const code = 'A'.charCodeAt(0) + i
        letters.push(String.fromCharCode(code))
      }
      return letters
    }
    if (displayMode === 'stars') {
      return Array.from({ length: count }, (_, i) => '★'.repeat(i + 1))
    }
    if (displayMode === 'custom') {
      return customLabels.map(v => v?.toString() ?? '')
    }
    // 'value'
    return Array.from({ length: count }, (_, i) => String(i + 1))
  }, [displayMode, count, customLabels])

  const handleSave = () => {
    if (!name.trim() || generatedValues.length === 0) return
    onSave({
      id: initialValues?.id,
      name: name.trim(),
      values: generatedValues,
      numValues: count,
      displayMode
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="rating-scale-editor-modal">
        <DialogHeader>
          <DialogTitle>{initialValues ? t('scale-title-edit') : t('scale-title-add')}</DialogTitle>
          <DialogDescription>{t('scale-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="scale-name">{t('scale-field-name')}</Label>
            <Input
              id="scale-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('scale-placeholder-name')}
            />
          </div>

          <div className="gba:space-y-2">
            <Label>{t('scale-field-length')}</Label>
            <Input type="number" min={2} max={10} value={count} onChange={e => handleCountChange(e.target.value)} />
          </div>

          <div className="gba:space-y-2">
            <Label>{t('scale-field-display')}</Label>
            <Combobox
              value={displayMode}
              onValueChange={v => setDisplayMode((v as DisplayMode) || 'value')}
              options={displayModeOptions}
              placeholder={t('scale-display-placeholder')}
            />
          </div>

          {displayMode === 'custom' ? (
            <div className="gba:space-y-2">
              <Label>{t('scale-field-custom-labels')}</Label>
              <div className="gba:space-y-2">
                {Array.from({ length: count }, (_, i) => (
                  <div key={`custom-${i}`} className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:w-10 gba:text-sm gba:text-muted-foreground">{i + 1}</div>
                    <Input
                      value={customLabels[i] ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        setCustomLabels(prev => {
                          const next = [...prev]
                          next[i] = v
                          return next
                        })
                      }}
                      placeholder={`${t('scale-custom-label-placeholder-prefix')} ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="gba:space-y-2">
              <Label>{t('scale-preview')}</Label>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {generatedValues.map((v, i) => (
                  <div key={`prev-${i}`} className="gba:border gba:rounded-lg gba:px-2 gba:py-1 gba:text-sm">
                    {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="gba:flex gba:justify-end gba:gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t('button-cancel')}
            </Button>
            <Button variant="default" onClick={handleSave} disabled={!name.trim() || generatedValues.length === 0}>
              {t('button-save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RatingScaleEditorModal
