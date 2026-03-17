'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  defaultAbsenceEntitlementDetailSettings,
  defaultAbsenceEntitlementObjectSettings,
  getAbsenceEntitlementEditorState,
  type AbsenceEntitlementDetailSettings,
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
}

export const AbsenceEntitlementModal: React.FC<AbsenceEntitlementModalProps> = ({
  open,
  onClose,
  onSave,
  entitlement,
  absenceTypes
}) => {
  const { t } = useTranslation(translations)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [settings, setSettings] = useState<AbsenceEntitlementObjectSettings>(defaultAbsenceEntitlementObjectSettings)
  const [detailSettings, setDetailSettings] = useState<AbsenceEntitlementDetailSettings>(
    defaultAbsenceEntitlementDetailSettings
  )
  const [extraObjectValue, setExtraObjectValue] = useState<JSONObject>({})
  const [extraDetailValue, setExtraDetailValue] = useState<JSONObject>({})
  const [extraDetails, setExtraDetails] = useState<JSONObject[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    const nextState = getAbsenceEntitlementEditorState(
      entitlement?.objectValue as AbsenceEntitlementObjectValue | undefined
    )
    setCode(entitlement?.code || '')
    setName(entitlement?.value || '')
    setSettings(nextState.settings)
    setDetailSettings(nextState.detailSettings)
    setExtraObjectValue(nextState.extraObjectValue)
    setExtraDetailValue(nextState.extraDetailValue)
    setExtraDetails(nextState.extraDetails)
  }, [entitlement, open])

  const isSaveDisabled = isSaving || !code.trim() || !name.trim()

  const updateSettingsField = <K extends keyof AbsenceEntitlementObjectSettings>(
    field: K,
    value: AbsenceEntitlementObjectSettings[K]
  ) => {
    setSettings(current => ({ ...current, [field]: value }))
  }

  const updateDetailField = <K extends keyof AbsenceEntitlementDetailSettings>(
    field: K,
    value: AbsenceEntitlementDetailSettings[K]
  ) => {
    setDetailSettings(current => ({ ...current, [field]: value }))
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
        objectValue: buildAbsenceEntitlementObjectValue(
          settings,
          detailSettings,
          extraObjectValue,
          extraDetailValue,
          extraDetails
        )
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
              <CardContent className="gba:grid gba:gap-3 gba:p-4 gba:md:grid-cols-2">
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-entitlement-code">{t('field-code-label')}</Label>
                  <Input
                    id="absence-entitlement-code"
                    value={code}
                    onChange={event => setCode(event.target.value)}
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
                detailSettings={detailSettings}
                absenceTypes={absenceTypes}
                mode="settings"
                onSettingsChange={updateSettingsField}
                onDetailChange={updateDetailField}
              />

              <AbsenceEntitlementSettingsSection
                settings={settings}
                detailSettings={detailSettings}
                absenceTypes={absenceTypes}
                mode="details"
                onSettingsChange={updateSettingsField}
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
