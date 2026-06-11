import React, { useMemo, useCallback, useEffect, useState } from 'react'
import {
  Button,
  Spinner,
  Alert,
  AlertDescription,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  toast
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useForm, FormProvider } from 'react-hook-form'
import { EntitySelect } from '@/common/components/common-relations/selects/reference-select'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useOpportunityData } from './hooks/useOpportunityData'
import { useOpportunityAccounts } from './hooks/useOpportunityAccounts'
import { useOpportunityContacts } from './hooks/useOpportunityContacts'
import { useCompanyExecutives } from './hooks/useCompanyExecutives'
import { useNdaReportGeneration } from './hooks/useNdaReportGeneration'
import InvestmentCompanyInfo from './components/InvestmentCompanyInfo'

export interface GenerateNdaPopupValues {
  opportunityId: string
  accountId: string
  contactId: string
  executiveId: string
}

export interface GenerateNdaPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<GenerateNdaPopupValues>
  onClose?: () => void
  onSuccess?: (reportUrl?: string) => void
  onError?: (error: Error) => void
}

interface FormValues {
  accountId: string
  contactId: string
  executiveId: string
}

const prefixDataTestId = 'GenerateNdaPopup'

const GenerateNdaPopup: React.FC<GenerateNdaPopupProps> = ({ initialValues = {}, ...props }) => {
  const [preselectedAccountId, setPreselectedAccountId] = useState<string | null>(null)
  const [preselectedContactId, setPreselectedContactId] = useState<string | null>(null)
  const [preselectedExecutiveId, setPreselectedExecutiveId] = useState<string | null>(null)
  const [isGeneratingNda, setIsGeneratingNda] = useState(false)
  const [ndaError, setNdaError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    defaultValues: {
      accountId: '',
      contactId: '',
      executiveId: ''
    }
  })

  // Extract opportunity ID from additionalData (standard pattern)
  const opportunityId =
    props.additionalData?.opportunityId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
    props.additionalData?.id ||
    initialValues?.opportunityId ||
    ''

  // Load opportunity data
  const {
    opportunity,
    loading: opportunityLoading,
    error: opportunityError
  } = useOpportunityData(props.accessToken || '', opportunityId)

  // Load opportunity accounts with pagination and search
  const {
    accounts,
    loading: accountsLoading,
    hasMore: hasMoreAccounts,
    search: searchAccounts,
    loadMore: loadMoreAccounts
  } = useOpportunityAccounts(opportunity, preselectedAccountId)

  // Load opportunity contacts with local search
  const {
    contacts,
    loading: contactsLoading,
    hasMore: hasMoreContacts,
    search: searchContacts,
    loadMore: loadMoreContacts
  } = useOpportunityContacts(opportunity, preselectedContactId)

  // Load investment company executives (employee-backed, or contact-backed when no employee) with local search
  const {
    executives,
    loading: executivesLoading,
    hasMore: hasMoreExecutives,
    search: searchExecutives,
    loadMore: loadMoreExecutives
  } = useCompanyExecutives(opportunity, preselectedExecutiveId)

  // NDA report generation
  const { generateNdaReport } = useNdaReportGeneration(props.accessToken || '')

  // Prepare account entities for EntitySelect
  const accountEntities = useMemo(() => {
    return accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: 'account',
      subtitle: acc.subtitle || ' '
    }))
  }, [accounts])

  // Prepare contact entities for EntitySelect
  const contactEntities = useMemo(() => {
    return contacts.map(cont => ({
      id: cont.id,
      name: cont.name || 'Contact',
      type: 'contact',
      subtitle: cont.subtitle || ' ',
      pictureThumbnail: cont.pictureThumbnail
    }))
  }, [contacts])

  // Prepare executive entities for EntitySelect (name + job position)
  const executiveEntities = useMemo(() => {
    return executives.map(exec => ({
      id: exec.id,
      name: exec.name || 'Executive',
      type: 'employee',
      subtitle: exec.jobPosition || ' ',
      pictureThumbnail: exec.pictureThumbnail
    }))
  }, [executives])

  // Initialize accounts, contacts, and employees when opportunity loads
  useEffect(() => {
    if (!opportunity) return

    // Set preselected account from opportunity - prefer Investment type
    const investmentAccount = opportunity.opportunityAccounts.find(oa => oa.accountType?.value === 'Investment')
    const firstOpportunityAccount = investmentAccount || opportunity.opportunityAccounts[0]
    if (firstOpportunityAccount) {
      const selectedAccountId = firstOpportunityAccount.account.id
      setPreselectedAccountId(selectedAccountId)
      form.setValue('accountId', selectedAccountId)
    }

    // Set preselected contact from opportunity
    const firstOpportunityContact = opportunity.investmentOpportunityContact?.[0]
    if (firstOpportunityContact) {
      const selectedContactId = firstOpportunityContact.contact.id
      setPreselectedContactId(selectedContactId)
      form.setValue('contactId', selectedContactId)
    }

    // Preselect the first executive of the investment company, preferring an
    // employee-backed one but falling back to a contact-backed executive.
    const companyExecutives = opportunity.investmentCompany?.investmentCompanyExecutive
    const firstExecutive =
      companyExecutives?.find(exec => exec.employee) || companyExecutives?.find(exec => exec.investmentContact)
    if (firstExecutive) {
      setPreselectedExecutiveId(firstExecutive.id)
      form.setValue('executiveId', firstExecutive.id)
    }

    // Note: accounts, contacts and executives are already loaded from opportunity data
  }, [opportunity, form])

  // Helper: Download and preview NDA file
  const downloadAndPreviewNda = useCallback((reportUrl: string, filename: string) => {
    const fileUrl = buildPlatformUrl(reportUrl)

    // Open for preview
    window.open(fileUrl, '_blank')

    // Trigger download
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()

    toast.success('NDA document generated and downloaded successfully')
  }, [])

  // Centralized closing logic (DRY principle)
  const handleClose = useCallback(() => {
    if (props.onClose) {
      props.onClose()
    } else {
      // Dispatch pause event to close the popup (process flow)
      dispatchProcessContinueEvent('pse_pause', {})
    }
  }, [props])

  const handleCancel = useCallback(() => {
    handleClose()
  }, [handleClose])

  const handleSubmit = useCallback(async () => {
    setIsGeneratingNda(true)
    setNdaError(null)

    try {
      const formValues = form.getValues()

      // Validate that all required fields are selected
      if (!opportunity) {
        throw new Error('Opportunity data not available')
      }

      // At least one of account or contact must be selected
      if (!formValues.accountId && !formValues.contactId) {
        throw new Error('Please select at least one: Account or Contact')
      }

      // Find selected account (optional)
      const selectedAccount = formValues.accountId
        ? accounts.find(acc => acc.id === formValues.accountId) || null
        : null

      // Find selected contact (optional)
      const selectedContact = formValues.contactId
        ? contacts.find(cont => cont.id === formValues.contactId) || null
        : null

      // Find selected investment company executive (optional)
      const selectedExecutive = formValues.executiveId
        ? executives.find(exec => exec.id === formValues.executiveId) || null
        : null

      // Validate that we have the necessary data for selected entities
      if (formValues.accountId && !selectedAccount) {
        throw new Error('Selected account not found')
      }
      if (formValues.contactId && !selectedContact) {
        throw new Error('Selected contact not found')
      }

      // Generate NDA report
      const response = await generateNdaReport({
        opportunity,
        account: selectedAccount,
        contact: selectedContact,
        executive: selectedExecutive
      })

      if (!response.success || !response.reportUrl) {
        throw new Error(response.message || 'Failed to generate NDA report')
      }

      // Download and preview the generated NDA
      downloadAndPreviewNda(response.reportUrl, response.filename || 'NDA.pdf')

      // Call success callback if provided
      props.onSuccess?.(response.reportUrl)

      // Close modal after a brief delay to ensure download starts
      setTimeout(() => {
        handleClose()
      }, 500)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setNdaError(error.message)
      console.error('Failed to generate NDA:', error.message)

      // Call error callback if provided
      props.onError?.(error)
    } finally {
      setIsGeneratingNda(false)
    }
  }, [opportunity, accounts, contacts, executives, form, generateNdaReport, props, handleClose])

  // Early validation - must be after all hooks
  if (!opportunityId) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'missing-id')}>
        <Alert variant="destructive">
          <AlertDescription>
            Opportunity ID not provided. Please open this popup from an opportunity context.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (opportunityLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:min-h-80"
        data-testid={formatDataTestId(prefixDataTestId, 'loading')}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (opportunityError) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription>{opportunityError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'not-found')}>
        <Alert variant="default">
          <AlertDescription>Opportunity not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <FormProvider {...form}>
      <div
        className="gba:px-6 gba:py-6 gba:w-full gba:max-w-[600px]"
        data-testid={formatDataTestId(prefixDataTestId, 'container')}
      >
        <div className="gba:space-y-5">
          {/* Error Alert */}
          {ndaError && (
            <Alert
              variant="destructive"
              className="gba:mb-4"
              data-testid={formatDataTestId(prefixDataTestId, 'error-alert')}
            >
              <AlertDescription>{ndaError}</AlertDescription>
            </Alert>
          )}

          {/* Account Selection */}
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem className="gba:mb-6">
                <FormLabel className="gba:mb-2 gba:block">Account</FormLabel>
                <FormControl className="gba:w-full">
                  <EntitySelect
                    entities={accountEntities}
                    value={field.value || ''}
                    onValueChange={(v: string | null) => field.onChange(v || '')}
                    onSearch={searchAccounts}
                    loading={accountsLoading}
                    hasMore={hasMoreAccounts}
                    onLoadMore={loadMoreAccounts}
                    placeholder="Select an account"
                    searchPlaceholder="Search accounts..."
                    data-testid={formatDataTestId(prefixDataTestId, 'account-select')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact Selection */}
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem className="gba:mb-6">
                <FormLabel className="gba:mb-2 gba:block">Contact</FormLabel>
                <FormControl className="gba:w-full">
                  <EntitySelect
                    entities={contactEntities}
                    value={field.value || ''}
                    onValueChange={(v: string | null) => field.onChange(v || '')}
                    onSearch={searchContacts}
                    loading={contactsLoading}
                    hasMore={hasMoreContacts}
                    onLoadMore={loadMoreContacts}
                    placeholder="Select a contact"
                    searchPlaceholder="Search contacts..."
                    data-testid={formatDataTestId(prefixDataTestId, 'contact-select')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Our Side: Investment Company (fixed) */}
          <FormItem className="gba:mb-6">
            <FormLabel className="gba:mb-2 gba:block">Investment Company</FormLabel>
            <InvestmentCompanyInfo
              company={opportunity.investmentCompany}
              dataTestId={formatDataTestId(prefixDataTestId, 'investment-company')}
            />
          </FormItem>

          {/* Our Side: Investment Company Executive Selection */}
          <FormField
            control={form.control}
            name="executiveId"
            render={({ field }) => (
              <FormItem className="gba:mb-6">
                <FormLabel className="gba:mb-2 gba:block">Investment Company Executive</FormLabel>
                <FormControl className="gba:w-full">
                  <EntitySelect
                    entities={executiveEntities}
                    value={field.value || ''}
                    onValueChange={(v: string | null) => field.onChange(v || '')}
                    onSearch={searchExecutives}
                    loading={executivesLoading}
                    hasMore={hasMoreExecutives}
                    onLoadMore={loadMoreExecutives}
                    placeholder="Select an executive"
                    searchPlaceholder="Search executives..."
                    data-testid={formatDataTestId(prefixDataTestId, 'executive-select')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Buttons */}
          <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-6 gba:mt-2 gba:border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isGeneratingNda}
              data-testid={formatDataTestId(prefixDataTestId, 'cancel-button')}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={(!form.watch('accountId') && !form.watch('contactId')) || isGeneratingNda}
              data-testid={formatDataTestId(prefixDataTestId, 'submit-button')}
            >
              {isGeneratingNda ? 'Generating NDA...' : 'Generate NDA'}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  )
}

export default GenerateNdaPopup
