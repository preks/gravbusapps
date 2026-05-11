import React, { useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useInvestmentCompanies } from '@/common/data/investment/hooks/useInvestmentCompanies'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { investmentCompanyOwnershipFormFields } from '@/common/data/investment/types/investmentCompanyAssociationTypes'
import {
  Combobox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useTranslation
} from '@newwork/nw-design-system'
import translations from './_i18n'

const PREFIX_DATA_TEST_ID = 'company-ownership-popup'

const createOwnershipSchema = (t: (key: string) => string) =>
  z
    .object({
      id: z.string().optional(),
      version: z.number().optional(),
      investmentCompanyId: z.string().min(1, t('validation-company-required')),
      ownerInvestmentCompanyId: z.string().min(1, t('validation-owner-required')),
      percentage: z.preprocess(
        value => (value === '' || value === null || value === undefined ? undefined : Number(value)),
        z.number().min(0, t('validation-percentage-min')).max(100, t('validation-percentage-max')).optional()
      )
    })
    .refine(values => values.investmentCompanyId !== values.ownerInvestmentCompanyId, {
      message: t('validation-owner-different'),
      path: ['ownerInvestmentCompanyId']
    })

type OwnershipFormData = z.infer<ReturnType<typeof createOwnershipSchema>>
type OwnershipAdditionalData = {
  investmentCompanyOwnership?: Partial<OwnershipFormData>
  ownership?: Partial<OwnershipFormData>
  investmentCompanyId?: string
  psi_taskPayload?: {
    psi_initialParameters?: {
      investmentCompanyOwnership?: Partial<OwnershipFormData>
      investmentCompanyId?: string
    }
  }
}

export interface CompanyOwnershipPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<OwnershipFormData>
}

const CompanyOwnershipPopup: React.FC<CompanyOwnershipPopupProps> = ({ initialValues, ...context }) => {
  const { t } = useTranslation(translations)
  const ownershipSchema = useMemo(() => createOwnershipSchema(t), [t])
  const { accessToken, additionalData } = context
  const ownershipAdditionalData: OwnershipAdditionalData | undefined = additionalData
  const [companySearch, setCompanySearch] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')

  const seedOwnership =
    ownershipAdditionalData?.investmentCompanyOwnership ||
    ownershipAdditionalData?.ownership ||
    ownershipAdditionalData?.psi_taskPayload?.psi_initialParameters?.investmentCompanyOwnership
  const preselectedCompanyId =
    ownershipAdditionalData?.investmentCompanyId ||
    ownershipAdditionalData?.psi_taskPayload?.psi_initialParameters?.investmentCompanyId

  const defaultValues = useMemo<OwnershipFormData>(
    () => ({
      id: initialValues?.id || seedOwnership?.id,
      version: initialValues?.version ?? seedOwnership?.version,
      investmentCompanyId:
        initialValues?.investmentCompanyId || preselectedCompanyId || seedOwnership?.investmentCompanyId || '',
      ownerInvestmentCompanyId:
        initialValues?.ownerInvestmentCompanyId || seedOwnership?.ownerInvestmentCompanyId || '',
      percentage: initialValues?.percentage ?? seedOwnership?.percentage
    }),
    [initialValues, preselectedCompanyId, seedOwnership]
  )

  const form = useForm<OwnershipFormData>({
    resolver: zodResolver(ownershipSchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const {
    companies,
    loading: companiesLoading,
    error: companiesError
  } = useInvestmentCompanies(accessToken || '', { limit: 100, search: companySearch || undefined })
  const {
    companies: ownerCompanies,
    loading: ownersLoading,
    error: ownersError
  } = useInvestmentCompanies(accessToken || '', { limit: 100, search: ownerSearch || undefined })

  const companyOptions = useMemo(
    () => companies.map(company => ({ value: company.id, label: company.name || company.code || company.id })),
    [companies]
  )
  const ownerOptions = useMemo(
    () =>
      ownerCompanies.map(company => ({
        value: company.id,
        label: company.name || company.code || company.id
      })),
    [ownerCompanies]
  )

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) errors.push({ type: 'accessToken' })
  if (companiesError) errors.push({ error: companiesError, context: t('error-load-companies') })
  if (ownersError) errors.push({ error: ownersError, context: t('error-load-owner-companies') })
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId={PREFIX_DATA_TEST_ID} />
  }

  const handleSubmit = async (data: OwnershipFormData) => {
    const ownership = buildPayload(
      {
        id: data.id,
        version: data.version,
        investmentCompanyId: data.investmentCompanyId,
        ownerInvestmentCompanyId: data.ownerInvestmentCompanyId,
        percentage: data.percentage
      },
      investmentCompanyOwnershipFormFields
    )

    return {
      investmentCompanyOwnerships: [ownership],
      changeMode: data.id ? 'UPDATE' : 'INSERT'
    }
  }

  return (
    <AppActionForm
      processType={defaultValues.id ? 'update' : 'create'}
      onSubmit={handleSubmit}
      formData={form.getValues()}
      form={form}
      schema={ownershipSchema}
      isSubmitDisabled={companiesLoading || ownersLoading}
      submitButtonText={defaultValues.id ? t('update-button') : t('create-button')}
      data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'Form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(PREFIX_DATA_TEST_ID, 'Container')}>
        <FormField
          name="investmentCompanyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('company-label')}</FormLabel>
              <FormControl>
                <Combobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  onSearch={setCompanySearch}
                  options={companyOptions}
                  loading={companiesLoading}
                  placeholder={t('company-placeholder')}
                  searchPlaceholder={t('company-search-placeholder')}
                  emptyText={t('company-empty')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="ownerInvestmentCompanyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('owner-label')}</FormLabel>
              <FormControl>
                <Combobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  onSearch={setOwnerSearch}
                  options={ownerOptions}
                  loading={ownersLoading}
                  placeholder={t('owner-placeholder')}
                  searchPlaceholder={t('owner-search-placeholder')}
                  emptyText={t('owner-empty')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('percentage-label')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={field.value ?? ''}
                  onChange={event => field.onChange(event.target.value)}
                  placeholder={t('percentage-placeholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </AppActionForm>
  )
}

export default CompanyOwnershipPopup
export { CompanyOwnershipPopup }
