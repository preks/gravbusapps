import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TAX_DETAILS_EMPLOYEE, GET_TAX_DETAILS_CATALOG } from './ChangeTaxDetailsQueries'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Label,
  Switch,
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'

interface CatalogEntry {
  id: string
  value?: string
  translations?: Array<{ localeCode: string; value: string }>
  objectValue?: any
}

interface TaxInfoFormValues {
  taxNumber: string
  taxBracketRef: string | null
  healthInsuranceName: string
  healthInsuranceTypeRef: string | null
  taxIdentificationNumber: string
  taxableChurchAffiliationRef: string | null
  socialSecurityNumber: string
  childTaxAllowance: string
  requestAtTaxOffice: boolean
}

/** Valid German pension insurance (Rentenversicherung) region codes: first two digits of SSN. */
const DE_SSN_VALID_REGION_CODES = new Set<string>([
  '02',
  '03',
  '04',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '23',
  '24',
  '25',
  '26',
  '28',
  '29',
  '38',
  '39',
  '40',
  '80',
  '81',
  '82',
  '89',
  ...Array.from({ length: 38 }, (_, i) => String(42 + i)) // 42–79
])

/** Validates German Tax ID (Steuerliche Identifikationsnummer) check digit (11th digit). */
function isValidGermanTaxIdCheckDigit(digits: string): boolean {
  if (digits.length !== 11) return false
  let summand = 10
  for (let i = 0; i < 10; i++) {
    const n = parseInt(digits[i], 10)
    let v = (summand + n) % 10
    if (v === 0) v = 10
    summand = (v * 2) % 11
  }
  let check = 11 - summand
  if (check === 10) check = 0
  return check === parseInt(digits[10], 10)
}

