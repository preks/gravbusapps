import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { useInvestmentCompany } from '@/common/data/investment/hooks/useInvestmentCompany'
import { AppActionForm } from '@/components/app-action-form'
import { AddressSegment } from '@/common/components/common-relations/form-segments/address-segment'
import { ErrorAlert } from '@/components/error-alert'
import { CatalogSelect } from '@/components/catalog-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { FormSection, useTranslation } from '@newwork/nw-design-system'
import { CompanyCoreFields } from './CompanyCoreFields'
import { CompanyExecutivesSection } from './CompanyExecutivesSection'
import { CompanyOwnershipsSection } from './CompanyOwnershipsSection'
import { buildCompanySubmitPayload } from './companyFormPayload'
import {
  createCompanyResolver,
  createCompanySchema,
  DATA_TEST_ID_PREFIX,
  fileToBase64,
  getCompanyDefaultValues,
  getPictureAdditionalProp,
  getUploadedFile,
  type CompanyFormData,
  type CompanyFormProps,
  type InvestmentCompanyFormSource
} from './companyFormTypes'
import { useCompanyFormLookups } from './useCompanyFormLookups'
import translations from './_i18n'

// The rendered form subtree is isolated behind React.memo on purpose. After a failed submit, the
// disabled address "region" CatalogSelect (requireSourceForEnable) calls form.trigger(), which
// toggles RHF's isValidating. Because the design-system FormFields subscribe to isValidating, the
// useForm host (CompanyForm) re-renders on every toggle. If that re-render reached the design-system
// <Form>, it would hand out a new FormProvider/context identity, the region CatalogSelect effect
// would re-fire trigger(), and the cycle would never settle (the screen freeze observed). Keeping
// every prop below referentially stable lets React.memo skip re-rendering the <Form> subtree, so the
// provider identity stays constant and the trigger() effect runs once instead of looping.
type CompanyFormViewProps = Readonly<{
  accessToken: CompanyFormProps['accessToken']
  userInfo: CompanyFormProps['userInfo']
  additionalData: CompanyFormProps['additionalData']
  form: UseFormReturn<CompanyFormData>
  t: (key: string) => string
  companySchema: ReturnType<typeof createCompanySchema>
  dataTestId: string
  companyId?: string
  isSubmitDisabled: boolean
  onSubmit: (data: CompanyFormData) => Promise<unknown>
  onCancel: () => Promise<void>
  onProcessCompletion: (detail: { resolution?: 'success' | 'failure' } | null) => void
  coreProps: Omit<React.ComponentProps<typeof CompanyCoreFields>, 'form' | 't'>
  executivesProps: Omit<React.ComponentProps<typeof CompanyExecutivesSection>, 'form' | 't' | 'dataTestId'>
  ownershipsProps: Omit<React.ComponentProps<typeof CompanyOwnershipsSection>, 't'>
  addressBusinessAppContext: React.ComponentProps<typeof AddressSegment>['businessAppContext']
}>

const CompanyFormView = React.memo<CompanyFormViewProps>(
  ({
    accessToken,
    userInfo,
    additionalData,
    form,
    t,
    companySchema,
    dataTestId,
    companyId,
    isSubmitDisabled,
    onSubmit,
    onCancel,
    onProcessCompletion,
    coreProps,
    executivesProps,
    ownershipsProps,
    addressBusinessAppContext
  }) => (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={companyId ? 'update' : 'create'}
        onSubmit={onSubmit}
        onCancel={onCancel}
        onProcessCompletion={onProcessCompletion}
        formData={form.getValues()}
        form={form}
        schema={companySchema}
        data-testid={formatDataTestId(dataTestId, 'Form')}
        submitButtonText={companyId ? t('update-button') : t('create-button')}
        isSubmitDisabled={isSubmitDisabled}
      >
        <CompanyCoreFields form={form} t={t} {...coreProps} />
        <CompanyExecutivesSection form={form} t={t} dataTestId={dataTestId} {...executivesProps} />
        <CompanyOwnershipsSection t={t} {...ownershipsProps} />
        <FormSection title={t('address-section')} value="company-addresses">
          <AddressSegment businessAppContext={addressBusinessAppContext} />
        </FormSection>
      </AppActionForm>
    </CatalogSelect.Provider>
  )
)
CompanyFormView.displayName = 'CompanyFormView'

