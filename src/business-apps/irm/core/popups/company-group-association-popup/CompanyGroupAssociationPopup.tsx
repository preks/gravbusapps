import React, { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useInvestmentCompanies } from '@/common/data/investment/hooks/useInvestmentCompanies'
import { useInvestmentCompany } from '@/common/data/investment/hooks/useInvestmentCompany'
import { useInvestmentCompanyGroups } from '@/common/data/investment/hooks/useInvestmentCompanyGroups'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { investmentCompanyGroupAssociationFormFields } from '@/common/data/investment/types/investmentCompanyAssociationTypes'
import {
  Combobox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useTranslation
} from '@newwork/nw-design-system'
import translations from './_i18n'

const PREFIX_DATA_TEST_ID = 'company-group-association-popup'

const createAssociationSchema = (t: (key: string) => string) =>
  z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    investmentCompanyId: z.string().trim().min(1, t('validation-company-required')),
    investmentCompanyGroupId: z.string().trim().min(1, t('validation-group-required'))
  })

type AssociationFormData = z.infer<ReturnType<typeof createAssociationSchema>>
type AssociationAdditionalData = {
  investmentCompanyGroupAssociation?: Partial<AssociationFormData>
  association?: Partial<AssociationFormData>
  investmentCompanyId?: string
  investmentCompanyGroupId?: string
  groupId?: string
  externalContextData?: {
    investmentCompanyId?: string
    investmentCompanyGroupId?: string
    groupId?: string
  }
  psi_initialParameters?: {
    investmentCompanyGroupAssociation?: Partial<AssociationFormData>
    investmentCompanyId?: string
    investmentCompanyGroupId?: string
    groupId?: string
  }
  psi_taskPayload?: {
    psi_initialParameters?: {
      investmentCompanyGroupAssociation?: Partial<AssociationFormData>
      investmentCompanyId?: string
      investmentCompanyGroupId?: string
      groupId?: string
    }
  }
}

export interface CompanyGroupAssociationPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<AssociationFormData>
}

const CompanyGroupAssociationPopup: React.FC<CompanyGroupAssociationPopupProps> = ({ initialValues, ...context }) => {
  const { t } = useTranslation(translations)
  const associationSchema = useMemo(() => createAssociationSchema(t), [t])
  const { accessToken, additionalData } = context
  const associationAdditionalData: AssociationAdditionalData | undefined = additionalData
  const [companySearch, setCompanySearch] = useState('')
  const [groupSearch, setGroupSearch] = useState('')
  const externalContextData = associationAdditionalData?.externalContextData
  const initialParameters = associationAdditionalData?.psi_initialParameters
  const taskInitialParameters = associationAdditionalData?.psi_taskPayload?.psi_initialParameters

  const seedAssociation =
    associationAdditionalData?.investmentCompanyGroupAssociation ||
    associationAdditionalData?.association ||
    initialParameters?.investmentCompanyGroupAssociation ||
    taskInitialParameters?.investmentCompanyGroupAssociation
  const preselectedCompanyId =
    associationAdditionalData?.investmentCompanyId ||
    externalContextData?.investmentCompanyId ||
    initialParameters?.investmentCompanyId ||
    taskInitialParameters?.investmentCompanyId
  const preselectedGroupId =
    associationAdditionalData?.investmentCompanyGroupId ||
    externalContextData?.investmentCompanyGroupId ||
    initialParameters?.investmentCompanyGroupId ||
    taskInitialParameters?.investmentCompanyGroupId ||
    associationAdditionalData?.groupId ||
    externalContextData?.groupId ||
    initialParameters?.groupId ||
    taskInitialParameters?.groupId

  const defaultValues = useMemo<AssociationFormData>(
    () => ({
      id: initialValues?.id || seedAssociation?.id,
      version: initialValues?.version ?? seedAssociation?.version,
      investmentCompanyId:
        initialValues?.investmentCompanyId || seedAssociation?.investmentCompanyId || preselectedCompanyId || '',
      investmentCompanyGroupId:
        initialValues?.investmentCompanyGroupId || seedAssociation?.investmentCompanyGroupId || preselectedGroupId || ''
    }),
    [initialValues, preselectedCompanyId, preselectedGroupId, seedAssociation]
  )

  const form = useForm<AssociationFormData>({
    resolver: zodResolver(associationSchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  useEffect(() => {
    if (!preselectedCompanyId || form.getValues('investmentCompanyId')) return

    form.setValue('investmentCompanyId', preselectedCompanyId, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false
    })
  }, [form, preselectedCompanyId])

  const {
    companies,
    loading: companiesLoading,
    error: companiesError
  } = useInvestmentCompanies(accessToken || '', { limit: 50, search: companySearch || undefined })
  const { company: selectedCompany } = useInvestmentCompany(accessToken || '', preselectedCompanyId)
  const {
    groups,
    loading: groupsLoading,
    error: groupsError
  } = useInvestmentCompanyGroups(accessToken || '', {
    limit: 50,
    search: groupSearch || undefined
  })

  const companyOptions = useMemo(() => {
    const options = companies.map(company => ({ value: company.id, label: company.name || company.code || company.id }))
    if (selectedCompany && options.every(option => option.value !== selectedCompany.id)) {
      options.unshift({
        value: selectedCompany.id,
        label: selectedCompany.name || selectedCompany.code || selectedCompany.id
      })
    }
    return options
  }, [companies, selectedCompany])
  const groupOptions = useMemo(
    () => groups.map(group => ({ value: group.id, label: group.name || group.id })),
    [groups]
  )

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) errors.push({ type: 'accessToken' })
  if (companiesError) errors.push({ error: companiesError, context: t('error-load-companies') })
  if (groupsError) errors.push({ error: groupsError, context: t('error-load-groups') })
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId={PREFIX_DATA_TEST_ID} />
  }

  const handleSubmit = async (data: AssociationFormData) => {
    const association = buildPayload(
      {
        id: data.id,
        version: data.version,
        investmentCompanyId: data.investmentCompanyId,
        investmentCompanyGroupId: data.investmentCompanyGroupId
      },
      investmentCompanyGroupAssociationFormFields
    )

    return {
      investmentCompanyGroupAssociations: [association],
      changeMode: data.id ? 'UPDATE' : 'INSERT'
    }
  }

  return (
    <AppActionForm
      processType={defaultValues.id ? 'update' : 'create'}
      onSubmit={handleSubmit}
      formData={form.getValues()}
      form={form}
      schema={associationSchema}
      isSubmitDisabled={companiesLoading || groupsLoading}
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
          name="investmentCompanyGroupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('group-label')}</FormLabel>
              <FormControl>
                <Combobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  onSearch={setGroupSearch}
                  options={groupOptions}
                  loading={groupsLoading}
                  placeholder={t('group-placeholder')}
                  searchPlaceholder={t('group-search-placeholder')}
                  emptyText={t('group-empty')}
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

export default CompanyGroupAssociationPopup
export { CompanyGroupAssociationPopup }
