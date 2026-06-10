import { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import {
  commonContactColumns,
  commonContactFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { CUSTOMER_CONTACT_DESCRIPTORS, toCustomerContact } from '@/common/data/customer/types/customerContactTypes'
import {
  buildCustomerContactOrderBy,
  buildCustomerContactQuery,
  buildCustomerContactWhereCondition,
  type CustomerContactQueryVariables
} from '@/common/data/customer/queries/customerContactQueries'

interface CampaignContactEntitiesViewProps extends BusinessAppContextProps {
  campaignId: string
}

const processDateRangeFilters = (selectedFilters: Record<string, any>, vars: CustomerContactQueryVariables): void => {
  const dateRangeKeys = ['createdAtRange', 'updatedAtRange']
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (!normalized) continue
    const baseKey = rangeKey.replace('Range', '')
    if (normalized.from) vars[`${baseKey}From` as keyof CustomerContactQueryVariables] = normalized.from
    if (normalized.to) vars[`${baseKey}To` as keyof CustomerContactQueryVariables] = normalized.to
  }
}

const addCommunicationFilters = (selectedFilters: Record<string, any>, vars: CustomerContactQueryVariables): void => {
  if (!Array.isArray(selectedFilters.communicationChannels) || selectedFilters.communicationChannels.length === 0)
    return
  const filters = selectedFilters.communicationChannels as string[]
  if (filters.includes('has:email')) vars.hasEmail = true
  if (filters.includes('missing:email')) vars.missingEmail = true
  if (filters.includes('has:phone')) vars.hasPhone = true
  if (filters.includes('missing:phone')) vars.missingPhone = true
}

const processSorting = (sorting: Array<{ id: string; desc: boolean }>, vars: CustomerContactQueryVariables): void => {
  if (sorting.length === 0) {
    vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    return
  }
  const columnId = sorting[0].id
  const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
  if (columnId === 'contact') {
    vars.orderBy = [
      { field: 'firstName', direction },
      { field: 'lastName', direction }
    ]
    return
  }
  vars.orderBy = [{ field: columnId as any, direction }]
}

export const CampaignContactEntitiesView: React.FC<CampaignContactEntitiesViewProps> = ({
  accessToken,
  campaignId
}) => {
  const context = useMemo(() => ({ accessToken }), [accessToken])
  const graphqlClient = useGraphQLClient(accessToken)

  const config = useMemo<ContactViewConfig<Contact, CustomerContactQueryVariables>>(
    () => ({
      fetchContacts: async (variables: CustomerContactQueryVariables) => {
        const query = buildCustomerContactQuery()
        const customConditions: Record<string, any>[] = [{ salesCampaignId: { _eq: campaignId } }]

        if (variables.hasEmail) customConditions.push({ email: { _isNull: false, _neq: '' } })
        if (variables.missingEmail)
          customConditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
        if (variables.hasPhone) customConditions.push({ phone: { _isNull: false, _neq: '' } })
        if (variables.missingPhone)
          customConditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })

        const whereCondition = buildCustomerContactWhereCondition(variables, [], customConditions)
        const orderBy = buildCustomerContactOrderBy(variables.orderBy || [])
        const result = await graphqlClient.request<{
          Contact: Contact[]
          ContactAggregate: { aggregate: { count: number } }
        }>(query, {
          limit: variables.limit || 50,
          offset: variables.offset || 0,
          where: whereCondition,
          orderBy
        })

        return {
          contacts: result.Contact.map(toCustomerContact),
          total: result.ContactAggregate?.aggregate?.count || 0
        }
      },
      createColumns: () => commonContactColumns(),
      descriptors: CUSTOMER_CONTACT_DESCRIPTORS,
      entityName: 'Contact',
      columnLabels: {
        contact: 'Contact',
        department: 'Department',
        ownerEmployee: 'Owner',
        createdAt: 'Created Date'
      },
      baseFilterConfig: commonContactFilterConfig,
      buildQueryVariables: ({ pagination, searchTerm, selectedFilters, sorting }) => {
        const vars: CustomerContactQueryVariables = {
          limit: pagination.pageSize,
          offset: pagination.pageIndex * pagination.pageSize,
          search: searchTerm.trim() || undefined
        }
        processDateRangeFilters(selectedFilters, vars)
        addCommunicationFilters(selectedFilters, vars)

        for (const key of Object.keys(selectedFilters)) {
          if (['createdAtRange', 'updatedAtRange', 'communicationChannels'].includes(key)) continue
          if (selectedFilters[key] === undefined || selectedFilters[key] === null) continue
          vars[key as keyof CustomerContactQueryVariables] = selectedFilters[key]
        }

        processSorting(sorting, vars)
        return vars
      },
      flowContexts: {
        entityContext: FlowContextName.customerContactEntity,
        createContext: FlowContextName.customerContactCreate
      },
      buildRecordUrl: (id: string) => buildPlatformUrl('/platform/crm/contact-record', { contactId: id }),
      rowActionsContextArray: [FlowContextName.customerContactEntity],
      buildRowActionsExternalContextData: (row: { original: Contact }) => ({ contactId: row.original.id || '' }),
      translations: {
        allContacts: { key: 'common:allContacts', default: 'All Contacts' },
        searchContacts: { key: 'common:searchContacts', default: 'Search contacts...' },
        filterContacts: { key: 'common:filterContacts', default: 'Filter Contacts' },
        filterContactsDescription: {
          key: 'common:filterContactsDescription',
          default: 'Apply filters to narrow down the contact list'
        },
        addContact: { key: 'common:addContact', default: 'Add Contact' }
      }
    }),
    [campaignId, graphqlClient]
  )

  return (
    <ContactLayout
      context={context}
      config={config}
      customPrimaryAction={<></>}
      dataTestId="campaign-record-contact-view"
      enableExport
      exportFilenamePrefix="campaign-contacts"
    />
  )
}
