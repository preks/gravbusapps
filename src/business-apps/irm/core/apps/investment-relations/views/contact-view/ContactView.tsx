import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { ContactLayout, type ContactViewConfig } from '@/common/components/common-relations/view-layouts/contact-layout'
import type { InvestmentContact } from '@/common/data/investment/types'
import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createContactColumns,
  createContactSortableColumns
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { contactFilterConfig } from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useContactFilterOptions } from '../contact-view/hooks/useContactFilterOptions'
import { ContactStatistics } from '../contact-view/components/ContactStatistics'
import {
  applyBasicFilters,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/contact-layout/utils/queryHelpers'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)

  const config: ContactViewConfig<InvestmentContact, InvestmentContactQueryVariables> = useMemo(
    () => ({
      contextType: 'investment',

      fetchContacts: async (variables: InvestmentContactQueryVariables) => {
        const result = await fetchInvestmentContacts(variables)
        return {
          contacts: result.InvestmentContact || [],
          total: result.InvestmentContactAggregate?.aggregate?.count || 0
        }
      },

      filterDataHook: useContactFilterOptions,

      createColumns: createContactColumns as any,
      createSortableColumns: createContactSortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        const mapping: Record<string, string> = {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'email',
          phone: 'phone',
          jobPosition: 'jobPosition',
          department: 'department',
          ownerEmployee: 'ownerEmployee',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt'
        }
        return mapping[columnId] || 'createdAt'
      },

      baseFilterConfig: contactFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
        mapColumnToGraphQLField: (columnId: string) => string
      }) => {
        const vars: InvestmentContactQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        applyBasicFilters(vars, params.selectedFilters)
        applyDateFilter(vars, params.selectedFilters)

        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.mapColumnToGraphQLField(params.sorting[0].id) as any,
              direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },

      flowContexts: {
        entityContext: FlowContextName.investmentContactEntity,
        createContext: FlowContextName.investmentContactCreate
      },

      renderStatistics: ({ context: ctx }) => {
        return <ContactStatistics {...ctx} />
      },

      processCompletionEvents: [
        'com.newwork.process.taskCompletion',
        'com.newwork.process.completion',
        'com.newwork.process.continue',
        'com.newwork.process.processCompletion',
        'processCompletion',
        'contactCompletion',
        'contactCompleted'
      ]
    }),
    [context, fetchInvestmentContacts]
  )

  return <ContactLayout context={context} config={config} dataTestId="investment-contact-view" />
}

export default ContactView