const CompanyForm: React.FC<CompanyFormProps> = ({
  investmentCompany,
  investmentCompanyId,
  onCancel,
  prefixDataTestId,
  accessToken,
  userInfo,
  additionalData,
  refetch
}) => {
  const { t } = useTranslation(translations)
  const companySchema = useMemo(() => createCompanySchema(t), [t])
  const companyResolver = useMemo(() => createCompanyResolver(companySchema, t), [companySchema, t])
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(investmentCompany?.pictureThumbnail || null)

  const companyAdditionalData = (additionalData || {}) as {
    id?: string
    investmentCompanyId?: string
    investmentCompany?: { id?: string }
    externalContextData?: {
      id?: string
      investmentCompanyId?: string
      investmentCompany?: { id?: string }
    }
    psi_initialParameters?: {
      id?: string
      investmentCompanyId?: string
      investmentCompany?: { id?: string }
    }
    psi_taskPayload?: {
      psi_initialParameters?: {
        id?: string
        investmentCompanyId?: string
        investmentCompany?: { id?: string }
      }
    }
  }

  const initialParameters =
    companyAdditionalData?.psi_initialParameters || companyAdditionalData?.psi_taskPayload?.psi_initialParameters

  const resolvedInvestmentCompanyId =
    investmentCompany?.id ||
    investmentCompanyId ||
    companyAdditionalData?.investmentCompanyId ||
    companyAdditionalData?.investmentCompany?.id ||
    companyAdditionalData?.id ||
    companyAdditionalData?.externalContextData?.investmentCompanyId ||
    companyAdditionalData?.externalContextData?.investmentCompany?.id ||
    companyAdditionalData?.externalContextData?.id ||
    initialParameters?.investmentCompanyId ||
    initialParameters?.investmentCompany?.id ||
    initialParameters?.id

  const {
    company: fetchedInvestmentCompany,
    loading: investmentCompanyLoading,
    error: investmentCompanyError
  } = useInvestmentCompany(accessToken || '', resolvedInvestmentCompanyId)
  const resolvedInvestmentCompany = useMemo<InvestmentCompanyFormSource | undefined>(() => {
    if (fetchedInvestmentCompany) {
      return {
        ...investmentCompany,
        ...fetchedInvestmentCompany
      } as InvestmentCompanyFormSource
    }

    return investmentCompany as InvestmentCompanyFormSource | undefined
  }, [fetchedInvestmentCompany, investmentCompany])

  const {
    employees,
    contacts,
    groups,
    ownerCompanies,
    contactOptions,
    groupOptions,
    ownerCompanyOptions,
    setGroupSearch,
    setOwnerCompanySearch
  } = useCompanyFormLookups({ accessToken, userInfo, additionalData }, resolvedInvestmentCompanyId)

  const defaultValues = useMemo<CompanyFormData>(
    () => getCompanyDefaultValues(resolvedInvestmentCompany),
    [resolvedInvestmentCompany]
  )

  const addressBusinessAppContext = useMemo(
    () => ({ accessToken: accessToken || '', userInfo, additionalData }),
    [accessToken, userInfo, additionalData]
  )

  const form = useForm<CompanyFormData>({
    resolver: companyResolver,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    // Do not auto-focus the first errored field on a failed submit. Focusing a CatalogSelect
    // trigger / a `requireSourceForEnable` disabled field re-enters the disabled-field
    // revalidation path and can re-drive the render loop that freezes the screen.
    shouldFocusError: false
  })

  // Only reset when the underlying company identity actually changes (mirrors OpportunityForm).
  // Resetting on every `defaultValues`/`resolvedInvestmentCompany` identity change can drive a
  // reset -> rerender -> reset feedback loop that silently freezes the screen.
  const lastResetCompanyIdRef = useRef<string | undefined | null>(undefined)
  useEffect(() => {
    const currentCompanyId = resolvedInvestmentCompany?.id
    if (lastResetCompanyIdRef.current === currentCompanyId) {
      return
    }
    lastResetCompanyIdRef.current = currentCompanyId
    form.reset(defaultValues)
    if (resolvedInvestmentCompany?.pictureThumbnail) {
      setPicturePreview(`data:image/jpeg;base64,${resolvedInvestmentCompany.pictureThumbnail}`)
    } else if (getPictureAdditionalProp(resolvedInvestmentCompany?.picture)) {
      setPicturePreview(`data:image/jpeg;base64,${getPictureAdditionalProp(resolvedInvestmentCompany?.picture)}`)
    } else {
      setPicturePreview(null)
    }
    setPictureFile(null)
  }, [defaultValues, form, resolvedInvestmentCompany])

  const handlePictureUpload = useCallback(
    (files: unknown[]) => {
      const file = getUploadedFile(files[0])

      if (!file) {
        setPictureFile(null)
        setPicturePreview(null)
        form.setValue('pictureModified', true, { shouldDirty: true })
        return
      }
      if (!file.type.startsWith('image/')) return
      setPictureFile(file)
      form.setValue('pictureModified', true, { shouldDirty: true })
      const reader = new FileReader()
      reader.onloadend = () => setPicturePreview(typeof reader.result === 'string' ? reader.result : null)
      reader.readAsDataURL(file)
    },
    [form]
  )

  const handleSubmit = useCallback(
    async (data: CompanyFormData) =>
      buildCompanySubmitPayload(data, pictureFile, picturePreview, file => fileToBase64(file, t('error-read-file'))),
    [pictureFile, picturePreview, t]
  )

  const handleCancel = useCallback(async () => {
    onCancel?.()
  }, [onCancel])

  const handleRemovePicture = useCallback(() => {
    setPictureFile(null)
    setPicturePreview(null)
    form.setValue('pictureModified', true, { shouldDirty: true })
  }, [form])

  const handleProcessCompletion = useCallback(
    (detail: { resolution?: 'success' | 'failure' } | null) => {
      if (detail?.resolution === 'success') {
        refetch?.()
      }
    },
    [refetch]
  )

  // Stable prop bundles for the memoized form subtree. Identity must only change when the underlying
  // data actually changes (not on every RHF state churn), otherwise React.memo cannot skip the
  // <Form> subtree and the disabled-CatalogSelect trigger loop returns. See CompanyFormView.
  const coreProps = useMemo(
    () => ({
      groupOptions,
      groupsLoading: groups.loading,
      picturePreview,
      onGroupSearch: setGroupSearch,
      onPictureUpload: handlePictureUpload,
      onRemovePicture: handleRemovePicture
    }),
    [groupOptions, groups.loading, picturePreview, setGroupSearch, handlePictureUpload, handleRemovePicture]
  )

  const executivesProps = useMemo(
    () => ({
      employees: employees.employees,
      employeesLoading: employees.loading,
      hasMore: employees.hasMore,
      contacts: contactOptions,
      contactsLoading: contacts.loading,
      contactsError: contacts.error,
      searchEmployees: employees.search,
      loadMore: employees.loadMore,
      searchContacts: contacts.search
    }),
    [
      employees.employees,
      employees.loading,
      employees.hasMore,
      employees.search,
      employees.loadMore,
      contactOptions,
      contacts.loading,
      contacts.error,
      contacts.search
    ]
  )

  const ownershipsProps = useMemo(
    () => ({
      ownerCompanyOptions,
      ownerCompaniesLoading: ownerCompanies.loading,
      onOwnerCompanySearch: setOwnerCompanySearch
    }),
    [ownerCompanyOptions, ownerCompanies.loading, setOwnerCompanySearch]
  )

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) errors.push({ type: 'accessToken' })
  if (investmentCompanyError) errors.push({ error: investmentCompanyError, context: t('error-load-company') })
  if (contacts.error) errors.push({ error: contacts.error, context: t('error-load-investment-contacts') })
  if (groups.error) errors.push({ error: groups.error, context: t('error-load-company-groups') })
  if (ownerCompanies.error) errors.push({ error: ownerCompanies.error, context: t('error-load-owner-companies') })
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId={dataTestId} />
  }

  return (
    <CompanyFormView
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
      form={form}
      t={t}
      companySchema={companySchema}
      dataTestId={dataTestId}
      companyId={resolvedInvestmentCompany?.id}
      isSubmitDisabled={investmentCompanyLoading}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onProcessCompletion={handleProcessCompletion}
      coreProps={coreProps}
      executivesProps={executivesProps}
      ownershipsProps={ownershipsProps}
      addressBusinessAppContext={addressBusinessAppContext}
    />
  )
}

export default CompanyForm
