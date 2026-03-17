'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
  useTranslation
} from '@newwork/nw-design-system'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import { AbsenceTypeSettingsSection } from '../components/AbsenceTypeSettingsSection'
import useAbsenceGroups from '../../../core/hooks/useAbsenceGroups'
import translations from '../_i18n'
import {
  buildAbsenceTypeObjectValue,
  defaultAbsenceTypeObjectSettings,
  getAbsenceTypeObjectEditorState,
  type AbsenceTypeObjectSettings
} from '../utils/absenceTypeObjectValue'

export interface AbsenceTypeModalValues {
  code: string
  name: string
  name_de: string
  name_ro: string
  group: string
  objectValue: NonNullable<AbsenceType['objectValue']>
}

interface AbsenceTypeModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: AbsenceTypeModalValues) => Promise<void>
  absenceType?: AbsenceType | null
  accessToken: string
}

const emptyFormState = {
  code: '',
  name: '',
  name_de: '',
  name_ro: '',
  group: '',
  settings: defaultAbsenceTypeObjectSettings,
  extraObjectValue: {}
}

export function AbsenceTypeModal({ open, onClose, onSave, absenceType, accessToken }: AbsenceTypeModalProps) {
  const { t } = useTranslation(translations)
  const { groups, loading: groupsLoading, error: groupsError } = useAbsenceGroups(accessToken)
  const [formValues, setFormValues] = useState(emptyFormState)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    if (!absenceType) {
      setFormValues(emptyFormState)
      return
    }

    const { settings, extraObjectValue } = getAbsenceTypeObjectEditorState(absenceType.objectValue)

    setFormValues({
      code: absenceType.code || '',
      name: absenceType.translations?.find(item => item.localeCode === 'en-US')?.value || absenceType.value || '',
      name_de: absenceType.translations?.find(item => item.localeCode === 'de-DE')?.value || '',
      name_ro: absenceType.translations?.find(item => item.localeCode === 'ro-RO')?.value || '',
      group: absenceType.parentEntryId?.split(':').pop() || '',
      settings,
      extraObjectValue
    })
  }, [absenceType, open])

  const groupOptions = useMemo(
    () =>
      groups.map(group => ({
        value: group.code || group.id,
        label: group.value || group.code || group.id
      })),
    [groups]
  )

  const isSaveDisabled = isSaving || !formValues.code.trim() || !formValues.name.trim() || !formValues.group

  const updateSettingsField = <K extends keyof AbsenceTypeObjectSettings>(
    field: K,
    value: AbsenceTypeObjectSettings[K]
  ) => {
    setFormValues(current => ({
      ...current,
      settings: {
        ...current.settings,
        [field]: value
      }
    }))
  }

  const handleSubmit = async () => {
    if (isSaveDisabled) {
      return
    }

    try {
      setIsSaving(true)
      await onSave({
        code: formValues.code.trim(),
        name: formValues.name.trim(),
        name_de: formValues.name_de.trim(),
        name_ro: formValues.name_ro.trim(),
        group: formValues.group,
        objectValue: buildAbsenceTypeObjectValue(formValues.settings, formValues.extraObjectValue)
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('save-absence-type-error')
      console.error('Error saving absence type:', message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        data-testid="absence-type-modal"
        className="gba:flex gba:max-w-3xl gba:max-h-[85vh] gba:flex-col gba:overflow-hidden gba:p-0"
        onInteractOutside={event => event.preventDefault()}
      >
        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
          <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-4 gba:py-3">
            <DialogTitle>{absenceType?.id ? t('type-modal-edit-title') : t('type-modal-create-title')}</DialogTitle>
            <DialogDescription>{t('type-modal-description')}</DialogDescription>
          </DialogHeader>

          <div className="gba:flex-1 gba:space-y-3 gba:overflow-y-auto gba:px-4 gba:py-4">
            {groupsError && (
              <Alert variant="destructive" data-testid="absence-type-groups-error">
                <AlertTitle>{t('type-modal-groups-error-title')}</AlertTitle>
                <AlertDescription>{groupsError.message}</AlertDescription>
              </Alert>
            )}

            <Card data-testid="absence-type-form" className="gba:border gba:border-border gba:bg-muted/10">
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle>{t('basic-information-section-title')}</CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-3 gba:p-4">
                <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-type-code">
                      {t('field-code-label')}
                      <span className="gba:text-destructive"> *</span>
                    </Label>
                    <Input
                      id="absence-type-code"
                      value={formValues.code}
                      onChange={event => setFormValues(current => ({ ...current, code: event.target.value }))}
                      placeholder={t('code-placeholder')}
                      data-testid="absence-type-code-input"
                    />
                  </div>

                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-type-group">
                      {t('field-group-label')}
                      <span className="gba:text-destructive"> *</span>
                    </Label>
                    <Combobox
                      value={formValues.group}
                      onValueChange={value => setFormValues(current => ({ ...current, group: String(value || '') }))}
                      options={groupOptions}
                      placeholder={t('group-placeholder')}
                      searchPlaceholder={t('group-placeholder')}
                      emptyText={t('no-group')}
                      disabled={groupsLoading}
                      data-testid="absence-type-group-select"
                    />
                  </div>
                </div>

                <div className="gba:grid gba:gap-4 gba:md:grid-cols-2">
                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-type-name-en">
                      {t('field-name-en-label')}
                      <span className="gba:text-destructive"> *</span>
                    </Label>
                    <Input
                      id="absence-type-name-en"
                      value={formValues.name}
                      onChange={event => setFormValues(current => ({ ...current, name: event.target.value }))}
                      data-testid="absence-type-name-en-input"
                    />
                  </div>

                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-type-name-de">{t('field-name-de-label')}</Label>
                    <Input
                      id="absence-type-name-de"
                      value={formValues.name_de}
                      onChange={event => setFormValues(current => ({ ...current, name_de: event.target.value }))}
                      data-testid="absence-type-name-de-input"
                    />
                  </div>

                  <div className="gba:space-y-2">
                    <Label htmlFor="absence-type-name-ro">{t('field-name-ro-label')}</Label>
                    <Input
                      id="absence-type-name-ro"
                      value={formValues.name_ro}
                      onChange={event => setFormValues(current => ({ ...current, name_ro: event.target.value }))}
                      data-testid="absence-type-name-ro-input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <AbsenceTypeSettingsSection settings={formValues.settings} onFieldChange={updateSettingsField} />
          </div>

          <div className="gba:flex gba:shrink-0 gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:bg-background gba:px-4 gba:py-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              data-testid="absence-type-cancel-button"
            >
              {t('cancel-button')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              data-testid="absence-type-save-button"
            >
              {isSaving ? t('saving-button') : t('save-button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
