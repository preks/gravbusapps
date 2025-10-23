import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Form } from 'antd'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Input as DesignInput,
  Checkbox as DesignCheckbox,
  Button as DesignButton,
  Separator,
  Spinner,
  Toaster
} from '@newwork/nw-design-system'
import SearchableSelect from './components/SearchableSelect'
import AccountSection from './components/AccountSection'
import ContactSection from './components/ContactSection'
import OpportunitySection from './components/OpportunitySection'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeePositions } from '../lead-form/hooks/useEmployeePositions'
import { useAccountsGraphQL } from '../opportunity-form/hooks/useAccountsGraphQL'
import { useSearchableCatalog } from '../lead-form/hooks/useSearchableCatalog'
import { COUNTRY_CATALOG } from '../lead-form/hooks/useLeadCatalogs'

// Define SelectOption interface for SearchableSelect
interface SelectOption {
  id: string | number
  value: string
  label: string
  name: string
  extraInfo?: {
    pictureThumbnail?: string
    jobPosition?: string
    organizationalUnit?: string
  }
}
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { catalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'

// Note: Replaced Select with Combobox from design system

export type ConvertLeadFormProps = BusinessAppContextProps

const LEAD_QUERY = `
  query GetLead($leadId: uuid!) {
    Lead(where: {id: {_eq: $leadId}}) {
        id
        name
        email
        account {
            id
            ownerEmployeeId
            ownerEmployee {
                id
                firstName
                lastName
            }
        }
        leadSource {
            value
        }
        status {
            value
        }
        academicTitle {
            value
        }
        academicTitleRef
        firstName
        lastName
        position
        companyName
        companyEmail
        companyPhone
        addresses {
        addressLine
        city
        country {
            id
            value
            code
        }
        region {
            id
            value
            code
        }
        postalCode
        }
    }
  }
`

// Note: Removed opportunity search queries since we only create new opportunities

export const ConvertLeadForm: React.FC<ConvertLeadFormProps> = props => {
  const { accessToken, additionalData } = props
  const [form] = Form.useForm()
  const [leadData, setLeadData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [accountOption, setAccountOption] = useState('match')
  const [contactOption, setContactOption] = useState('match')
  const [createOpportunity, setCreateOpportunity] = useState(false)

  const [selectedAccount, setSelectedAccount] = useState<string | undefined>(undefined)
  const [selectedAccountOwnerEmployee, setSelectedAccountOwnerEmployee] = useState<string | undefined>(undefined)
  const [selectedContact, setSelectedContact] = useState<string | undefined>(undefined)

  // Separate employee positions state for each section (Opportunity only - others moved to sections)

  // Opportunity Owner Employee State
  const {
    employeePositions: opportunityEmployeePositionsData,
    loading: opportunityEmployeePositionsLoading,
    error: opportunityEmployeePositionsError,
    hasMore: opportunityEmployeePositionsHasMore,
    loadMore: loadMoreOpportunityEmployeePositions,
    searchEmployees: searchOpportunityEmployeePositions
  } = useEmployeePositions({ accessToken })

  // Transform employee positions to SelectOption format for opportunity section
  // Note: Using employeeId instead of employee position id for owner assignments
  const opportunityEmployeePositions: SelectOption[] = opportunityEmployeePositionsData.map(emp => ({
    id: emp.employeeId,
    value: emp.employeeId,
    label: `${emp?.firstName} ${emp?.lastName}`,
    name: `${emp?.firstName} ${emp?.lastName}`,
    extraInfo: {
      pictureThumbnail: emp.employee.pictureThumbnail || undefined,
      jobPosition: emp.jobPosition?.name || 'No Position',
      organizationalUnit: emp.organizationalUnit?.name || 'No Unit'
    }
  }))

  // Handle account selection with owner employee
  const handleSelectedAccountChange = useCallback(
    (accountId: string | undefined, ownerEmployeeId: string | undefined) => {
      setSelectedAccount(accountId)
      setSelectedAccountOwnerEmployee(ownerEmployeeId)
    },
    []
  )

  // Track current pipeline for stages refetching (same as opportunity form)

  // Country hook for searchable dropdown in opportunity sections (account/contact moved to sections)
  const countriesHook = useSearchableCatalog({
    accessToken,
    catalogIdentifier: COUNTRY_CATALOG
  })

  // Accounts GraphQL hook for opportunity section (same as opportunity form)
  const {
    options: simpleAccounts,
    loading: simpleAccountsLoading,
    error: simpleAccountsError,
    hasMore: simpleAccountsHasMore,
    search: searchSimpleAccounts,
    loadMore: loadMoreSimpleAccounts
  } = useAccountsGraphQL({
    accessToken
  })

  // Only allow countries with string labels (same as lead form)
  const stringCountries = countriesHook.allOptions.filter(c => typeof c.label === 'string')

  // Note: Employee search is now handled by useEmployeePositions hook

  // Catalog states
  const [catalogsLoading, setCatalogsLoading] = useState(true)

  const graphQLClient = useGraphqlClient(accessToken)

  // Initialize catalog manager with access token
  useEffect(() => {
    if (accessToken) {
      catalogManagerClient.setAccessToken(accessToken)
    }
  }, [accessToken])

  // Initialize catalog hooks on mount (opportunity section only - others moved to sections)
  useEffect(() => {
    if (accessToken) {
      if (countriesHook) {
        countriesHook.initialize()
      }
    }
  }, [accessToken])

  // Add process completion listener
  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response
        if (response) {
          toast.success('Lead converted successfully')
          setSubmitting(false)
        }
      } catch (err: any) {
        console.error('Error in process completion:', err)
        toast.error(err?.message || 'Failed to convert lead')
        setSubmitting(false)
      }
    }

    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener)

    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener)
    }
  }, [])

  // Load catalogs
  useEffect(() => {
    async function loadCatalogs() {
      setCatalogsLoading(true)
      try {
        const [currenciesResponse, countriesResponse, regionsResponse, academicTitlesResponse] = await Promise.all([
          catalogManagerClient.getCatalogEntriesList({
            catalogIdentifier: 'Currency',
            version: 'v1'
          }),
          catalogManagerClient.getCatalogEntriesList({
            catalogIdentifier: 'Country',
            version: 'v1'
          }),
          catalogManagerClient.getCatalogEntriesList(
            { catalogIdentifier: 'CountryRegion', version: 'v1' },
            {
              limit: 20,
              offset: 0,
              returnTotalRecords: true,
              includeChildCatalogEntries: true
            }
          ),
          catalogManagerClient.getCatalogEntriesList({
            catalogIdentifier: 'AcademicTitle',
            version: 'v1'
          })
        ])

        setCurrencies(currenciesResponse.data || [])
        setCountries(countriesResponse.data || [])
        setRegions(regionsResponse.data || [])
        setAcademicTitles(academicTitlesResponse.data || [])
      } catch (error) {
        console.error('Error loading catalogs:', error)
      } finally {
        setCatalogsLoading(false)
      }
    }

    if (accessToken) {
      loadCatalogs()
    }
  }, [accessToken])

  useEffect(() => {
    const leadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId
    async function fetchLead() {
      setLoading(true)
      try {
        const data = await graphQLClient.request(LEAD_QUERY, {
          leadId: leadId
        })
        setLeadData(data?.Lead?.[0] || null)
      } catch {
        setLeadData(null)
      } finally {
        setLoading(false)
      }
    }
    if (additionalData?.leadId || additionalData?.psi_taskPayload.psi_initialParameters.leadId) fetchLead()
  }, [additionalData?.leadId, additionalData?.psi_taskPayload?.psi_initialParameters?.leadId, graphQLClient])

  // Note: Employee data is now loaded via useEmployeePositions hook
  // Contacts moved to ContactSection component

  // Contact debugging moved to ContactSection component

  // Note: Pre-filling removed - data structure access issues

  // Contact functions moved to ContactSection component

  // Contact search effects moved to ContactSection component

  // Note: Employee search is now handled by useEmployeePositions hook via searchEmployeePositions function

  // Note: Removed opportunity search function since we only create new opportunities

  // Debounced contact search moved to ContactSection component
  // Note: Employee search debouncing is now handled internally by useEmployeePositions hook

  // Helper function to check if address has meaningful data
  const hasAddressData = (address: any) => {
    return (
      address &&
      (address.addressLine ||
        address.addressLine2 ||
        address.city ||
        address.postalCode ||
        address.countryRef ||
        address.regionRef ||
        address.region)
    )
  }

  // Helper function to format address with all required fields
  const formatAddress = (address: any) => {
    if (!address) return null
    return {
      addressLine: address.addressLine || null,
      city: address.city || null,
      postalCode: address.postalCode || null,
      countryRef: address.countryRef || null,
      regionRef: address.regionRef || null
    }
  }

  const handleSubmit = (values: any) => {
    setSubmitting(true)
    try {
      const payload: any = {
        leadId: additionalData?.leadId
      }

      // Handle Account
      if (accountOption === 'match' && selectedAccount) {
        payload.account = {
          id: selectedAccount,
          ownerEmployee: selectedAccountOwnerEmployee || null
        }
      } else if (accountOption === 'new') {
        payload.account = {
          name: values.newAccountName,
          legalFormRef: values.accountLegalForm || null,
          industryRef: values.accountIndustry || null,
          description: values.accountDescription || null,
          sourceApp: values.accountSourceApp || 'CRM',
          foundationDate: values.accountFoundationDate ? new Date(values.accountFoundationDate).toISOString() : null,
          website: values.accountWebsite || null,
          // Contact Information
          email: values.accountEmail || null,
          phone: values.accountPhone || null,
          fax: values.accountFax || null,
          // Financial Information
          annualRevenueRef: values.accountAnnualRevenue || null,
          numberOfEmployeesRef: values.accountNumberOfEmployees || null,
          currencyRef: values.accountCurrency || null,
          //   timeZoneRef: values.accountTimeZone || null,
          tickerSymbol: values.accountTickerSymbol || null,
          sicCodeRef: values.accountSicCode || null,
          ownerEmployee: values.accountOwnerEmployee || null
          // addresses: hasAddressData(values.accountAddresses)
          //   ? [formatEnhancedAddress(values.accountAddresses)]
          //   : [],
        }
      }

      // Handle Contact
      if (contactOption === 'match' && selectedContact) {
        payload.contact = {
          id: selectedContact
        }
      } else if (contactOption === 'new') {
        payload.contact = {
          code: values.contactCode || null,
          firstName: values.newContactFirstName,
          lastName: values.newContactLastName,
          academicTitleRef: values.contactAcademicTitle || null,
          languageRef: values.contactLanguage || null,
          email: values.newContactEmail || null,
          phone: values.newContactPhone || null,
          fax: values.contactFax || null,
          linkedinUrl: values.contactLinkedinUrl || null,
          xingUrl: values.contactXingUrl || null,
          jobTitle: values.contactJobTitle || null,
          department: values.contactDepartment || null,
          contactType: values.contactType || null,
          sourceApp: values.contactSourceApp || 'CRM',
          workExperienceYears: values.contactWorkExperienceYears || 0,
          birthDate: values.contactBirthDate ? new Date(values.contactBirthDate).toISOString() : null,
          pictureUrl: values.contactPictureUrl || null,
          bio: values.contactBio || null,
          notesSummary: values.contactNotesSummary || null,
          account: values.contactCompanyId || null, // Company/Account ID
          ownerEmployee: values.contactOwnerEmployee || null,
          addresses: hasAddressData(values.contactAddresses) ? [formatAddress(values.contactAddresses)] : []
        }
      }

      // Handle Opportunity
      if (createOpportunity) {
        payload.opportunity = {
          additionalProperties: null,
          name: values.opportunityName,
          lastInteraction: values.opportunityLastInteraction
            ? new Date(values.opportunityLastInteraction).toISOString()
            : null,
          closeDate: values.opportunityExpectedCloseDate
            ? new Date(values.opportunityExpectedCloseDate).toISOString()
            : null,
          estimatedAmount: values.opportunityEstimatedAmount || 0,
          winningChance: values.opportunityWinningChance || 0,
          currencyRef: values.opportunityCurrency || null,
          sourceApp: values.opportunitySourceApp || 'CRM',
          salesPipelineRef: values.opportunityPipeline || null,
          salesPipelineStageRef: values.opportunitySalesPipelineStage || null,
          status: values.opportunityStatus || null,
          ownerEmployee: values.opportunityOwnerEmployee || null,
          notesSummary: values.opportunityNoteSummary || null
        }
      }

      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (error) {
      console.error('Error submitting convert lead form:', error)
      toast.error('Failed to convert lead')
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {})
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  const renderAddressForm = (prefix: string, label: string) => (
    <div className="gba:mb-4">
      <h5 className="gba:text-lg gba:font-semibold gba:mb-3 gba:text-gray-900">{label}</h5>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2 gba:space-y-2">
        {/* Country and Region - First row */}
        <div>
          <Form.Item
            name={[prefix, 'countryRef']}
            label={getTranslationFromI18nKeyAndLabel('crm:address.country', 'Country')}
          >
            <SearchableSelect
              name={`${prefix}-countryRef`}
              value={form.getFieldValue([prefix, 'countryRef'])}
              placeholder={getTranslationFromI18nKeyAndLabel('crm:address.selectCountry', 'Select Country')}
              options={stringCountries as any}
              loading={countriesHook.loading}
              hasMore={countriesHook.hasMore}
              onSearch={countriesHook.search}
              onLoadMore={countriesHook.loadMore}
              onChange={value => {
                form.setFieldsValue({
                  [prefix]: {
                    ...form.getFieldValue(prefix),
                    countryRef: value
                  }
                })
              }}
              error={countriesHook.error}
              data-testid={`${prefix}-country-select`}
            />
          </Form.Item>
        </div>
        <div>
          <Form.Item
            name={[prefix, 'region']}
            label={getTranslationFromI18nKeyAndLabel('crm:address.regionState', 'Region/State')}
          >
            <DesignInput
              data-testid={`${prefix}-region-input`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'crm:address.regionPlaceholder',
                'Enter region or state...'
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>

        {/* Address Lines - Full width */}
        <div className="gba:md:col-span-2">
          <Form.Item
            name={[prefix, 'addressLine']}
            label={getTranslationFromI18nKeyAndLabel('crm:address.addressLine1', 'Address Line 1')}
          >
            <DesignInput
              data-testid={`${prefix}-address-line-1`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'crm:address.addressLine1Placeholder',
                'Enter street address...'
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>
        <div className="gba:md:col-span-2">
          <Form.Item
            name={[prefix, 'addressLine2']}
            label={getTranslationFromI18nKeyAndLabel('crm:address.addressLine2', 'Address Line 2')}
          >
            <DesignInput
              data-testid={`${prefix}-address-line-2`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'crm:address.addressLine2Placeholder',
                'Apartment, suite, unit, etc. (optional)'
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>

        {/* Postal Code and City - Second row */}
        <div>
          <Form.Item
            name={[prefix, 'postalCode']}
            label={getTranslationFromI18nKeyAndLabel('crm:address.postalCode', 'Postal Code')}
          >
            <DesignInput
              data-testid={`${prefix}-postal-code`}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'crm:address.postalCodePlaceholder',
                'Enter postal code...'
              )}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>
        <div>
          <Form.Item name={[prefix, 'city']} label={getTranslationFromI18nKeyAndLabel('crm:address.city', 'City')}>
            <DesignInput
              data-testid={`${prefix}-city`}
              placeholder={getTranslationFromI18nKeyAndLabel('crm:address.cityPlaceholder', 'Enter city...')}
              className="gba:h-11 gba:px-3 gba:text-sm"
            />
          </Form.Item>
        </div>
      </div>
    </div>
  )

  // Separate address form for opportunity section without country and region
  const renderOpportunityAddressForm = (prefix: string, label: string) => (
    <div className="gba:mb-4">
      <h5 className="gba:text-lg gba:font-semibold gba:mb-3 gba:text-gray-900">{label}</h5>
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2 gba:space-y-2">
        <div className="gba:md:col-span-2">
          <Form.Item
            name={[prefix, 'addressLine']}
            label={getTranslationFromI18nKeyAndLabel('crm:address.addressLine', 'Address Line')}
          >
            <DesignInput data-testid={`${prefix}-address-line`} className="gba:h-11 gba:px-3 gba:text-sm" />
          </Form.Item>
        </div>
        <div>
          <Form.Item name={[prefix, 'city']} label={getTranslationFromI18nKeyAndLabel('crm:address.city', 'City')}>
            <DesignInput data-testid={`${prefix}-city`} className="gba:h-11 gba:px-3 gba:text-sm" />
          </Form.Item>
        </div>
        <div>
          <Form.Item
            name={[prefix, 'postalCode']}
            label={getTranslationFromI18nKeyAndLabel('crm:address.postalCode', 'Postal Code')}
          >
            <DesignInput data-testid={`${prefix}-postal-code`} className="gba:h-11 gba:px-3 gba:text-sm" />
          </Form.Item>
        </div>
      </div>
    </div>
  )

  if (loading || catalogsLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="loading-container">
        <Spinner className="gba:w-8 gba:h-8" />
        <div className="gba:mt-4">
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('common:loading', 'Loading...')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:p-6 gba:bg-hsl(var(--background)) gba:rounded-lg gba:shadow-md"
      data-testid="convert-lead-form-container"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        data-testid="convert-lead-form"
        initialValues={{
          accountSourceApp: 'IRM',
          contactSourceApp: 'IRM',
          opportunityWinningChance: 50,
          opportunitySourceApp: 'IRM'
        }}
      >
        <h1
          className="gba:text-3xl gba:font-black gba:mb-6 gba:text-center gba:text-gray-900"
          style={{
            fontSize: '2rem',
            fontWeight: '900',
            lineHeight: '1.2',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}
          className="gba:text-foreground"
        >
          {getTranslationFromI18nKeyAndLabel('crm:convertLead.title', 'Convert Lead')}
        </h1>

        {/* Lead Information Display */}
        <Card className="gba:mb-4" data-testid="lead-info-card">
          <CardHeader>
            <CardTitle className="gba:text-lg gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('crm:convertLead.leadInfo', 'Lead Information')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
              <div className="gba:space-y-2">
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('crm:lead.name', 'Name')}
                </span>
                <div className="gba:font-medium gba:text-base gba:text-gray-900" data-testid="lead-name">
                  {leadData?.name || `${leadData?.firstName} ${leadData?.lastName}`}
                </div>
              </div>
              <div className="gba:space-y-2">
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('crm:lead.company', 'Company')}
                </span>
                <div className="gba:font-medium gba:text-base gba:text-gray-900" data-testid="lead-company">
                  {leadData?.companyName}
                </div>
              </div>
              <div className="gba:space-y-2">
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('crm:lead.email', 'Email')}
                </span>
                <div className="gba:font-medium gba:text-base gba:text-gray-900" data-testid="lead-email">
                  {leadData?.email}
                </div>
              </div>
              <div className="gba:space-y-2">
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('crm:lead.phone', 'Phone')}
                </span>
                <div className="gba:font-medium gba:text-base gba:text-gray-900" data-testid="lead-phone">
                  {leadData?.phone}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="gba:my-6" />

        {/* Account Section */}
        <AccountSection
          accessToken={accessToken}
          form={form}
          accountOption={accountOption}
          setAccountOption={setAccountOption}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          onSelectedAccountChange={handleSelectedAccountChange}
        />

        <Separator className="gba:my-6" />

        {/* Contact Section */}
        <ContactSection
          accessToken={accessToken}
          form={form}
          contactOption={contactOption}
          setContactOption={setContactOption}
          selectedContact={selectedContact}
          setSelectedContact={setSelectedContact}
          simpleAccounts={simpleAccounts}
          simpleAccountsLoading={simpleAccountsLoading}
          simpleAccountsHasMore={simpleAccountsHasMore}
          searchSimpleAccounts={searchSimpleAccounts}
          loadMoreSimpleAccounts={loadMoreSimpleAccounts}
          simpleAccountsError={simpleAccountsError}
        />

        <Separator className="gba:my-6" />

        {/* Create Opportunity Checkbox */}
        <Card className="gba:mb-4" data-testid="create-opportunity-card">
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:space-x-4">
              <DesignCheckbox
                id="create-opportunity-checkbox"
                checked={createOpportunity}
                onCheckedChange={checked => {
                  setCreateOpportunity(checked === true)
                }}
                data-testid="create-opportunity-checkbox"
              />
              <Label
                htmlFor="create-opportunity-checkbox"
                className="gba:text-sm gba:font-medium gba:text-gray-900 gba:cursor-pointer"
                style={{ marginLeft: '5px' }}
              >
                {getTranslationFromI18nKeyAndLabel('crm:convertLead.createOpportunity', 'Create Opportunity')}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Opportunity Section - Only show if createOpportunity is checked */}
        {createOpportunity && (
          <OpportunitySection
            accessToken={accessToken}
            form={form}
            opportunityEmployeePositions={opportunityEmployeePositions}
            opportunityEmployeePositionsLoading={opportunityEmployeePositionsLoading}
            opportunityEmployeePositionsHasMore={opportunityEmployeePositionsHasMore}
            loadMoreOpportunityEmployeePositions={loadMoreOpportunityEmployeePositions}
            searchOpportunityEmployeePositions={searchOpportunityEmployeePositions}
            opportunityEmployeePositionsError={opportunityEmployeePositionsError}
          />
        )}

        {/* Form Actions */}
        <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-6">
          <DesignButton
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="gba:min-w-[120px] gba:h-11"
            data-testid="convert-lead-cancel-button"
            disabled={submitting}
          >
            {getTranslationFromI18nKeyAndLabel('common:button.cancel', 'Cancel')}
          </DesignButton>
          <DesignButton
            type="submit"
            className="gba:min-w-[120px] gba:h-11"
            data-testid="convert-lead-submit-button"
            disabled={submitting}
          >
            {submitting
              ? getTranslationFromI18nKeyAndLabel('crm:convertLead.converting', 'Converting...')
              : getTranslationFromI18nKeyAndLabel('crm:convertLead.convertLead', 'Convert Lead')}
          </DesignButton>
        </div>
      </Form>
      <Toaster />
    </div>
  )
}

export default ConvertLeadForm
