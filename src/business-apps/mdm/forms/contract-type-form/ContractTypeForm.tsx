import React, { useMemo } from 'react'
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
  CONTRACT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useContractTypes'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCodeError } from '@/business-apps/mdm/hooks/useCodeError'
import { ContractTypeTable } from '../../apps/employment-data/components/tabs/ContractTypesTab'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import translations from './_i18n'
import {
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
      value: z
        .string({ message: msgs.nameRequired })
        .min(1, msgs.nameRequired)
        .max(64, msgs.nameTooLong)
        .refine(noLeadingWhitespace, msgs.noLeadingWhitespace),
      code: z.string().optional(),
      description: z
        .string()
        .max(100, msgs.descriptionTooLong)
        .refine(val => !val || noLeadingWhitespace(val), msgs.noLeadingWhitespace)
        .optional(),
      probationValue: z
        .string()
        .refine(val => !val || /^[1-9]\d{0,3}$/.test(val), msgs.probationValueInvalid)
        .optional(),
      probationUnit: z.enum(['day', 'week', 'month', '']).optional(),
      payrollRelevant: z.boolean().optional()
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
      value: z
        .string({ message: msgs.nameRequired })
        .min(1, msgs.nameRequired)
        .max(64, msgs.nameTooLong)
        .refine(noLeadingWhitespace, msgs.noLeadingWhitespace),
      code: z
        .string({ message: msgs.codeRequired })
        .min(1, msgs.codeRequired)
        .max(10, msgs.codeTooLong)
        .refine(noLeadingWhitespace, msgs.noLeadingWhitespace),
      description: z
        .string()
        .max(100, msgs.descriptionTooLong)
        .refine(val => !val || noLeadingWhitespace(val), msgs.noLeadingWhitespace)
        .optional(),
      probationValue: z
        .string()
        .refine(val => !val || /^[1-9]\d{0,3}$/.test(val), msgs.probationValueInvalid)
        .optional(),
      probationUnit: z.enum(['day', 'week', 'month', '']).optional(),
      payrollRelevant: z.boolean().optional()
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
  const { codeError, setCodeError, validateCode } = useCodeError(usedCodes)

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
      description: data.description?.trim() || ''
    }

    const codeForSave = contractType?.code?.trim() || trimmedData.code

    if (!validateCode(trimmedData.code) && !contractType) {
      return
    }

    const hasProbationValue = trimmedData.probationValue && trimmedData.probationValue.trim() !== ''
    const hasProbationUnit = trimmedData.probationUnit && trimmedData.probationUnit.trim() !== ''

    const existingJson = contractType ? parseContractTypeJson(contractType.probationPeriod) : {}

    const additionalJson = serializeContractTypeAdditionalJson({
      value: hasProbationValue && hasProbationUnit ? Number(trimmedData.probationValue) : null,
      unit: hasProbationValue && hasProbationUnit ? String(trimmedData.probationUnit) : '',
      payroll_relevant: trimmedData.payrollRelevant === true,
      is_deleted: existingJson.is_deleted === true
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
        translations
      })
      await catalogClient.updateCatalogEntry(
        CONTRACT_TYPE_CATALOG,
        CONTRACT_TYPE_VERSION,
        contractType.id ?? '',
        payload as Partial<Omit<CatalogEntry, 'id' | 'type'>>
      )
    } else {
      await catalogClient.createCatalogEntry(CONTRACT_TYPE_CATALOG, CONTRACT_TYPE_VERSION, {
        code: codeForSave,
        value: trimmedData.value,
        additionalValue1: trimmedData.description,
        additionalValue2: additionalJson,
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
      probationValue: existingParsed.value != null && existingParsed.unit ? String(existingParsed.value) : '',
      probationUnit: existingParsed.unit || undefined,
      payrollRelevant: existingParsed.payroll_relevant === true
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

      <ProbationPeriodFields dataTestId={dataTestId} t={t} />

      <FormField
        name="payrollRelevant"
        render={({ field }) => (
          <FormItem className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:rounded-lg gba:border gba:p-4">
            <div className="gba:space-y-0.5">
              <FormLabel className="gba:text-base">Payroll relevant</FormLabel>
              <p className="gba:text-sm gba:text-muted-foreground">
                When enabled, this contract type is treated as relevant for payroll processes.
              </p>
            </div>
            <FormControl>
              <Switch
                checked={field.value === true}
                onCheckedChange={field.onChange}
                data-testid={`${dataTestId}-payroll-relevant`}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default ContractTypeForm
