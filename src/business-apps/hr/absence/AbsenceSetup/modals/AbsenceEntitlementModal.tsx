'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DateInput,
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
import { AbsenceEntitlementSettingsSection } from '../components/AbsenceEntitlementSettingsSection'
import {
  buildAbsenceEntitlementObjectValue,
  type AbsenceEntitlementDetailEntry,
  type AbsenceEntitlementDetailSettings,
  defaultAbsenceEntitlementDetailSettings,
  defaultAbsenceEntitlementObjectSettings,
  getAbsenceEntitlementEditorState,
  type AbsenceEntitlementObjectSettings,
  type AbsenceEntitlementObjectValue
} from '../utils/absenceEntitlementObjectValue'
import type { JSONObject } from '@/common/types/i18nTypes'

export interface AbsenceEntitlementModalValues {
  code: string
  name: string
  objectValue: AbsenceEntitlementObjectValue
}

interface AbsenceEntitlementModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: AbsenceEntitlementModalValues) => Promise<void>
  entitlement?: CatalogEntry | null
  absenceTypes: AbsenceType[]
  absenceTypeVersions: CatalogEntry[]
}

const normalizeDateInputValue = (value: string): string => {
  if (!value) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    const [day, month, year] = value.split('.')
    return `${year}-${month}-${day}`
  }

  return value
}

