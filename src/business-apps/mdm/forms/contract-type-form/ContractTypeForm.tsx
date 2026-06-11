import React, { useEffect, useMemo, useState } from 'react'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation,
  Switch
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  CONTRACT_TYPE_CATALOG,
  CONTRACT_TYPE_VERSION,
  EMPLOYMENT_TYPE_CATALOG,
  EMPLOYMENT_TYPE_VERSION
} from '@/business-apps/mdm/apps/employment-data/types'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import { ContractTypeTable } from '../../apps/employment-data/components/tabs/ContractTypesTab'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import translations from './_i18n'
import {
  getContractTypeObjectValue,
  getContractTypePayrollRelevant,
  getContractTypeTimeRelevant,
  isContractTypeMarkedDeleted,
  mergeCatalogEntryForPut,
  parseContractTypeJson,
  serializeContractTypeAdditionalJson,
  upsertCatalogTranslationForLocale
} from '@/business-apps/mdm/apps/employment-data/utils/catalogEntryMetadata'
import type { CatalogEntry } from '@/common/types/CatalogTypes'

const noLeadingWhitespace = (value: string) => value === value.trimStart()

const buildProbationRefinement =
  (unitRequiredMsg: string) => (data: { probationValue?: string; probationUnit?: string }, ctx: z.RefinementCtx) => {
    const hasValue = data.probationValue && data.probationValue.trim() !== ''
    if (hasValue) {
      const validUnits: ('day' | 'week' | 'month')[] = ['day', 'week', 'month']
      const hasValidUnit =
        data.probationUnit !== undefined &&
        data.probationUnit !== '' &&
        validUnits.includes(data.probationUnit as 'day' | 'week' | 'month')
      if (!hasValidUnit) {
        ctx.addIssue({ code: 'custom', message: unitRequiredMsg, path: ['probationUnit'] })
      }
    }
  }

const buildCommonFields = (msgs: {
  nameRequired: string
  nameTooLong: string
  descriptionTooLong: string
  probationValueInvalid: string
  noLeadingWhitespace: string
}) => ({
  value: z
    .string({ message: msgs.nameRequired })
    .min(1, msgs.nameRequired)
    .max(64, msgs.nameTooLong)
    .refine(noLeadingWhitespace, msgs.noLeadingWhitespace),
  description: z
    .string()
    .max(100, msgs.descriptionTooLong)
    .refine(val => !val || noLeadingWhitespace(val), msgs.noLeadingWhitespace)
    .optional(),
  parentEntryId: z.string().optional(),
  probationValue: z
    .string()
    .refine(val => !val || /^[1-9]\d{0,3}$/.test(val), msgs.probationValueInvalid)
    .optional(),
  probationUnit: z.enum(['day', 'week', 'month', '']).optional(),
  payrollRelevant: z.boolean().optional(),
  timeRelevant: z.boolean().optional()
})

const buildContractTypeFormSchema = (msgs: {
  nameRequired: string
  nameTooLong: string
  descriptionTooLong: string
  probationValueInvalid: string
  probationUnitRequired: string
  noLeadingWhitespace: string
}) =>
  z
    .object({
      ...buildCommonFields(msgs),
      code: z.string().optional()
    })
    .superRefine(buildProbationRefinement(msgs.probationUnitRequired))

const buildCreateContractTypeFormSchema = (msgs: {
  nameRequired: string
  nameTooLong: string
  codeRequired: string
  codeTooLong: string
  descriptionTooLong: string
  probationValueInvalid: string
  probationUnitRequired: string
  noLeadingWhitespace: string
}) =>
  z
    .object({
      ...buildCommonFields(msgs),
      code: z
        .string({ message: msgs.codeRequired })
        .min(1, msgs.codeRequired)
        .max(10, msgs.codeTooLong)
        .refine(noLeadingWhitespace, msgs.noLeadingWhitespace)
    })
    .superRefine(buildProbationRefinement(msgs.probationUnitRequired))

export interface ContractTypeFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  contractType?: ContractTypeTable
  onCancel?: () => void
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  isDrawerActive?: boolean
  usedCodes?: string[]
}