export const ChangeTaxDetails: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData, userInfo }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const form = useForm<TaxInfoFormValues>({
    defaultValues: {
      taxNumber: '',
      taxBracketRef: null,
      healthInsuranceName: '',
      healthInsuranceTypeRef: null,
      taxIdentificationNumber: '',
      taxableChurchAffiliationRef: null,
      socialSecurityNumber: '',
      childTaxAllowance: '',
      requestAtTaxOffice: false
    },
    mode: 'onChange'
  })

  const [data, setData] = useState<any>(null)
  const [catalogs, setCatalogs] = useState<{
    taxBracket: CatalogEntry[]
    religion: CatalogEntry[]
    healthInsuranceType: CatalogEntry[]
  }>({
    taxBracket: [],
    religion: [],
    healthInsuranceType: []
  })
  const [isReady, setIsReady] = useState(false)

  const title = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel('lowcoder:change_tax_details.change_tax_details_title', 'Change Tax Details'),
    []
  )

  // Fetch employee tax details and catalogs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsReady(false)
        const employeeId =
          additionalData?.psi_taskPayload?.employeeId ||
          additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
          additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
          (typeof additionalData?.contextData === 'object' && additionalData?.contextData?.employeeId) ||
          userInfo?.employeeDetails?.employeeId ||
          ''

        // Always fetch catalogs (independent of employee)
        const locale = getCurrentActiveUserLocale() || 'en-US'
        const catalogsQuery = GET_TAX_DETAILS_CATALOG
        const catalogsRes = await graphqlClient.request<any>(catalogsQuery, { activeUserLocale: locale })
        setCatalogs({
          taxBracket: catalogsRes?.taxBracket || [],
          religion: catalogsRes?.religion || [],
          healthInsuranceType: catalogsRes?.healthInsuranceType || []
        })

        // Conditionally fetch employee details
        let employeeDetails: any = null
        if (employeeId) {
          const employeeQuery = GET_TAX_DETAILS_EMPLOYEE
          const employeeRes = await graphqlClient.request<any>(employeeQuery, {
            idEmployee: employeeId,
            activeUserLocale: locale
          })
          employeeDetails = employeeRes?.EmployeeTaxDetail?.[0] || null
          setData(employeeDetails)
          // Store gender value for SSN validation rules
          try {
            const g = employeeRes?.EmployeeByPk?.gender?.value
            setEmployeeGender(typeof g === 'string' ? g.toLowerCase() : null)
          } catch {
            setEmployeeGender(null)
          }
        }

        const defaults: TaxInfoFormValues = {
          taxNumber: employeeDetails?.taxNumber ?? '',
          taxBracketRef: employeeDetails?.taxBracketRef ?? null,
          healthInsuranceName: employeeDetails?.healthInsuranceName ?? '',
          healthInsuranceTypeRef: employeeDetails?.healthInsuranceTypeRef ?? null,
          taxIdentificationNumber: employeeDetails?.taxIdentificationNumber ?? '',
          taxableChurchAffiliationRef:
            employeeDetails?.taxableChurchAffiliationRef ?? employeeDetails?.religionRef ?? null,
          socialSecurityNumber: employeeDetails?.socialSecurityNumber ?? '',
          childTaxAllowance: employeeDetails?.childTaxAllowance ?? '',
          requestAtTaxOffice: Boolean(employeeDetails?.additionalProperties?.requestAtTaxOffice ?? false)
        }
        form.reset(defaults)
        initialRef.current = defaults
      } catch {
        // no-op; AppActionForm will surface submission errors; loading errors are not specified
      } finally {
        setIsReady(true)
      }
    }

    fetchData()
  }, [additionalData?.psi_taskPayload, graphqlClient, form, userInfo])

  // Compute label helpers (keep lowcoder keys for existing translations; title uses change_tax_details)
  const lblTaxNumber = getTranslationFromI18nKeyAndLabel('lowcoder:change_tax_information.tax_number', 'Tax Number')
  const lblTaxBracket = getTranslationFromI18nKeyAndLabel('lowcoder:change_tax_information.tax_bracket', 'Tax Bracket')
  const lblHealthInsurance = getTranslationFromI18nKeyAndLabel(
    'lowcoder:change_tax_information.health_insurance',
    'Health Insurance'
  )
  const lblHealthInsuranceType = getTranslationFromI18nKeyAndLabel(
    'lowcoder:change_tax_information.health_insurance_type',
    'Type Of Health Insurance'
  )
  const lblTaxIdNumber = getTranslationFromI18nKeyAndLabel(
    'lowcoder:change_tax_information.tax_identification_number',
    'Tax Identification Number'
  )
  const lblChurchAffiliation = getTranslationFromI18nKeyAndLabel(
    'lowcoder:change_tax_information.taxable_church_affiliation',
    'Church Affiliation'
  )
  const lblSocialSecurityNumber = getTranslationFromI18nKeyAndLabel(
    'lowcoder:change_tax_information.social_security_number',
    'Social Security Number'
  )
  const lblChildTaxAllowance = getTranslationFromI18nKeyAndLabel(
    'lowcoder:change_tax_information.child_tax_allowance',
    'Child Tax Allowance'
  )
  const lblRequestAtTaxOffice = getTranslationFromI18nKeyAndLabel(
    'lowcoder:change_tax_information.request_at_tax_office_text',
    'Request at tax office'
  )

  const placeholderEnter = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
    'Please Enter'
  )
  const placeholderSelect = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
    'Please Select'
  )

  // Track initial values to compute unchanged state
  const initialRef = useRef<TaxInfoFormValues>(form.getValues())
  const watchedValues = form.watch()
  const isUnchangedNow = useMemo(() => {
    const normalize = (v: TaxInfoFormValues) => ({
      taxNumber: v.taxNumber || '',
      taxBracketRef: v.taxBracketRef || null,
      healthInsuranceName: v.healthInsuranceName || '',
      healthInsuranceTypeRef: v.healthInsuranceTypeRef || null,
      taxIdentificationNumber: v.taxIdentificationNumber || '',
      taxableChurchAffiliationRef: v.taxableChurchAffiliationRef || null,
      socialSecurityNumber: v.socialSecurityNumber || '',
      childTaxAllowance: v.childTaxAllowance || '',
      requestAtTaxOffice: Boolean(v.requestAtTaxOffice)
    })
    return JSON.stringify(normalize(watchedValues as any)) === JSON.stringify(normalize(initialRef.current))
  }, [watchedValues])

  const hasValidationErrors = Object.keys((form.formState as any)?.errors ?? {}).length > 0
  const isSubmitDisabledFinal = useMemo(() => {
    return hasValidationErrors || isUnchangedNow
  }, [hasValidationErrors, isUnchangedNow])

  const [employeeGender, setEmployeeGender] = useState<string | null>(null)

  // Helpers to render select options with localized value if present
  const catLabel = (e: CatalogEntry) => e?.translations?.[0]?.value || e?.value || ''

  return (
    <>
      {!isReady ? (
        <div
          className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
          data-testid="change-tax-details-form-container"
        >
          <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />
          <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-tax-details']]:!pt-0">
            <div
              className="gba:flex gba:items-center gba:justify-center gba:py-20"
              data-testid="change-tax-details-loading-spinner"
            >
              <Spinner size="xl" srText="Loading tax details..." />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px]"
          data-testid="change-tax-details-form-container"
        >
          <FormHeader title={title} flowIconUrl={flowIconUrl} className="gba:px-6" />

          <div className="gba:flex gba:flex-col gba:gap-4 gba:[&>div[data-testid='change-tax-details']]:!pt-0">
            <AppActionForm
              processType="update"
              form={form as any}
              formData={initialRef.current}
              submitEventType="pse_submit"
              cancelEventType="pse_abort"
              isSubmitDisabled={isSubmitDisabledFinal}
              submitButtonTestId="flw_changeTaxDetails_submitButton"
              cancelButtonTestId="flw_changeTaxDetails_cancelButton"
              submitButtonText={getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_absences.create_absence.submit',
                'Submit'
              )}
              cancelButtonText={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.initiate_cancel_button',
                'Cancel'
              )}
              onSubmit={async (values: TaxInfoFormValues) => {
                const employeeId =
                  additionalData?.psi_taskPayload?.employeeId ||
                  additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
                  additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
                  (typeof additionalData?.contextData === 'object' && additionalData?.contextData?.employeeId) ||
                  userInfo?.employeeDetails?.employeeId ||
                  ''

                const childTaxAllowanceNum =
                  values.childTaxAllowance !== '' && values.childTaxAllowance != null
                    ? Number(values.childTaxAllowance)
                    : 0
                const isUpdate = Boolean(data?.id)

                const employeeTaxDetail = {
                  ...(data?.id ? { id: data.id } : {}),
                  ...(data?.version !== undefined ? { version: data.version } : { version: 0 }),
                  ...(data?.businessKey ? { businessKey: data.businessKey } : {}),
                  ...(data?.activeTo ? { activeTo: data.activeTo } : {}),
                  employeeId,
                  taxIdentificationNumber: values.taxIdentificationNumber || '',
                  taxNumber: values.taxNumber || '',
                  taxBracketRef: values.taxBracketRef || '',
                  socialSecurityNumber: values.socialSecurityNumber || '',
                  wageTaxClassRef: data?.wageTaxClassRef ?? '',
                  taxableChurchAffiliationRef: values.taxableChurchAffiliationRef || '',
                  healthInsuranceTypeRef: values.healthInsuranceTypeRef || '',
                  healthInsuranceName: values.healthInsuranceName || '',
                  healthInsuranceDocument: data?.healthInsuranceDocument ?? null,
                  childTaxAllowance: Number.isNaN(childTaxAllowanceNum) ? 0 : childTaxAllowanceNum,
                  religionRef: values.taxableChurchAffiliationRef || data?.religionRef || '',
                  additionalProperties: {
                    ...(data?.additionalProperties || {}),
                    requestAtTaxOffice: Boolean(values.requestAtTaxOffice)
                  }
                }

                const payload = {
                  employeeTaxDetail,
                  changeMode: isUpdate ? 'UPDATE' : 'INSERT',
                  employeeId,
                  event: 'pse_submit'
                }
                return payload as any
              }}
              data-testid="change-tax-details"
            >
              <div className="gba:flex-1 gba:space-y-4">
                {/* Tax Number */}
                <FormField
                  control={form.control as any}
                  name={'taxNumber' as any}
                  rules={{
                    validate: (v: string) => {
                      const raw = String(v || '')
                      if (!raw.trim()) return true
                      const digits = raw.replace(/[^0-9]/g, '')
                      const ok = digits.length === 13
                      return (
                        ok ||
                        (getTranslationFromI18nKeyAndLabel(
                          'lowcoder:change_tax_information.invalid_tax_number_text',
                          'Please enter a valid 13-digit German Tax Number or leave empty.'
                        ) as unknown as string)
                      )
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-tax-details-tax-number-label">{lblTaxNumber}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={placeholderEnter} data-testid="flw_changeTaxDetails_taxNumber" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tax Bracket */}
                <FormField
                  control={form.control as any}
                  name={'taxBracketRef' as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-tax-details-tax-bracket-label">{lblTaxBracket}</FormLabel>
                      <FormControl>
                        <Select value={field.value || ''} onValueChange={val => field.onChange(val || null)}>
                          <SelectTrigger
                            className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none"
                            data-testid="flw_changeTaxDetails_taxBracket"
                          >
                            <SelectValue placeholder={placeholderSelect} />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogs.taxBracket.map(entry => (
                              <SelectItem key={entry.id} value={String(entry.id)}>
                                {catLabel(entry)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Health Insurance Name */}
                <FormField
                  control={form.control as any}
                  name={'healthInsuranceName' as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:change_tax_information.required_health_insurance_text',
                      'The Health Insurance field is required.'
                    ) as unknown as string
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-tax-details-health-insurance-label">
                        {lblHealthInsurance} <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={placeholderEnter}
                          data-testid="flw_changeTaxDetails_healthInsuranceName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Health Insurance Type */}
                <FormField
                  control={form.control as any}
                  name={'healthInsuranceTypeRef' as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:change_tax_information.required_health_insurance_type_text',
                      'The Type Of Health Insurance field is required.'
                    ) as unknown as string
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-tax-details-health-insurance-type-label">
                        {lblHealthInsuranceType} <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ''} onValueChange={val => field.onChange(val || null)}>
                          <SelectTrigger
                            className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none"
                            data-testid="flw_changeTaxDetails_healthInsuranceType"
                          >
                            <SelectValue placeholder={placeholderSelect} />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogs.healthInsuranceType.map(entry => (
                              <SelectItem key={entry.id} value={String(entry.id)}>
                                {catLabel(entry)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tax Identification Number */}
                <FormField
                  control={form.control as any}
                  name={'taxIdentificationNumber' as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:change_tax_information.required_tax_identification_number_text',
                      'The Tax Identification Number field is required.'
                    ) as unknown as string,
                    validate: (v: string) => {
                      const digits = String(v || '').replace(/[^0-9]/g, '')
                      if (digits.length !== 11) {
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:change_tax_information.invalid_tax_identification_number_text',
                          'Please enter a valid 11-digit German Tax Identification Number.'
                        ) as unknown as string
                      }
                      if (!isValidGermanTaxIdCheckDigit(digits)) {
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:change_tax_information.invalid_tax_identification_number_text',
                          'Please enter a valid 11-digit German Tax Identification Number.'
                        ) as unknown as string
                      }
                      return true
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-tax-details-tax-id-label">
                        {lblTaxIdNumber} <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={placeholderEnter}
                          data-testid="flw_changeTaxDetails_taxIdentificationNumber"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Taxable Church Affiliation */}
                <FormField
                  control={form.control as any}
                  name={'taxableChurchAffiliationRef' as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-tax-details-church-affiliation-label">
                        {lblChurchAffiliation}
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value || ''} onValueChange={val => field.onChange(val || null)}>
                          <SelectTrigger
                            className="gba:block gba:!w-full gba:min-w-0 gba:!max-w-none"
                            data-testid="flw_changeTaxDetails_taxableChurchAffiliation"
                          >
                            <SelectValue placeholder={placeholderSelect} />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogs.religion.map(entry => (
                              <SelectItem key={entry.id} value={String(entry.id)}>
                                {catLabel(entry)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Social Security Number */}
                <FormField
                  control={form.control as any}
                  name={'socialSecurityNumber' as any}
                  rules={{
                    required: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:change_tax_information.required_social_security_number_text',
                      'The Social Security Number field is required.'
                    ) as unknown as string,
                    validate: (v: string) => {
                      const raw = String(v || '').trim()
                      const compact = raw.replace(/\s+/g, '')
                      // Expect 8 digits + 1 letter + 3 digits, e.g. 89010299B123 (can be shown as 89 010299 B 123)
                      const basic = /^[0-9]{8}[A-Za-z][0-9]{3}$/.test(compact)
                      if (!basic) {
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:change_tax_information.invalid_social_security_number_text',
                          'Please enter a valid German pension insurance number (e.g., 89 010299 B 123).'
                        ) as unknown as string
                      }
                      // First two digits = region (Deutsche Rentenversicherung area code)
                      const region = compact.substring(0, 2)
                      if (!DE_SSN_VALID_REGION_CODES.has(region)) {
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:change_tax_information.invalid_social_security_number_text',
                          'Please enter a valid German pension insurance number (e.g., 89 010299 B 123).'
                        ) as unknown as string
                      }
                      // Validate date segment DDMMYY (positions 3-8 in grouped format; here positions 2-7 zero-based)
                      const dd = parseInt(compact.substring(2, 4), 10)
                      const mm = parseInt(compact.substring(4, 6), 10)
                      const validDay = dd >= 1 && dd <= 31
                      const validMonth = mm >= 1 && mm <= 12
                      if (!validDay || !validMonth) {
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:change_tax_information.invalid_social_security_number_text',
                          'Please enter a valid German pension insurance number (e.g., 89 010299 B 123).'
                        ) as unknown as string
                      }
                      // Gender-based range check if gender is known
                      if (employeeGender) {
                        const genderDigits = parseInt(compact.substring(9, 11), 10) // two digits after the letter
                        if (employeeGender === 'male') {
                          if (!(genderDigits >= 0 && genderDigits <= 49)) {
                            return getTranslationFromI18nKeyAndLabel(
                              'lowcoder:change_tax_information.invalid_social_security_number_text',
                              'Please enter a valid German pension insurance number (e.g., 89 010299 B 123).'
                            ) as unknown as string
                          }
                        } else {
                          // female, divers, other -> 50-99
                          if (!(genderDigits >= 50 && genderDigits <= 99)) {
                            return getTranslationFromI18nKeyAndLabel(
                              'lowcoder:change_tax_information.invalid_social_security_number_text',
                              'Please enter a valid German pension insurance number (e.g., 89 010299 B 123).'
                            ) as unknown as string
                          }
                        }
                      }
                      return true
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-tax-details-ssn-label">
                        {lblSocialSecurityNumber} <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={placeholderEnter}
                          data-testid="flw_changeTaxDetails_socialSecurityNumber"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Child Tax Allowance */}
                <FormField
                  control={form.control as any}
                  name={'childTaxAllowance' as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="change-tax-details-child-tax-allowance-label">
                        {lblChildTaxAllowance}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={placeholderEnter}
                          data-testid="flw_changeTaxDetails_childTaxAllowance"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Request at Tax Office */}
                <div className="gba:flex gba:items-center gba:justify-between">
                  <Label>{lblRequestAtTaxOffice}</Label>
                  <Switch
                    checked={form.watch('requestAtTaxOffice')}
                    onCheckedChange={(val: boolean) =>
                      form.setValue('requestAtTaxOffice', Boolean(val), { shouldDirty: true, shouldTouch: true })
                    }
                    data-testid="flw_changeTaxDetails_requestAtTaxOffice"
                  />
                </div>
              </div>
            </AppActionForm>
          </div>
        </div>
      )}
    </>
  )
}

export default ChangeTaxDetails
