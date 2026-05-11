import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentCompany } from '@/common/data/investment/hooks/useInvestmentCompany'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { filterAddressLines, filterAddresses } from '@/common/data/common/utils/entityPayloadHelpers'
import { buildInvestmentCompanyPayload } from '@/common/data/investment/types/investmentCompanyTypes'
import { investmentCompanyExecutiveFormFields } from '@/common/data/investment/types/investmentCompanyAssociationTypes'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import type { InvestmentCompany } from '@/common/data/investment/types/investmentCompanyTypes'
import { AppActionForm } from '@/components/app-action-form'
import { AddressSegment } from '@/common/components/common-relations/form-segments/address-segment'
import { ErrorAlert } from '@/components/error-alert'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  FileUpload,
  FormControl,
  FormField,
  FormFieldGroup,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import translations from './_i18n'

const DATA_TEST_ID_PREFIX = 'investment-company-form'
const LEGAL_ENTITY_EXECUTIVE_TYPE_CATALOG = 'Legal Entity Executive Type:v1'
const CURRENCY_CATALOG = 'Currency:v1'

const addressSchema = z.object({
  id: z.string().optional(),
  investmentCompanyId: z.string().optional(),
  addressType: z.string().optional(),
  addressLine: z
    .object({
      lines: z.array(z.string().optional()).optional()
    })
    .optional(),
  postalCode: z.string().optional(),
  locality: z.string().optional(),
  regionRef: z.string().optional(),
  countryRef: z.string().optional()
})

const createCompanySchema = (t: (key: string) => string) => {
  const executiveSchema = z
    .object({
      id: z.string().optional(),
      version: z.number().optional(),
      sourceType: z.enum(['employee', 'investmentContact']),
      employeeId: z.string().optional(),
      investmentContactId: z.string().optional(),
      executiveTypeRef: z.string().optional()
    })
    .superRefine((value, ctx) => {
      if (value.sourceType === 'employee' && !value.employeeId) {
        ctx.addIssue({ code: 'custom', path: ['employeeId'], message: t('validation-employee-required') })
      }
      if (value.sourceType === 'investmentContact' && !value.investmentContactId) {
        ctx.addIssue({
          code: 'custom',
          path: ['investmentContactId'],
          message: t('validation-investment-contact-required')
        })
      }
    })

  return z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    name: z.string().trim().min(1, t('validation-company-name-required')).max(64, t('validation-company-name-max')),
    code: z.string().trim().min(1, t('validation-company-code-required')).max(20, t('validation-company-code-max')),
    description: z.string().optional(),
    commercialRegistrationNumber: z.string().optional(),
    taxIdentificationNumber: z.string().optional(),
    taxNumber: z.string().optional(),
    valueAddedTaxNumber: z.string().optional(),
    currencyRef: z.string().optional(),
    addresses: z.array(addressSchema).optional(),
    executives: z.array(executiveSchema).optional(),
    pictureModified: z.boolean().optional()
  })
}

type CompanyFormData = z.infer<ReturnType<typeof createCompanySchema>>
type ExecutiveFormRow = NonNullable<CompanyFormData['executives']>[number]
type ExecutiveFormSource = {
  id?: string
  version?: number
  employeeId?: string
  employee?: { id?: string }
  investmentContactId?: string
  investmentContact?: { id?: string }
  executiveTypeRef?: string
}
type InvestmentCompanyFormSource = Partial<InvestmentCompany> & {
  investmentCompanyExecutives?: ExecutiveFormSource[]
  picture?: { additionalProp1?: string } | string
}
type InvestmentCompanyMutationPayload = Record<string, unknown> & {
  investmentCompanyExecutives?: unknown[]
  addresses?: unknown[]
  picture?: Record<string, string>
  pictureThumbnail?: string
}

const toFormAddressLine = (line?: {
  streetAddress?: string
  addressLine2?: string
  addressLine3?: string
  addressLine4?: string
}): { lines: string[] } | undefined => {
  if (!line) return undefined
  const lines = [line.streetAddress, line.addressLine2, line.addressLine3, line.addressLine4].filter(
    (value): value is string => Boolean(value)
  )
  return lines.length > 0 ? { lines } : undefined
}

const getCompanyExecutives = (company?: InvestmentCompanyFormSource): ExecutiveFormSource[] => {
  return company?.executives || company?.investmentCompanyExecutives || []
}

const getPictureAdditionalProp = (picture: unknown): string | undefined => {
  if (!picture || typeof picture !== 'object' || !('additionalProp1' in picture)) return undefined
  const value = picture.additionalProp1
  return typeof value === 'string' ? value : undefined
}

const toExecutiveFormRow = (executive: ExecutiveFormSource): ExecutiveFormRow => ({
  id: executive?.id,
  version: executive?.version,
  sourceType: executive?.investmentContactId ? 'investmentContact' : 'employee',
  employeeId: executive?.employeeId || executive?.employee?.id,
  investmentContactId: executive?.investmentContactId || executive?.investmentContact?.id,
  executiveTypeRef: executive?.executiveTypeRef
})

