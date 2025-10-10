import React, { useCallback, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import AccountSegment from '@/common/components/common-relations/form-segments/account-segment/AccountSegment'
import {
  createAccountSegmentResolver,
  type AccountSegmentSchema
} from '@/common/components/common-relations/form-segments/account-segment/schema'
import { useInvestmentEntities } from '@/common/data/investment/hooks'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'

export interface AccountExampleFormProps extends BusinessAppContextProps {
  onSuccess?: (data: AccountSegmentSchema) => void
  onCancel?: () => void
}

type FormData = AccountSegmentSchema & { id?: string; version?: number }

const initialFormData: FormData = {
  ownerEmployeeId: '',
  accountName: '',
  legalFormRef: '',
  industryRef: '',
  website: '',
  description: '',
  phone: '',
  email: '',
  geographicPresence: '',
  relatedEntityId: ''
}

const AccountExampleForm: React.FC<AccountExampleFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onSuccess,
  onCancel
}) => {
  const [formData] = useState<FormData>(initialFormData)

  // Shared central investment entity search (lead/contact/account/opportunity)
  const {
    entities,
    loading: entitiesLoading,
    hasMore: entitiesHasMore,
    searchEntities,
    loadMore: loadMoreEntities
  } = useInvestmentEntities({ accessToken, additionalData })

  // Owner employee search
  const {
    employees,
    search: searchEmployees,
    loading: employeesLoading,
    hasMore: employeesHasMore,
    loadMore: loadMoreEmployees
  } = useEmployeeSearch(accessToken)

  // Platform context entity hints
  const platformParams = useMemo(() => {
    const nested =
      (additionalData as any)?.psi_taskPayload?.psi_initialParameters ||
      (additionalData as any)?.psi_initialParameters ||
      {}
    return {
      accountId: (additionalData as any)?.accountId || nested?.accountId,
      contactId: (additionalData as any)?.contactId || nested?.contactId,
      opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
      leadId: (additionalData as any)?.leadId || nested?.leadId
    } as { accountId?: string; contactId?: string; opportunityId?: string; leadId?: string }
  }, [additionalData])

  const hasEntityFromContext = Boolean(
    platformParams.accountId || platformParams.contactId || platformParams.opportunityId || platformParams.leadId
  )

  const form = useForm<any>({
    resolver: createAccountSegmentResolver(),
    defaultValues: formData as any,
    mode: 'onChange'
  })

  const handleEntitySearch = useCallback(
    (q: string) => {
      if ((q || '').trim().length === 0 || (q || '').trim().length >= 2) {
        searchEntities(q)
      }
    },
    [searchEntities]
  )

  const handleSubmit = useCallback(
    async (_: AccountSegmentSchema) => {
      const allValues = (form as any).getValues?.() || {}
      // Example payload echoing the collected values. Platform process can map as needed.
      const entityRef = (() => {
        if (allValues.account?.id) return { account: { id: allValues.account.id } }
        if (allValues.contact?.id) return { contact: { id: allValues.contact.id } }
        if (allValues.opportunity?.id) return { opportunity: { id: allValues.opportunity.id } }
        if (allValues.lead?.id) return { lead: { id: allValues.lead.id } }
        return {} as any
      })()
      return {
        type: 'InvestmentAccountExample',
        ownerEmployeeId: allValues.ownerEmployeeId,
        name: allValues.accountName,
        legalFormRef: allValues.legalFormRef,
        industryRef: allValues.industryRef,
        website: allValues.website,
        mission: allValues.description,
        phone: allValues.phone,
        email: allValues.email,
        geographicPresence: allValues.geographicPresence,
        ...entityRef
      }
    },
    [form]
  )

  const handleSuccess = useCallback(() => {
    onSuccess?.(formData)
  }, [formData, onSuccess])

  return (
    <AppActionForm
      processType={'create'}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="platform-account-example-form"
    >
      <AccountSegment
        // Labels
        ownerLabel={getTranslationFromI18nKeyAndLabel('crm:account.owner', 'Owner')}
        accountNameLabel={getTranslationFromI18nKeyAndLabel('crm:account.accountName', 'Account Name')}
        legalFormLabel={getTranslationFromI18nKeyAndLabel('crm:account.legalForm', 'Legal Form')}
        industryLabel={getTranslationFromI18nKeyAndLabel('crm:account.industry', 'Industry')}
        websiteLabel={getTranslationFromI18nKeyAndLabel('crm:account.website', 'Website')}
        descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:account.description', 'Description')}
        contactPhoneLabel={getTranslationFromI18nKeyAndLabel('crm:account.phone', 'Phone')}
        contactEmailLabel={getTranslationFromI18nKeyAndLabel('crm:account.email', 'Email')}
        geographicPresenceLabel={getTranslationFromI18nKeyAndLabel(
          'crm:account.geographicPresence',
          'Geographic Presence'
        )}
        annualRevenueLabel={getTranslationFromI18nKeyAndLabel('crm:account.annualRevenue', 'Annual Revenue')}
        numberOfEmployeesLabel={getTranslationFromI18nKeyAndLabel(
          'crm:account.numberOfEmployees',
          'Number of Employees'
        )}
        timeZoneLabel={getTranslationFromI18nKeyAndLabel('crm:account.timeZone', 'Time Zone')}
        foundationDateLabel={getTranslationFromI18nKeyAndLabel('crm:account.foundationDate', 'Foundation Date')}
        tickerSymbolLabel={getTranslationFromI18nKeyAndLabel('crm:account.tickerSymbol', 'Ticker Symbol')}
        liquidationDateLabel={getTranslationFromI18nKeyAndLabel('crm:account.liquidationDate', 'Liquidation Date')}
        missionLabel={getTranslationFromI18nKeyAndLabel('crm:account.mission', 'Mission')}
        specialtyLabel={getTranslationFromI18nKeyAndLabel('crm:account.specialty', 'Specialty')}
        notesSummaryLabel={getTranslationFromI18nKeyAndLabel('crm:account.notesSummary', 'Notes Summary')}
        pictureUploadLabel={getTranslationFromI18nKeyAndLabel('crm:account.picture', 'Picture')}
        communicationChannelsLabel={getTranslationFromI18nKeyAndLabel('crm:account.channels', 'Communication Channels')}
        addressesLabel={getTranslationFromI18nKeyAndLabel('crm:account.addresses', 'Addresses')}
        entityLabel={getTranslationFromI18nKeyAndLabel('crm:common.relatedEntity', 'Related Entity')}
        // Catalogs
        accessToken={accessToken}
        legalFormCatalog={{ identifier: 'LegalForm', version: 'v1' }}
        industryCatalog={{ identifier: 'IndustryClass', version: 'v1' }}
        annualRevenueCatalog={{ identifier: 'AccountAnnualRevenueBand', version: 'v1' }}
        employeeSizeCatalog={{ identifier: 'CompanySize', version: 'v1' }}
        timeZoneCatalog={{ identifier: 'TimeZone', version: 'v1' }}
        communicationChannelCatalog={{ identifier: 'CommunicationChannel', version: 'v1' }}
        addressTypeCatalog={{ identifier: 'AddressType', version: 'v1' }}
        countryCatalog={{ identifier: 'Country', version: 'v1' }}
        // Owner
        assignees={employees as any}
        assigneesLoading={employeesLoading}
        onAssigneeSearch={searchEmployees}
        assigneesHasMore={employeesHasMore}
        onAssigneeLoadMore={loadMoreEmployees}
        // Entities
        showEntitySelection={!hasEntityFromContext}
        entities={entities as any}
        entitiesLoading={entitiesLoading}
        entitiesHasMore={entitiesHasMore}
        onEntitySearch={handleEntitySearch}
        onEntityLoadMore={loadMoreEntities}
        initialEntityFromContext={platformParams}
        data-testid="platform-account-example-segment"
      />
    </AppActionForm>
  )
}

export default AccountExampleForm