export const AbsenceEntitlementModal: React.FC<AbsenceEntitlementModalProps> = ({
  open,
  onClose,
  onSave,
  entitlement,
  absenceTypes,
  absenceTypeVersions
}) => {
  const { t } = useTranslation(translations)
  const nextDetailIdRef = useRef(0)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [settings, setSettings] = useState<AbsenceEntitlementObjectSettings>(defaultAbsenceEntitlementObjectSettings)
  const [detailEntries, setDetailEntries] = useState<AbsenceEntitlementDetailEntry[]>([])
  const [extraObjectValue, setExtraObjectValue] = useState<JSONObject>({})
  const [isSaving, setIsSaving] = useState(false)

  const entitlementTypeOptions = [
    { value: 'YEARLY', label: t('type-yearly') },
    { value: 'SPECIAL', label: t('type-special') }
  ]

  useEffect(() => {
    if (!open) return

    const nextState = getAbsenceEntitlementEditorState(
      entitlement?.objectValue as AbsenceEntitlementObjectValue | undefined
    )
    setCode(entitlement?.code || '')
    setName(entitlement?.value || '')
    setSettings(nextState.settings)
    setDetailEntries(nextState.detailEntries)
    setExtraObjectValue(nextState.extraObjectValue)
  }, [entitlement, open])

  const isSaveDisabled = isSaving || !code.trim() || !name.trim()

  const updateSettingsField = <K extends keyof AbsenceEntitlementObjectSettings>(
    field: K,
    value: AbsenceEntitlementObjectSettings[K]
  ) => {
    setSettings(current => ({ ...current, [field]: value }))
  }

  const updateDetailField = <K extends keyof AbsenceEntitlementDetailEntry['settings']>(
    detailId: string,
    field: K,
    value: AbsenceEntitlementDetailEntry['settings'][K]
  ) => {
    setDetailEntries(current =>
      current.map(detailEntry =>
        detailEntry.id === detailId
          ? { ...detailEntry, settings: { ...detailEntry.settings, [field]: value } }
          : detailEntry
      )
    )
  }

  const createDetailId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `detail-${Date.now()}-${nextDetailIdRef.current++}`

  const addDetailEntry = (detailSettings: AbsenceEntitlementDetailSettings) => {
    setDetailEntries(current => [
      ...current,
      {
        id: createDetailId(),
        settings: { ...defaultAbsenceEntitlementDetailSettings, ...detailSettings },
        extraValue: {}
      }
    ])
  }

  const removeDetailEntry = (detailId: string) => {
    setDetailEntries(current =>
      current.length > 1 ? current.filter(detailEntry => detailEntry.id !== detailId) : current
    )
  }

  const handleSubmit = async () => {
    if (isSaveDisabled) {
      return
    }

    try {
      setIsSaving(true)
      await onSave({
        code: code.trim(),
        name: name.trim(),
        objectValue: buildAbsenceEntitlementObjectValue(settings, detailEntries, extraObjectValue)
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('save-absence-entitlement-error')
      console.error('Error saving absence entitlement:', message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        data-testid="absence-entitlement-modal"
        className="gba:flex gba:max-w-4xl gba:max-h-[85vh] gba:flex-col gba:overflow-hidden gba:p-0"
        onInteractOutside={event => event.preventDefault()}
      >
        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
          <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-4 gba:py-3">
            <DialogTitle>
              {entitlement ? t('entitlement-modal-edit-title') : t('entitlement-modal-create-title')}
            </DialogTitle>
            <DialogDescription>{t('entitlement-modal-description')}</DialogDescription>
          </DialogHeader>

          <div className="gba:flex-1 gba:space-y-3 gba:overflow-y-auto gba:px-4 gba:py-4">
            <Card
              data-testid="absence-entitlement-basic-section"
              className="gba:border gba:border-border gba:bg-muted/10"
            >
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle>{t('entitlement-basic-section-title')}</CardTitle>
              </CardHeader>
              <CardContent className="gba:grid gba:gap-3 gba:p-4 gba:md:grid-cols-2 gba:xl:grid-cols-5">
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-code">{t('field-code-label')}</Label>
                  <Input
                    id="absence-entitlement-code"
                    value={code}
                    onChange={event => setCode(event.target.value)}
                    disabled={Boolean(entitlement?.id)}
                    data-testid="absence-entitlement-code-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-name">{t('field-name-label')}</Label>
                  <Input
                    id="absence-entitlement-name"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    data-testid="absence-entitlement-name-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label>{t('field-type-label')}</Label>
                  <Combobox
                    value={settings.entitlement_type}
                    onValueChange={value => updateSettingsField('entitlement_type', String(value || 'YEARLY'))}
                    options={entitlementTypeOptions}
                    placeholder={t('field-type-label')}
                    searchPlaceholder={t('field-type-label')}
                    emptyText={t('empty-catalog-entries', { entity: t('absence-entitlement-entity-label') })}
                    data-testid="absence-entitlement-type-select"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-valid-from">{t('field-valid-from-label')}</Label>
                  <DateInput
                    id="absence-entitlement-valid-from"
                    type="date"
                    outputFormat="iso"
                    value={normalizeDateInputValue(settings.valid_from)}
                    onChange={value => updateSettingsField('valid_from', value || '')}
                    data-testid="absence-entitlement-valid-from-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-valid-to">{t('field-valid-to-label')}</Label>
                  <DateInput
                    id="absence-entitlement-valid-to"
                    type="date"
                    outputFormat="iso"
                    value={normalizeDateInputValue(settings.valid_to)}
                    onChange={value => updateSettingsField('valid_to', value || '')}
                    data-testid="absence-entitlement-valid-to-input"
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="settings" className="gba:w-full">
              <TabsList className="gba:grid gba:w-full gba:grid-cols-2" data-testid="absence-entitlement-tabs-list">
                <TabsTrigger value="settings" data-testid="absence-entitlement-settings-tab">
                  {t('entitlement-settings-section-title')}
                </TabsTrigger>
                <TabsTrigger value="details" data-testid="absence-entitlement-details-tab">
                  {t('entitlement-details-section-title')}
                </TabsTrigger>
              </TabsList>

              <AbsenceEntitlementSettingsSection
                settings={settings}
                detailEntries={detailEntries}
                absenceTypes={absenceTypes}
                absenceTypeVersions={absenceTypeVersions}
                mode="settings"
                onSettingsChange={updateSettingsField}
                onAddDetail={addDetailEntry}
                onRemoveDetail={removeDetailEntry}
                onDetailChange={updateDetailField}
              />

              <AbsenceEntitlementSettingsSection
                settings={settings}
                detailEntries={detailEntries}
                absenceTypes={absenceTypes}
                absenceTypeVersions={absenceTypeVersions}
                mode="details"
                onSettingsChange={updateSettingsField}
                onAddDetail={addDetailEntry}
                onRemoveDetail={removeDetailEntry}
                onDetailChange={updateDetailField}
              />
            </Tabs>
          </div>

          <div className="gba:flex gba:shrink-0 gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:bg-background gba:px-4 gba:py-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              data-testid="absence-entitlement-cancel-button"
            >
              {t('cancel-button')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              data-testid="absence-entitlement-save-button"
            >
              {isSaving ? t('saving-button') : t('save-button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
