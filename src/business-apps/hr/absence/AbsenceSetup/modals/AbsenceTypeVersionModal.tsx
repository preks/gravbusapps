'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import translations from '../_i18n'
import { AbsenceTypeVersionAccessCard } from '../components/AbsenceTypeVersionAccessCard'
import { AbsenceTypeVersionSettingsCard } from '../components/AbsenceTypeVersionSettingsCard'
import {
  defaultAbsenceTypeVersionValues,
  getAbsenceGroupLabel,
  type AbsenceTypeVersionFormValues
} from '../utils/absenceSetup'
import { getAbsenceTypeVersionFormValues } from '../utils/absenceTypeVersionObjectValue'

interface AbsenceTypeVersionModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: AbsenceTypeVersionFormValues) => Promise<void>
  entry?: CatalogEntry | null
  absenceTypes: AbsenceType[]
}

export const AbsenceTypeVersionModal: React.FC<AbsenceTypeVersionModalProps> = ({
  open,
  onClose,
  onSave,
  entry,
  absenceTypes
}) => {
  const { t } = useTranslation(translations)
  const [formValues, setFormValues] = useState<AbsenceTypeVersionFormValues>(defaultAbsenceTypeVersionValues)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setFormValues(getAbsenceTypeVersionFormValues(entry, defaultAbsenceTypeVersionValues))
  }, [entry, open])

  const selectedType = useMemo(
    () => absenceTypes.find(item => item.code === formValues.code),
    [absenceTypes, formValues.code]
  )

  const absenceTypeOptions = useMemo(
    () =>
      absenceTypes.map(item => ({
        value: item.code,
        label: item.value || item.code
      })),
    [absenceTypes]
  )

  const isSaveDisabled = isSaving || !formValues.code

  const updateField = <K extends keyof AbsenceTypeVersionFormValues>(
    field: K,
    value: AbsenceTypeVersionFormValues[K]
  ) => {
    setFormValues(current => ({ ...current, [field]: value }))
  }

  const toggleBooleanField = (field: keyof AbsenceTypeVersionFormValues) => (value: boolean) => {
    setFormValues(current => ({ ...current, [field]: value }))
  }

  const handleSubmit = async () => {
    if (isSaveDisabled) {
      return
    }

    try {
      setIsSaving(true)
      await onSave(formValues)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('save-absence-type-version-error')
      console.error('Error saving absence type version:', message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        data-testid="absence-type-version-modal"
        className="gba:flex gba:max-w-4xl gba:max-h-[85vh] gba:flex-col gba:overflow-hidden gba:p-0"
        onInteractOutside={event => event.preventDefault()}
      >
        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
          <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-4 gba:py-3">
            <DialogTitle>{entry ? t('version-modal-edit-title') : t('version-modal-create-title')}</DialogTitle>
            <DialogDescription>{t('version-modal-description')}</DialogDescription>
          </DialogHeader>

          <div className="gba:flex-1 gba:space-y-3 gba:overflow-y-auto gba:px-4 gba:py-4">
            <Card
              data-testid="absence-type-version-basic-section"
              className="gba:border gba:border-border gba:bg-muted/10"
            >
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle>{t('version-basic-section-title')}</CardTitle>
              </CardHeader>
              <CardContent className="gba:grid gba:gap-3 gba:p-4 gba:md:grid-cols-3">
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-code">
                    {t('field-code-label')}
                    <span className="gba:text-destructive"> *</span>
                  </Label>
                  <Combobox
                    value={formValues.code}
                    onValueChange={value => setFormValues(current => ({ ...current, code: String(value || '') }))}
                    options={absenceTypeOptions}
                    placeholder={t('add-absence-type-row-placeholder')}
                    searchPlaceholder={t('add-absence-type-row-placeholder')}
                    emptyText={t('empty-absence-types')}
                    data-testid="absence-type-version-code-select"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-name">{t('field-name-label')}</Label>
                  <Input
                    id="absence-type-version-name"
                    value={selectedType?.value || ''}
                    disabled
                    className="gba:bg-muted"
                    data-testid="absence-type-version-name-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-group">{t('field-group-label')}</Label>
                  <Input
                    id="absence-type-version-group"
                    value={selectedType ? getAbsenceGroupLabel(selectedType.parentEntryId, t('no-group')) : ''}
                    disabled
                    className="gba:bg-muted"
                    data-testid="absence-type-version-group-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-value">{t('field-version-label')}</Label>
                  <Input
                    id="absence-type-version-value"
                    value={formValues.version}
                    onChange={event => setFormValues(current => ({ ...current, version: event.target.value }))}
                    data-testid="absence-type-version-value-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-valid-from">{t('field-valid-from-label')}</Label>
                  <Input
                    id="absence-type-version-valid-from"
                    type="date"
                    value={formValues.validFrom}
                    onChange={event => setFormValues(current => ({ ...current, validFrom: event.target.value }))}
                    data-testid="absence-type-version-valid-from-input"
                  />
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="absence-type-version-valid-to">{t('field-valid-to-label')}</Label>
                  <Input
                    id="absence-type-version-valid-to"
                    type="date"
                    value={formValues.validTo}
                    onChange={event => setFormValues(current => ({ ...current, validTo: event.target.value }))}
                    data-testid="absence-type-version-valid-to-input"
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="settings" className="gba:w-full">
              <TabsList className="gba:grid gba:w-full gba:grid-cols-2" data-testid="absence-type-version-tabs-list">
                <TabsTrigger value="settings" data-testid="absence-type-version-settings-tab">
                  {t('version-settings-section-title')}
                </TabsTrigger>
                <TabsTrigger value="access" data-testid="absence-type-version-access-tab">
                  {t('version-access-section-title')}
                </TabsTrigger>
              </TabsList>

              <AbsenceTypeVersionSettingsCard
                formValues={formValues}
                onFieldChange={updateField}
                onToggleField={toggleBooleanField}
              />

              <AbsenceTypeVersionAccessCard
                formValues={formValues}
                onFieldChange={updateField}
                onToggleField={toggleBooleanField}
              />
            </Tabs>
          </div>

          <div className="gba:flex gba:shrink-0 gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:bg-background gba:px-4 gba:py-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              data-testid="absence-type-version-cancel-button"
            >
              {t('cancel-button')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              data-testid="absence-type-version-save-button"
            >
              {isSaving ? t('saving-button') : t('save-button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