const ProbationPeriodFields: React.FC<{ dataTestId: string; t: (key: string) => string }> = ({ dataTestId, t }) => {
  const form = useFormContext()
  const probationUnitError = form.formState.errors.probationUnit?.message as string | undefined

  const unitOptions = useMemo(
    () => [
      { value: 'day', label: t('probation-unit-day') },
      { value: 'week', label: t('probation-unit-week') },
      { value: 'month', label: t('probation-unit-month') }
    ],
    [t]
  )

  return (
    <div className="gba:space-y-2">
      <FormLabel>{t('field-probation-period-label')}</FormLabel>
      <div className="gba:flex gba:gap-3">
        <FormField
          name="probationValue"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t('field-probation-value-placeholder')}
                  {...field}
                  data-testid={`${dataTestId}-probation-value-input`}
                  onChange={e => {
                    const value = e.target.value
                    if (value === '' || /^[1-9]\d{0,3}$/.test(value)) {
                      field.onChange(value)
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="probationUnit"
          render={({ field, fieldState }) => (
            <FormItem className="gba:flex-1">
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <SelectTrigger
                    data-testid={`${dataTestId}-probation-unit-select`}
                    className={fieldState.error ? 'gba:border-destructive' : ''}
                  >
                    <SelectValue placeholder={t('field-probation-unit-placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      {probationUnitError && (
        <p className="gba:text-sm gba:text-destructive" role="alert">
          {probationUnitError}
        </p>
      )}
    </div>
  )
}

const SwitchToggleField: React.FC<{
  name: string
  labelKey: string
  descriptionKey: string
  dataTestId: string
  t: (key: string) => string
}> = ({ name, labelKey, descriptionKey, dataTestId, t }) => (
  <FormField
    name={name}
    render={({ field }) => (
      <FormItem className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:rounded-lg gba:border gba:p-4">
        <div className="gba:space-y-0.5">
          <FormLabel className="gba:text-base">{t(labelKey)}</FormLabel>
          <p className="gba:text-sm gba:text-muted-foreground">{t(descriptionKey)}</p>
        </div>
        <FormControl>
          <Switch checked={field.value === true} onCheckedChange={field.onChange} data-testid={dataTestId} />
        </FormControl>
      </FormItem>
    )}
  />
)

type EmploymentTypeOption = {
  id: string
  label: string
}

const getLocalizedCatalogValue = (entry: CatalogEntry, localeCode: string) => {
  const translation = (entry.translations || []).find(
    translation => translation.localeCode?.toLowerCase() === localeCode.toLowerCase()
  )

  return translation?.value?.trim() || entry.value || entry.code || entry.id
}

const ContractTypeForm: React.FC<ContractTypeFormProps> = ({
  prefixDataTestId,
  contractType,
  onCancel,
  childAddButton,
  refetch,
  accessToken,
  isDrawerActive,
  usedCodes = []
}) => {
  const { t } = useTranslation(translations)
  const dataTestId = formatDataTestId(prefixDataTestId, 'ContractTypeForm')
  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = useUserLocale() ?? 'en-US'
  const catalogLocale = getCurrentActiveUserLocale() || userLocale
  const { codeError, setCodeError, validateCode } = useCodeError(usedCodes)
  const [employmentTypeOptions, setEmploymentTypeOptions] = useState<EmploymentTypeOption[]>([])
  const [employmentTypeOptionsLoading, setEmploymentTypeOptionsLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadEmploymentTypeOptions = async () => {
      setEmploymentTypeOptionsLoading(true)

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: EMPLOYMENT_TYPE_CATALOG,
            version: EMPLOYMENT_TYPE_VERSION
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeTranslations: true,
            localeCode: catalogLocale
          }
        )

        if (!isMounted) return

        const options = (response.data || [])
          .filter(entry => entry.isDeleted !== true)
          .map(entry => ({
            id: entry.id,
            label: getLocalizedCatalogValue(entry, catalogLocale)
          }))

        setEmploymentTypeOptions(options)
      } catch {
        if (isMounted) {
          setEmploymentTypeOptions([])
        }
      } finally {
        if (isMounted) {
          setEmploymentTypeOptionsLoading(false)
        }
      }
    }

    loadEmploymentTypeOptions()

    return () => {
      isMounted = false
    }
  }, [catalogClient, catalogLocale])

  const validationMsgs = useMemo(
    () => ({
      nameRequired: t('validation-name-required'),
      nameTooLong: t('validation-name-too-long'),
      codeRequired: t('validation-code-required'),
      codeTooLong: t('validation-code-too-long'),
      descriptionTooLong: t('validation-description-too-long'),
      probationValueInvalid: t('validation-probation-value-invalid'),
      probationUnitRequired: t('validation-probation-unit-required'),
      noLeadingWhitespace: t('validation-no-leading-whitespace')
    }),
    [t]
  )

  const contractTypeFormSchema = useMemo(() => buildContractTypeFormSchema(validationMsgs), [validationMsgs])

  const createContractTypeFormSchema = useMemo(
    () => buildCreateContractTypeFormSchema(validationMsgs),
    [validationMsgs]
  )

  const activeSchema = contractType ? contractTypeFormSchema : createContractTypeFormSchema

  const handleSubmit = async (data: any) => {
    const trimmedData = {
      ...data,
      value: data.value?.trim() || '',
      code: data.code?.trim() || '',
      description: data.description?.trim() || '',
      parentEntryId: data.parentEntryId?.trim() || ''
    }

    const codeForSave = contractType?.code?.trim() || trimmedData.code

    if (!validateCode(trimmedData.code) && !contractType) {
      return
    }

    const hasProbationValue = trimmedData.probationValue && trimmedData.probationValue.trim() !== ''
    const hasProbationUnit = trimmedData.probationUnit && trimmedData.probationUnit.trim() !== ''

    const additionalJson = serializeContractTypeAdditionalJson({
      value: hasProbationValue && hasProbationUnit ? Number(trimmedData.probationValue) : null,
      unit: hasProbationValue && hasProbationUnit ? String(trimmedData.probationUnit) : ''
    })

    if (contractType) {
      const fresh = await catalogClient.getCatalogEntryById(contractType.id)
      const translations = upsertCatalogTranslationForLocale(fresh.translations, userLocale, {
        value: trimmedData.value,
        additionalValue1: trimmedData.description
      })
      const payload = mergeCatalogEntryForPut(fresh, {
        value: trimmedData.value,
        additionalValue1: trimmedData.description,
        additionalValue2: additionalJson,
        objectValue: {
          ...getContractTypeObjectValue(fresh),
          payroll_relevant: trimmedData.payrollRelevant === true,
          time_relevant: trimmedData.timeRelevant === true
        },
        isDeleted: isContractTypeMarkedDeleted(fresh),
        translations
      })
      if (trimmedData.parentEntryId) {
        payload.parentEntryId = trimmedData.parentEntryId
      }
      await catalogClient.updateCatalogEntry(
        CONTRACT_TYPE_CATALOG,
        CONTRACT_TYPE_VERSION,
        contractType.id ?? '',
        payload as Partial<Omit<CatalogEntry, 'id' | 'type'>>
      )
    } else {
      await catalogClient.createCatalogEntry(CONTRACT_TYPE_CATALOG, CONTRACT_TYPE_VERSION, {
        parentEntryId: trimmedData.parentEntryId || undefined,
        code: codeForSave,
        value: trimmedData.value,
        additionalValue1: trimmedData.description,
        additionalValue2: additionalJson,
        objectValue: {
          payroll_relevant: trimmedData.payrollRelevant === true,
          time_relevant: trimmedData.timeRelevant === true
        },
        isDeleted: false,
        translations: []
      } as Omit<CatalogEntry, 'id' | 'type'>)
    }

    refetch()
  }

  const existingParsed = useMemo(
    () => parseContractTypeJson(contractType?.probationPeriod),
    [contractType?.probationPeriod]
  )

  const defaultValues = useMemo(
    () => ({
      value: contractType?.value || '',
      code: contractType?.code || '',
      description: contractType?.description || '',
      parentEntryId: contractType?.parentEntryId || '',
      probationValue: existingParsed.value != null && existingParsed.unit ? String(existingParsed.value) : '',
      probationUnit: existingParsed.unit || undefined,
      payrollRelevant: contractType
        ? getContractTypePayrollRelevant({
            objectValue: contractType.objectValue
          })
        : false,
      timeRelevant: contractType
        ? getContractTypeTimeRelevant({
            objectValue: contractType.objectValue
          })
        : false
    }),
    [contractType, existingParsed]
  )

  const resolver = useMemo(() => zodResolver(activeSchema) as any, [activeSchema])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={contractType ? t('form-title-edit') : t('form-title-create')}
      description={t('form-description')}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!contractType}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      isValid={!codeError}
      setCodeError={setCodeError}
      resolver={resolver}
      schema={activeSchema}
      validateBeforeSubmit={false}
    >
      <FormField
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('field-name-label')}</FormLabel>
            <FormControl>
              <Input placeholder={t('field-name-placeholder')} {...field} data-testid={`${dataTestId}-name-input`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!contractType && (
        <FormField
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('field-code-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('field-code-placeholder')}
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    validateCode(e.target.value)
                  }}
                  data-testid={`${dataTestId}-code-input`}
                />
              </FormControl>
              <FormMessage>{codeError}</FormMessage>
            </FormItem>
          )}
        />
      )}

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('field-description-label')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('field-description-placeholder')}
                {...field}
                data-testid={`${dataTestId}-description-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="parentEntryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('field-employment-type-label')}</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || undefined}
              disabled={employmentTypeOptionsLoading}
            >
              <FormControl>
                <SelectTrigger className="gba:w-full" data-testid={`${dataTestId}-employment-type-select`}>
                  <SelectValue
                    placeholder={employmentTypeOptionsLoading ? t('loading') : t('field-employment-type-placeholder')}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {employmentTypeOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <ProbationPeriodFields dataTestId={dataTestId} t={t} />

      <SwitchToggleField
        name="payrollRelevant"
        labelKey="field-payroll-relevant-label"
        descriptionKey="field-payroll-relevant-description"
        dataTestId={`${dataTestId}-payroll-relevant`}
        t={t}
      />
      <SwitchToggleField
        name="timeRelevant"
        labelKey="field-time-relevant-label"
        descriptionKey="field-time-relevant-description"
        dataTestId={`${dataTestId}-time-relevant`}
        t={t}
      />
    </FormWrapperModal>
  )
}

export default ContractTypeForm
