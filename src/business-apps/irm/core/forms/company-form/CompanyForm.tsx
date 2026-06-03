import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentCompany } from '@/common/data/investment/hooks/useInvestmentCompany'
import { AppActionForm } from '@/components/app-action-form'
import { AddressSegment } from '@/common/components/common-relations/form-segments/address-segment'
import { ErrorAlert } from '@/components/error-alert'
import { CatalogSelect } from '@/components/catalog-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  FormSection,
  useTranslation
} from '@newwork/nw-design-system'
import { CompanyCoreFields } from './CompanyCoreFields'
import { CompanyExecutivesSection } from './CompanyExecutivesSection'
import { CompanyOwnershipsSection } from './CompanyOwnershipsSection'
import { buildCompanySubmitPayload } from './companyFormPayload'
import {
  createCompanySchema,
  DATA_TEST_ID_PREFIX,
  fileToBase64,
  getCompanyDefaultValues,
  getPictureAdditionalProp,
  getUploadedFile,
  OWNERSHIP_TOTAL_LIMIT,
  type CompanyFormData,
  type CompanyFormProps,
  type InvestmentCompanyFormSource
} from './companyFormTypes'
import { useCompanyFormLookups } from './useCompanyFormLookups'
import translations from './_i18n'

const CompanyForm: React.FC<CompanyFormProps> = ({
  investmentCompany,
  investmentCompanyId,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  userInfo,
  additionalData,
  open,
  setOpen,
  refetch
}) => {
  const { t } = useTranslation(translations)
  const companySchema = useMemo(() => createCompanySchema(t), [t])
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const [internalOpen, setInternalOpen] = useState(false)
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

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  useEffect(() => {
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

  const {
    fields: executiveFields,
    append: appendExecutive,
    remove: removeExecutive
  } = useFieldArray({
    control: form.control,
    name: 'executives'
  })
  const {
    fields: ownershipFields,
    append: appendOwnership,
    remove: removeOwnership
  } = useFieldArray({
    control: form.control,
    name: 'ownerships'
  })
  const watchedOwnerships = useWatch({
    control: form.control,
    name: 'ownerships'
  })

  useEffect(() => {
    const ownershipTotal = (watchedOwnerships || []).reduce((sum, ownership) => sum + (ownership?.percentage || 0), 0)

    if (ownershipTotal > OWNERSHIP_TOTAL_LIMIT) {
      form.setError('ownerships', {
        type: 'validate',
        message: t('validation-ownership-total-max')
      })
      return
    }

    form.clearErrors('ownerships')
  }, [form, t, watchedOwnerships])

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
    async (data: CompanyFormData) => {
      return buildCompanySubmitPayload(data, pictureFile, picturePreview, file =>
        fileToBase64(file, t('error-read-file'))
      )
    },
    [pictureFile, picturePreview, t]
  )

  const handleCancel = useCallback(async () => {
    setInternalOpen(false)
    setOpen?.(false)
    onCancel?.()
  }, [onCancel, setOpen])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) errors.push({ type: 'accessToken' })
  if (investmentCompanyError) errors.push({ error: investmentCompanyError, context: t('error-load-company') })
  if (contacts.error) errors.push({ error: contacts.error, context: t('error-load-investment-contacts') })
  if (groups.error) errors.push({ error: groups.error, context: t('error-load-company-groups') })
  if (ownerCompanies.error) errors.push({ error: ownerCompanies.error, context: t('error-load-owner-companies') })
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId={dataTestId} />
  }

  const formContent = (
    <>
      <CompanyCoreFields
        form={form}
        t={t}
        groupOptions={groupOptions}
        groupsLoading={groups.loading}
        picturePreview={picturePreview}
        onGroupSearch={setGroupSearch}
        onPictureUpload={handlePictureUpload}
        onRemovePicture={() => {
          setPictureFile(null)
          setPicturePreview(null)
          form.setValue('pictureModified', true, { shouldDirty: true })
        }}
      />

      <CompanyExecutivesSection
        form={form}
        t={t}
        dataTestId={dataTestId}
        fields={executiveFields}
        employees={employees.employees}
        employeesLoading={employees.loading}
        hasMore={employees.hasMore}
        contacts={contactOptions}
        contactsLoading={contacts.loading}
        contactsError={contacts.error}
        append={appendExecutive}
        remove={removeExecutive}
        searchEmployees={employees.search}
        loadMore={employees.loadMore}
        searchContacts={contacts.search}
      />

      <CompanyOwnershipsSection
        t={t}
        fields={ownershipFields}
        ownerCompanyOptions={ownerCompanyOptions}
        ownerCompaniesLoading={ownerCompanies.loading}
        append={appendOwnership}
        remove={removeOwnership}
        onOwnerCompanySearch={setOwnerCompanySearch}
      />

      <FormSection title={t('address-section')} value="company-addresses">
        <AddressSegment />
      </FormSection>
    </>
  )

  const appAction = (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={resolvedInvestmentCompany?.id ? 'update' : 'create'}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onProcessCompletion={detail => {
          if (detail?.resolution === 'success') {
            refetch?.()
            setInternalOpen(false)
            setOpen?.(false)
          }
        }}
        formData={form.getValues()}
        form={form}
        schema={companySchema}
        data-testid={formatDataTestId(dataTestId, 'Form')}
        submitButtonText={resolvedInvestmentCompany?.id ? t('update-button') : t('create-button')}
        isSubmitDisabled={investmentCompanyLoading}
      >
        {formContent}
      </AppActionForm>
    </CatalogSelect.Provider>
  )

  const isModal = Boolean(childAddButton || open !== undefined || setOpen)
  if (!isModal) {
    return appAction
  }

  const modalOpen = open ?? internalOpen
  const setModalOpen = (next: boolean) => {
    setInternalOpen(next)
    setOpen?.(next)
  }

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      {childAddButton && <DialogTrigger asChild>{childAddButton}</DialogTrigger>}
      <DialogContent className="gba:max-h-screen gba:w-full gba:max-w-4xl gba:overflow-y-auto">
        <DialogTitle>{resolvedInvestmentCompany?.id ? t('edit-dialog-title') : t('create-dialog-title')}</DialogTitle>
        {appAction}
      </DialogContent>
    </Dialog>
  )
}

export default CompanyForm