export interface CompanyFormProps extends BusinessAppContextProps {
  investmentCompany?: Partial<InvestmentCompany> & Record<string, any>
  investmentCompanyId?: string
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: React.ReactNode
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  // Legacy props kept optional to avoid breaking existing callers during migration.
  refetch?: () => void
  structureId?: string
  parentNodeId?: string
  isRootCompany?: boolean
}

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

  const resolvedInvestmentCompanyId =
    investmentCompany?.id ||
    investmentCompanyId ||
    additionalData?.investmentCompanyId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentCompanyId

  const {
    company: fetchedInvestmentCompany,
    loading: investmentCompanyLoading,
    error: investmentCompanyError
  } = useInvestmentCompany(accessToken || '', resolvedInvestmentCompanyId)
  const resolvedInvestmentCompany = investmentCompany?.id ? investmentCompany : fetchedInvestmentCompany

  const {
    employees,
    loading: employeesLoading,
    search: searchEmployees,
    hasMore,
    loadMore
  } = useEmployeeSearch(accessToken)
  const {
    contacts,
    loading: contactsLoading,
    search: searchContacts,
    error: contactsError
  } = useInvestmentContactsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  const contactOptions = useMemo(
    () =>
      contacts
        .filter(contact => contact.id)
        .map(contact => ({
          value: contact.id!,
          label: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.id!
        })),
    [contacts]
  )

  const defaultValues = useMemo<CompanyFormData>(
    () => ({
      id: resolvedInvestmentCompany?.id,
      version: resolvedInvestmentCompany?.version,
      name: resolvedInvestmentCompany?.name || '',
      code: resolvedInvestmentCompany?.code || '',
      description: resolvedInvestmentCompany?.description || '',
      commercialRegistrationNumber: resolvedInvestmentCompany?.commercialRegistrationNumber || '',
      taxIdentificationNumber: resolvedInvestmentCompany?.taxIdentificationNumber || '',
      taxNumber: resolvedInvestmentCompany?.taxNumber || '',
      valueAddedTaxNumber: resolvedInvestmentCompany?.valueAddedTaxNumber || '',
      currencyRef: resolvedInvestmentCompany?.currencyRef || '',
      addresses: (resolvedInvestmentCompany?.addresses || []).map(address => ({
        id: address.id,
        investmentCompanyId: address.investmentCompanyId,
        addressType: address.addressType,
        addressLine: toFormAddressLine(address.addressLine),
        postalCode: address.postalCode,
        locality: address.locality,
        regionRef: address.regionRef,
        countryRef: address.countryRef
      })),
      executives: getCompanyExecutives(resolvedInvestmentCompany).map(toExecutiveFormRow),
      pictureModified: false
    }),
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
    append,
    remove
  } = useFieldArray({
    control: form.control,
    name: 'executives'
  })

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const value = typeof reader.result === 'string' ? reader.result.split(',')[1] : ''
        resolve(value || '')
      }
      reader.onerror = () => reject(new Error(t('error-read-file')))
      reader.readAsDataURL(file)
    })

  const handlePictureUpload = useCallback(
    (files: Array<{ file: File }>) => {
      if (!files.length || !(files[0].file instanceof File)) {
        setPictureFile(null)
        setPicturePreview(null)
        form.setValue('pictureModified', true, { shouldDirty: true })
        return
      }
      const file = files[0].file
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
      const investmentCompany: InvestmentCompanyMutationPayload = buildInvestmentCompanyPayload({
        id: data.id,
        version: data.version,
        name: data.name.trim(),
        code: data.code.trim(),
        description: data.description?.trim() || undefined,
        commercialRegistrationNumber: data.commercialRegistrationNumber?.trim() || undefined,
        taxIdentificationNumber: data.taxIdentificationNumber?.trim() || undefined,
        taxNumber: data.taxNumber?.trim() || undefined,
        valueAddedTaxNumber: data.valueAddedTaxNumber?.trim() || undefined,
        currencyRef: data.currencyRef || undefined
      }).investmentCompany

      const executives =
        data.executives
          ?.map(executive => {
            const executivePayload = buildPayload(
              {
                id: executive.id,
                version: executive.version,
                investmentCompanyId: data.id,
                employeeId: executive.sourceType === 'employee' ? executive.employeeId : undefined,
                investmentContactId:
                  executive.sourceType === 'investmentContact' ? executive.investmentContactId : undefined,
                executiveTypeRef: executive.executiveTypeRef
              },
              investmentCompanyExecutiveFormFields
            )
            return executivePayload.employee || executivePayload.investmentContact ? executivePayload : null
          })
          .filter(Boolean) || []

      if (data.executives !== undefined) {
        investmentCompany.investmentCompanyExecutives = executives
      }

      const filteredAddresses = filterAddresses(data.addresses || [], filterAddressLines)
      if (filteredAddresses !== undefined) {
        investmentCompany.addresses = filteredAddresses
      }

      if (pictureFile) {
        const base64 = await fileToBase64(pictureFile)
        investmentCompany.picture = { additionalProp1: base64 }
      } else if (data.pictureModified && !picturePreview) {
        investmentCompany.picture = {}
        investmentCompany.pictureThumbnail = ''
      }

      return {
        investmentCompanies: [investmentCompany],
        changeMode: data.id ? 'UPDATE' : 'INSERT'
      }
    },
    [pictureFile, picturePreview]
  )

  const handleCancel = useCallback(async () => {
    setInternalOpen(false)
    setOpen?.(false)
    onCancel?.()
  }, [onCancel, setOpen])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) errors.push({ type: 'accessToken' })
  if (investmentCompanyError) errors.push({ error: investmentCompanyError, context: t('error-load-company') })
  if (contactsError) errors.push({ error: contactsError, context: t('error-load-investment-contacts') })
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId={dataTestId} />
  }

  const formContent = (
    <>
      <FormFieldGroup title={t('section-core-details')}>
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem className="gba:flex-2">
              <FormLabel>{t('name-label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('name-placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="code"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('code-label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('code-placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('description-label')}</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder={t('description-placeholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormFieldGroup>
        <FormField
          name="commercialRegistrationNumber"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('commercial-registration-number-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="currencyRef"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('currency-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={CURRENCY_CATALOG}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      <FormFieldGroup>
        <FormField
          name="taxIdentificationNumber"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('tax-identification-number-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="taxNumber"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('tax-number-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="valueAddedTaxNumber"
          render={({ field }) => (
            <FormItem className="gba:flex-1">
              <FormLabel>{t('vat-number-label')}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormFieldGroup>

      <FormItem>
        <FormLabel>{t('logo-label')}</FormLabel>
        <FormControl>
          <div className="gba:space-y-3">
            {picturePreview && (
              <div className="gba:flex gba:items-center gba:gap-4">
                <Avatar className="gba:w-20 gba:h-20">
                  <AvatarImage src={picturePreview} alt={t('logo-alt')} />
                  <AvatarFallback>{(form.watch('name') || 'CO').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPictureFile(null)
                    setPicturePreview(null)
                    form.setValue('pictureModified', true, { shouldDirty: true })
                  }}
                >
                  {t('remove-logo-button')}
                </Button>
              </div>
            )}
            <FileUpload multiple={false} accept="image/*" onChange={handlePictureUpload} />
          </div>
        </FormControl>
      </FormItem>

      <FormSection title={t('executives-section')} value="company-executives">
        <div className="gba:space-y-4">
          {executiveFields.map((item, index) => {
            const sourceType = form.watch(`executives.${index}.sourceType`)
            return (
              <div key={item.id} className="gba:p-3 gba:border gba:rounded-md gba:space-y-3">
                <FormField
                  name={`executives.${index}.sourceType`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('source-type-label')}</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={value => {
                            field.onChange(value)
                            if (value === 'employee') {
                              form.setValue(`executives.${index}.investmentContactId`, undefined)
                            } else {
                              form.setValue(`executives.${index}.employeeId`, undefined)
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('source-type-label')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">{t('source-employee')}</SelectItem>
                            <SelectItem value="investmentContact">{t('source-investment-contact')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {sourceType === 'employee' ? (
                  <FormField
                    name={`executives.${index}.employeeId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('employee-label')}</FormLabel>
                        <FormControl>
                          <EmployeeSelect
                            value={field.value || null}
                            employees={employees}
                            onValueChange={value => field.onChange(value || undefined)}
                            onSearch={searchEmployees}
                            loading={employeesLoading}
                            hasMore={hasMore}
                            onLoadMore={loadMore}
                            placeholder={t('employee-placeholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    name={`executives.${index}.investmentContactId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('investment-contact-label')}</FormLabel>
                        <FormControl>
                          <Combobox
                            value={field.value || ''}
                            onValueChange={value => field.onChange(value || undefined)}
                            options={contactOptions}
                            onSearch={searchContacts}
                            loading={contactsLoading}
                            placeholder={t('investment-contact-placeholder')}
                            searchPlaceholder={t('investment-contact-search-placeholder')}
                            emptyText={t('investment-contact-empty')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  name={`executives.${index}.executiveTypeRef`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('executive-type-label')}</FormLabel>
                      <FormControl>
                        <CatalogSelect
                          catalogIdentifier={LEGAL_ENTITY_EXECUTIVE_TYPE_CATALOG}
                          value={field.value || ''}
                          onValueChange={value => field.onChange(value || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="outline" onClick={() => remove(index)}>
                  <TrashIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('remove-executive-button')}
                </Button>
              </div>
            )
          })}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                sourceType: 'employee',
                employeeId: undefined,
                investmentContactId: undefined,
                executiveTypeRef: undefined
              })
            }
          >
            <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('add-executive-button')}
          </Button>
        </div>
      </FormSection>

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
      <DialogContent className="gba:max-h-screen gba:w-[760px] gba:overflow-y-auto">
        <DialogTitle>{resolvedInvestmentCompany?.id ? t('edit-dialog-title') : t('create-dialog-title')}</DialogTitle>
        {appAction}
      </DialogContent>
    </Dialog>
  )
}

export default CompanyForm
