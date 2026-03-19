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
  useTranslation
} from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { JSONObject } from '@/common/types/i18nTypes'
import translations from '../_i18n'
import {
  buildAbsencePolicyObjectValue,
  defaultAbsencePolicyDetailSettings,
  getAbsencePolicyEditorState,
  type AbsencePolicyDetailSettings,
  type AbsencePolicyEditorDetail,
  type AbsencePolicyObjectValue
} from '../utils/absencePolicyObjectValue'

export interface AbsencePolicyModalValues {
  code: string
  name: string
  objectValue: AbsencePolicyObjectValue
}

interface AbsencePolicyModalProps {
  open: boolean
  onClose: () => void
  onSave: (values: AbsencePolicyModalValues) => Promise<void>
  policy?: CatalogEntry | null
  absenceTypes: AbsenceType[]
}

const createPolicyDetail = (id: number, settings: AbsencePolicyDetailSettings): AbsencePolicyEditorDetail => ({
  id,
  settings,
  extraDetailValue: {}
})

export const AbsencePolicyModal: React.FC<AbsencePolicyModalProps> = ({
  open,
  onClose,
  onSave,
  policy,
  absenceTypes
}) => {
  const { t } = useTranslation(translations)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [details, setDetails] = useState<AbsencePolicyEditorDetail[]>([])
  const [draftDetail, setDraftDetail] = useState<AbsencePolicyDetailSettings>(defaultAbsencePolicyDetailSettings)
  const [expandedDetailIds, setExpandedDetailIds] = useState<number[]>([])
  const [extraObjectValue, setExtraObjectValue] = useState<JSONObject>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    const nextState = getAbsencePolicyEditorState(policy?.objectValue as AbsencePolicyObjectValue | undefined)
    setCode(policy?.code || '')
    setName(policy?.value || '')
    setDetails(nextState.details)
    setDraftDetail(defaultAbsencePolicyDetailSettings)
    setExpandedDetailIds([])
    setExtraObjectValue(nextState.extraObjectValue)
  }, [open, policy])

  const absenceTypeOptions = useMemo(
    () =>
      absenceTypes.map(absenceType => ({
        value: `AbsenceType:v1:${absenceType.code}`,
        label: `${absenceType.code} - ${absenceType.value || absenceType.code}`
      })),
    [absenceTypes]
  )

  const ruleTypeOptions = [
    { value: 'GENERAL_POLICY', label: t('policy-rule-type-general') },
    { value: 'SPECIFIC_POLICY', label: t('policy-rule-type-specific') }
  ]

  const ruleCategoryOptions = [
    { value: 'MIN_DURATION', label: t('policy-rule-category-min-duration') },
    { value: 'MAX_FREQUENCY', label: t('policy-rule-category-max-frequency') },
    { value: 'AUTO_APPROVAL', label: t('policy-rule-category-auto-approval') },
    { value: 'MAX_CONSECUTIVE', label: t('policy-rule-category-max-consecutive') },
    { value: 'ADVANCE_NOTICE', label: t('policy-rule-category-advance-notice') },
    { value: 'BLACKOUT_PERIOD', label: t('policy-rule-category-blackout-period') }
  ]

  const timeUnitOptions = [
    { value: 'DAYS', label: t('policy-time-unit-days') },
    { value: 'WEEKS', label: t('policy-time-unit-weeks') },
    { value: 'MONTHS', label: t('policy-time-unit-months') },
    { value: 'YEARS', label: t('policy-time-unit-years') },
    { value: 'TIMES', label: t('policy-time-unit-times') },
    { value: 'HOURS', label: t('policy-time-unit-hours') }
  ]

  const isSaveDisabled = isSaving || !code.trim() || !name.trim()

  useEffect(() => {
    const detailIds = details.map(detail => detail.id)
    setExpandedDetailIds(currentExpandedIds => currentExpandedIds.filter(detailId => detailIds.includes(detailId)))
  }, [details])

  const getNextDetailId = () => details.reduce((maxId, detail) => Math.max(maxId, detail.id), 0) + 1

  const updateDetailField = <K extends keyof AbsencePolicyDetailSettings>(
    detailId: number,
    field: K,
    value: AbsencePolicyDetailSettings[K]
  ) => {
    setDetails(currentDetails =>
      currentDetails.map(detail => {
        if (detail.id !== detailId) {
          return detail
        }

        if (field === 'policy_rule_type' && value === 'GENERAL_POLICY') {
          return {
            ...detail,
            settings: {
              ...detail.settings,
              policy_rule_type: value,
              absence_type_ref: ''
            }
          }
        }

        return {
          ...detail,
          settings: {
            ...detail.settings,
            [field]: value
          }
        }
      })
    )
  }

  const updateDraftDetailField = <K extends keyof AbsencePolicyDetailSettings>(
    field: K,
    value: AbsencePolicyDetailSettings[K]
  ) => {
    setDraftDetail(currentDetail => {
      if (field === 'policy_rule_type' && value === 'GENERAL_POLICY') {
        return {
          ...currentDetail,
          policy_rule_type: value,
          absence_type_ref: ''
        }
      }

      return {
        ...currentDetail,
        [field]: value
      }
    })
  }

  const resetDraftDetail = () => {
    setDraftDetail(defaultAbsencePolicyDetailSettings)
  }

  const addDetail = () => {
    const isSpecificPolicy = draftDetail.policy_rule_type === 'SPECIFIC_POLICY'
    if (isSpecificPolicy && !draftDetail.absence_type_ref) {
      return
    }

    setDetails(currentDetails => [...currentDetails, createPolicyDetail(getNextDetailId(), draftDetail)])
    resetDraftDetail()
  }

  const removeDetail = (detailId: number) => {
    setDetails(currentDetails => currentDetails.filter(detail => detail.id !== detailId))
  }

  const toggleDetailExpanded = (detailId: number) => {
    setExpandedDetailIds(currentExpandedIds =>
      currentExpandedIds.includes(detailId)
        ? currentExpandedIds.filter(currentId => currentId !== detailId)
        : [...currentExpandedIds, detailId]
    )
  }

  const usedAbsenceTypeRefs = details.map(detail => detail.settings.absence_type_ref).filter(Boolean)

  const addDetailAbsenceTypeOptions = absenceTypeOptions.filter(option => !usedAbsenceTypeRefs.includes(option.value))

  const isDraftReady =
    draftDetail.policy_rule_type === 'GENERAL_POLICY' ||
    (draftDetail.policy_rule_type === 'SPECIFIC_POLICY' && Boolean(draftDetail.absence_type_ref))

  const handleSubmit = async () => {
    if (isSaveDisabled) {
      return
    }

    try {
      setIsSaving(true)
      await onSave({
        code: code.trim(),
        name: name.trim(),
        objectValue: buildAbsencePolicyObjectValue(details, extraObjectValue)
      })
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : t('save-catalog-entry-error', { entity: t('absence-policy-entity-label') })
      console.error('Error saving absence policy:', message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent
        data-testid="absence-policy-modal"
        className="gba:flex gba:max-w-4xl gba:max-h-[85vh] gba:flex-col gba:overflow-hidden gba:p-0"
        onInteractOutside={event => event.preventDefault()}
      >
        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col">
          <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-4 gba:py-3">
            <DialogTitle>{policy ? t('policy-modal-edit-title') : t('policy-modal-create-title')}</DialogTitle>
            <DialogDescription>{t('policy-modal-description')}</DialogDescription>
          </DialogHeader>

          <div className="gba:flex-1 gba:space-y-3 gba:overflow-y-auto gba:px-4 gba:py-4">
            <Card data-testid="absence-policy-basic-section" className="gba:border gba:border-border gba:bg-muted/10">
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <CardTitle>{t('basic-information-section-title')}</CardTitle>
              </CardHeader>
              <CardContent className="gba:grid gba:gap-3 gba:p-4 gba:md:grid-cols-2">
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-policy-code">
                    {t('field-code-label')}
                    <span className="gba:text-destructive"> *</span>
                  </Label>
                  <Input
                    id="absence-policy-code"
                    value={code}
                    onChange={event => setCode(event.target.value)}
                    disabled={Boolean(policy?.id)}
                    data-testid="absence-policy-code-input"
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="absence-policy-name">
                    {t('field-name-label')}
                    <span className="gba:text-destructive"> *</span>
                  </Label>
                  <Input
                    id="absence-policy-name"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    data-testid="absence-policy-name-input"
                  />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="absence-policy-details-section" className="gba:border gba:border-border gba:bg-muted/10">
              <CardHeader className="gba:border-b gba:border-border gba:bg-background">
                <div className="gba:flex gba:flex-col gba:gap-4">
                  <CardTitle>{t('policy-details-section-title')}</CardTitle>
                  <div className="gba:grid gba:gap-3 gba:md:grid-cols-2">
                    <div className="gba:space-y-2">
                      <Label>{t('policy-field-rule-type-label')}</Label>
                      <Combobox
                        value={draftDetail.policy_rule_type}
                        onValueChange={value =>
                          updateDraftDetailField('policy_rule_type', String(value || 'SPECIFIC_POLICY'))
                        }
                        options={ruleTypeOptions}
                        placeholder={t('policy-field-rule-type-label')}
                        searchPlaceholder={t('policy-field-rule-type-label')}
                        emptyText={t('empty-catalog-entries', { entity: t('absence-policy-entity-label') })}
                        data-testid="absence-policy-new-detail-rule-type"
                      />
                    </div>
                    {draftDetail.policy_rule_type === 'SPECIFIC_POLICY' ? (
                      <div className="gba:space-y-2">
                        <Label>{t('policy-field-absence-type-ref-label')}</Label>
                        <Combobox
                          value={draftDetail.absence_type_ref}
                          onValueChange={value => updateDraftDetailField('absence_type_ref', String(value || ''))}
                          options={addDetailAbsenceTypeOptions}
                          placeholder={t('policy-field-absence-type-ref-label')}
                          searchPlaceholder={t('policy-field-absence-type-ref-label')}
                          emptyText={t('empty-absence-types')}
                          data-testid="absence-policy-new-detail-absence-type-ref"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="gba:space-y-4 gba:p-4">
                <p className="gba:text-xs gba:text-muted-foreground">{t('policy-details-section-description')}</p>
                {isDraftReady ? (
                  <div className="gba:space-y-3 gba:rounded-2xl gba:border gba:border-dashed gba:border-primary/30 gba:bg-background gba:p-4">
                    <div className="gba:flex gba:flex-col gba:gap-2">
                      <div className="gba:text-base gba:font-semibold">{t('policy-detail-new-title')}</div>
                      <div className="gba:text-sm gba:text-muted-foreground">
                        {draftDetail.policy_rule_type === 'SPECIFIC_POLICY'
                          ? absenceTypeOptions.find(option => option.value === draftDetail.absence_type_ref)?.label ||
                            t('policy-field-absence-type-ref-label')
                          : t('policy-rule-type-general')}
                      </div>
                    </div>

                    <div className="gba:space-y-2">
                      <Label htmlFor="absence-policy-new-description">{t('policy-field-description-label')}</Label>
                      <textarea
                        id="absence-policy-new-description"
                        value={draftDetail.description}
                        onChange={event => updateDraftDetailField('description', event.target.value)}
                        className="gba:min-h-24 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
                        data-testid="absence-policy-new-description"
                      />
                    </div>

                    <div className="gba:grid gba:gap-3 gba:md:grid-cols-2">
                      <div className="gba:space-y-2">
                        <Label>{t('policy-field-rule-category-label')}</Label>
                        <Combobox
                          value={draftDetail.policy_rule_category}
                          onValueChange={value =>
                            updateDraftDetailField('policy_rule_category', String(value || 'MIN_DURATION'))
                          }
                          options={ruleCategoryOptions}
                          placeholder={t('policy-field-rule-category-label')}
                          searchPlaceholder={t('policy-field-rule-category-label')}
                          emptyText={t('empty-catalog-entries', { entity: t('absence-policy-entity-label') })}
                          data-testid="absence-policy-new-rule-category"
                        />
                      </div>
                    </div>

                    <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-4">
                      <div className="gba:space-y-2">
                        <Label htmlFor="absence-policy-new-allowed-amount">
                          {t('policy-field-allowed-amount-label')}
                        </Label>
                        <Input
                          id="absence-policy-new-allowed-amount"
                          type="number"
                          value={draftDetail.allowed_amount}
                          onChange={event => updateDraftDetailField('allowed_amount', event.target.value)}
                          data-testid="absence-policy-new-allowed-amount"
                        />
                      </div>

                      <div className="gba:space-y-2">
                        <Label>{t('policy-field-allowed-amount-time-unit-label')}</Label>
                        <Combobox
                          value={draftDetail.allowed_amount_time_unit}
                          onValueChange={value =>
                            updateDraftDetailField('allowed_amount_time_unit', String(value || 'DAYS'))
                          }
                          options={timeUnitOptions}
                          placeholder={t('policy-field-allowed-amount-time-unit-label')}
                          searchPlaceholder={t('policy-field-allowed-amount-time-unit-label')}
                          emptyText={t('empty-catalog-entries', { entity: t('absence-policy-entity-label') })}
                          data-testid="absence-policy-new-allowed-unit"
                        />
                      </div>

                      <div className="gba:space-y-2">
                        <Label htmlFor="absence-policy-new-periods-amount">
                          {t('policy-field-periods-amount-label')}
                        </Label>
                        <Input
                          id="absence-policy-new-periods-amount"
                          type="number"
                          value={draftDetail.periods_amount}
                          onChange={event => updateDraftDetailField('periods_amount', event.target.value)}
                          data-testid="absence-policy-new-periods-amount"
                        />
                      </div>

                      <div className="gba:space-y-2">
                        <Label>{t('policy-field-periods-amount-time-unit-label')}</Label>
                        <Combobox
                          value={draftDetail.periods_amount_time_unit}
                          onValueChange={value =>
                            updateDraftDetailField('periods_amount_time_unit', String(value || 'MONTHS'))
                          }
                          options={timeUnitOptions}
                          placeholder={t('policy-field-periods-amount-time-unit-label')}
                          searchPlaceholder={t('policy-field-periods-amount-time-unit-label')}
                          emptyText={t('empty-catalog-entries', { entity: t('absence-policy-entity-label') })}
                          data-testid="absence-policy-new-periods-unit"
                        />
                      </div>
                    </div>

                    <div className="gba:flex gba:justify-end gba:gap-2">
                      <Button type="button" variant="ghost" onClick={resetDraftDetail}>
                        {t('cancel-button')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addDetail}
                        data-testid="absence-policy-add-detail-button"
                      >
                        {t('policy-add-detail-button')}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {details.length === 0 && !isDraftReady ? (
                  <div className="gba:rounded-2xl gba:border gba:border-dashed gba:border-border gba:bg-background gba:p-6 gba:text-sm gba:text-muted-foreground">
                    {t('policy-empty-details')}
                  </div>
                ) : null}

                {details.map((detail, index) => {
                  const availableAbsenceTypeOptions = absenceTypeOptions.filter(
                    option =>
                      option.value === detail.settings.absence_type_ref ||
                      !details.some(
                        otherDetail =>
                          otherDetail.id !== detail.id && otherDetail.settings.absence_type_ref === option.value
                      )
                  )
                  const isExpanded = expandedDetailIds.includes(detail.id)
                  const detailSubtitle =
                    detail.settings.policy_rule_type === 'SPECIFIC_POLICY'
                      ? absenceTypeOptions.find(option => option.value === detail.settings.absence_type_ref)?.label ||
                        t('policy-field-absence-type-ref-label')
                      : t('policy-rule-type-general')

                  return (
                    <div
                      key={`absence-policy-detail-${detail.id}`}
                      className="gba:space-y-3 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4"
                      data-testid={`absence-policy-detail-${index + 1}`}
                    >
                      <div className="gba:flex gba:flex-col gba:gap-3 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between">
                        <div className="gba:min-w-0 gba:flex-1">
                          <div className="gba:text-sm gba:font-medium">
                            {t('policy-detail-title', { index: String(index + 1) })}
                          </div>
                          <div className="gba:truncate gba:text-sm gba:text-muted-foreground">{detailSubtitle}</div>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeDetail(detail.id)}
                            data-testid={`absence-policy-remove-detail-${index + 1}`}
                          >
                            {t('remove-button')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => toggleDetailExpanded(detail.id)}
                            data-testid={`absence-policy-toggle-detail-${index + 1}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="gba:mr-1 gba:h-4 gba:w-4" />
                            ) : (
                              <ChevronRight className="gba:mr-1 gba:h-4 gba:w-4" />
                            )}
                            {isExpanded ? t('collapse-button') : t('expand-button')}
                          </Button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="gba:space-y-3">
                          <div className="gba:space-y-2">
                            <Label htmlFor={`absence-policy-description-${detail.id}`}>
                              {t('policy-field-description-label')}
                            </Label>
                            <textarea
                              id={`absence-policy-description-${detail.id}`}
                              value={detail.settings.description}
                              onChange={event => updateDetailField(detail.id, 'description', event.target.value)}
                              className="gba:min-h-24 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
                              data-testid={`absence-policy-description-${index + 1}`}
                            />
                          </div>

                          <div className="gba:grid gba:gap-3 gba:md:grid-cols-2">
                            <div className="gba:space-y-2">
                              <Label>{t('policy-field-rule-type-label')}</Label>
                              <Combobox
                                value={detail.settings.policy_rule_type}
                                onValueChange={value =>
                                  updateDetailField(detail.id, 'policy_rule_type', String(value || 'GENERAL_POLICY'))
                                }
                                options={ruleTypeOptions}
                                placeholder={t('policy-field-rule-type-label')}
                                searchPlaceholder={t('policy-field-rule-type-label')}
                                emptyText={t('empty-catalog-entries', { entity: t('absence-policy-entity-label') })}
                                data-testid={`absence-policy-rule-type-${index + 1}`}
                              />
                            </div>

                            <div className="gba:space-y-2">
                              <Label>{t('policy-field-rule-category-label')}</Label>
                              <Combobox
                                value={detail.settings.policy_rule_category}
                                onValueChange={value =>
                                  updateDetailField(detail.id, 'policy_rule_category', String(value || 'MIN_DURATION'))
                                }
                                options={ruleCategoryOptions}
                                placeholder={t('policy-field-rule-category-label')}
                                searchPlaceholder={t('policy-field-rule-category-label')}
                                emptyText={t('empty-catalog-entries', { entity: t('absence-policy-entity-label') })}
                                data-testid={`absence-policy-rule-category-${index + 1}`}
                              />
                            </div>

                            {detail.settings.policy_rule_type === 'SPECIFIC_POLICY' ? (
                              <div className="gba:space-y-2 gba:md:col-span-2">
                                <Label>{t('policy-field-absence-type-ref-label')}</Label>
                                <Combobox
                                  value={detail.settings.absence_type_ref}
                                  onValueChange={value =>
                                    updateDetailField(detail.id, 'absence_type_ref', String(value || ''))
                                  }
                                  options={availableAbsenceTypeOptions}
                                  placeholder={t('policy-field-absence-type-ref-label')}
                                  searchPlaceholder={t('policy-field-absence-type-ref-label')}
                                  emptyText={t('empty-absence-types')}
                                  data-testid={`absence-policy-absence-type-ref-${index + 1}`}
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-4">
                            <div className="gba:space-y-2">
                              <Label htmlFor={`absence-policy-allowed-amount-${detail.id}`}>
                                {t('policy-field-allowed-amount-label')}
                              </Label>
                              <Input
                                id={`absence-policy-allowed-amount-${detail.id}`}
                                type="number"
                                value={detail.settings.allowed_amount}
                                onChange={event => updateDetailField(detail.id, 'allowed_amount', event.target.value)}
                                data-testid={`absence-policy-allowed-amount-${index + 1}`}
                              />
                            </div>

                            <div className="gba:space-y-2">
                              <Label>{t('policy-field-allowed-amount-time-unit-label')}</Label>
                              <Combobox
                                value={detail.settings.allowed_amount_time_unit}
                                onValueChange={value =>
                                  updateDetailField(detail.id, 'allowed_amount_time_unit', String(value || 'DAYS'))
                                }
                                options={timeUnitOptions}
                                placeholder={t('policy-field-allowed-amount-time-unit-label')}
                                searchPlaceholder={t('policy-field-allowed-amount-time-unit-label')}
                                emptyText={t('empty-catalog-entries', { entity: t('absence-policy-entity-label') })}
                                data-testid={`absence-policy-allowed-unit-${index + 1}`}
                              />
                            </div>

                            <div className="gba:space-y-2">
                              <Label htmlFor={`absence-policy-periods-amount-${detail.id}`}>
                                {t('policy-field-periods-amount-label')}
                              </Label>
                              <Input
                                id={`absence-policy-periods-amount-${detail.id}`}
                                type="number"
                                value={detail.settings.periods_amount}
                                onChange={event => updateDetailField(detail.id, 'periods_amount', event.target.value)}
                                data-testid={`absence-policy-periods-amount-${index + 1}`}
                              />
                            </div>

                            <div className="gba:space-y-2">
                              <Label>{t('policy-field-periods-amount-time-unit-label')}</Label>
                              <Combobox
                                value={detail.settings.periods_amount_time_unit}
                                onValueChange={value =>
                                  updateDetailField(detail.id, 'periods_amount_time_unit', String(value || 'MONTHS'))
                                }
                                options={timeUnitOptions}
                                placeholder={t('policy-field-periods-amount-time-unit-label')}
                                searchPlaceholder={t('policy-field-periods-amount-time-unit-label')}
                                emptyText={t('empty-catalog-entries', { entity: t('absence-policy-entity-label') })}
                                data-testid={`absence-policy-periods-unit-${index + 1}`}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <div className="gba:flex gba:shrink-0 gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:bg-background gba:px-4 gba:py-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              data-testid="absence-policy-cancel-button"
            >
              {t('cancel-button')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              data-testid="absence-policy-save-button"
            >
              {isSaving ? t('saving-button') : t('save-button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
