import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  ContactLayout,
  type ContactViewConfig,
  type ContactStatisticsData
} from '@/common/components/common-relations/view-layouts/contact-layout'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { INVESTMENT_CONTACT_DESCRIPTORS } from '@/common/data/investment/types/investmentContactTypes'
import {
  commonContactColumns,
  commonContactFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useInvestmentContactStatistics } from '@/common/data/investment/hooks/useInvestmentContactStatistics'
import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchInvestmentContacts } = useInvestmentContacts(context)
  const contactStatistics = useInvestmentContactStatistics(context)

  // Statistics - Transform hook data to ContactStatisticsData format
  const contactStatisticsData: ContactStatisticsData | undefined = useMemo(() => {
    if (!contactStatistics.trendData) return undefined
    return {
      recentContacts: contactStatistics.trendData.recentContacts,
      activeContacts: contactStatistics.trendData.activeContacts,
      emailEngagements: contactStatistics.trendData.emailEngagements,
      contactsThisYear: contactStatistics.trendData.contactsThisYear,
      isLoading: contactStatistics.isLoading,
      error: contactStatistics.error,
      refetch: contactStatistics.refetch
    }
  }, [contactStatistics])

  // Config
  const config: ContactViewConfig<Contact, InvestmentContactQueryVariables> = useMemo(
    () => ({
      fetchContacts: fetchInvestmentContacts,
      createColumns: () =>
        commonContactColumns({
          buildAccountRecordUrl: accountId => buildPlatformUrl('/platform/irm/account-record', { accountId })
        }),
      descriptors: INVESTMENT_CONTACT_DESCRIPTORS,
      entityName: 'InvestmentContact',
      columnLabels: {
        contact: 'Contact',
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: 'Full Name',
        department: 'Department',
        jobPosition: 'Job Position',
        accountContacts: 'Account',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date',
        updatedAt: 'Updated Date'
      },
      baseFilterConfig: commonContactFilterConfig,
      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
      }) => {
        const vars: InvestmentContactQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        // Normalize date range filters
        const dateRangeKeys = ['createdAtRange', 'updatedAtRange']
        for (const rangeKey of dateRangeKeys) {
          const normalized = normalizeDateRange(params.selectedFilters[rangeKey])
          if (normalized) {
            const baseKey = rangeKey.replace('Range', '')
            if (normalized.from) vars[`${baseKey}From` as keyof InvestmentContactQueryVariables] = normalized.from
            if (normalized.to) vars[`${baseKey}To` as keyof InvestmentContactQueryVariables] = normalized.to
          }
        }

        // Copy all other filters directly (they now match Descriptor-Keys)
        for (const key of Object.keys(params.selectedFilters)) {
          if (
            !dateRangeKeys.includes(key) &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof InvestmentContactQueryVariables] = params.selectedFilters[key]
          }
        }

        // Use column ID directly - buildOrderBy will use descriptors (INVESTMENT_CONTACT_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., account.name, ownerEmployee.displayName)
        // Special handling for composite 'contact' column
        if (params.sorting.length > 0) {
          const columnId = params.sorting[0].id
          const direction = params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

          if (columnId === 'contact') {
            // Sort by firstName, then lastName
            vars.orderBy = [
              { field: 'firstName', direction },
              { field: 'lastName', direction }
            ]
          } else {
            vars.orderBy = [{ field: columnId as any, direction }]
          }
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.investmentContactEntity,
        createContext: FlowContextName.investmentContactCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/irm/contact-record', { contactId: id }),
      contactStatistics: contactStatisticsData,
      rowActionsContextArray: [FlowContextName.investmentContactEntity],
      buildRowActionsExternalContextData: (row: { original: Contact }) => ({
        contactId: row.original.id
      }),
      translations: {
        allContacts: { key: 'common:allContacts', default: 'All Contacts' },
        searchContacts: { key: 'common:searchContacts', default: 'Search contacts...' },
        filterContacts: { key: 'common:filterContacts', default: 'Filter Contacts' },
        filterContactsDescription: {
          key: 'common:filterContactsDescription',
          default: 'Apply filters to narrow down the contact list'
        },
        addContact: { key: 'irm:contact.addContact', default: 'Add Contact' }
      }
    }),
    [fetchInvestmentContacts, contactStatisticsData, accessToken]
  )

  return <ContactLayout context={context} config={config} dataTestId="investment-contact-view" />
}

export default ContactView
