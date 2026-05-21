// Customer Data Foundation Debug App - Updated with nw-design-system
import React, { useState } from 'react'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Alert,
  AlertDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Import customer data hooks
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
// Import GraphQL client and query builders directly (avoiding deprecated hooks)
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildCustomerAccountQuery,
  buildCustomerAccountWhereCondition,
  buildCustomerAccountOrderBy,
  type CustomerAccountQueryVariables
} from '@/common/data/customer/queries/customerAccountQueries'
import {
  buildCustomerContactQuery,
  buildCustomerContactWhereCondition,
  buildCustomerContactOrderBy,
  type CustomerContactQueryVariables
} from '@/common/data/customer/queries/customerContactQueries'
import {
  buildCustomerLeadQuery,
  buildCustomerLeadByIdQuery,
  buildCustomerLeadWhereCondition,
  buildCustomerLeadOrderBy,
  type CustomerLeadQueryVariables
} from '@/common/data/customer/queries/customerLeadQueries'
import {
  buildCustomerOpportunityQuery,
  buildCustomerOpportunityWhereCondition,
  buildCustomerOpportunityOrderBy,
  type CustomerOpportunityQueryVariables
} from '@/common/data/customer/queries/customerOpportunityQueries'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { toCustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { toCustomerContact } from '@/common/data/customer/types/customerContactTypes'
import { toCustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import { toCustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import type { CustomerAccountListQueryResponse } from '@/common/data/customer/hooks/useCustomerAccounts'
import type { CustomerContactListQueryResponse } from '@/common/data/customer/hooks/useCustomerContacts'
import type { CustomerLeadListQueryResponse } from '@/common/data/customer/hooks/useCustomerLeads'

// NOTE: Mappers are already applied in hooks!
// Raw data is not exposed by hooks - they return pre-mapped types

type CustomersDebugProps = BusinessAppContextProps

interface TestResult {
  name: string
  status: 'idle' | 'loading' | 'success' | 'error'
  mappedData?: any // Data returned from hooks (already mapped)
  error?: string
  timestamp?: Date
  duration?: number
  query?: string
  variables?: any
}

const DEFAULT_ID = '00000000-0000-0000-0000-000000000001'

const CustomersDebug: React.FC<CustomersDebugProps> = context => {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [leadId, setLeadId] = useState('')

  // Hooks
  const { fetchCustomerTasks } = useCustomerTasks(context)
  const { fetchCustomerActivities } = useCustomerActivities(context)
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Fetch functions using GraphQL client directly (replacing deprecated hooks)
  const fetchCustomerAccounts = async (variables: CustomerAccountQueryVariables = {}) => {
    const query = buildCustomerAccountQuery()
    const whereCondition = buildCustomerAccountWhereCondition(variables)
    const orderBy = buildCustomerAccountOrderBy(variables.orderBy || [])
    const graphQLVariables: Record<string, any> = {
      limit: Math.min(variables.limit || 50, 100),
      offset: variables.offset || 0,
      where: whereCondition,
      orderBy: orderBy
    }
    const result = await graphqlClient.request<CustomerAccountListQueryResponse>(query, graphQLVariables)
    const accounts = result.Account.map(toCustomerAccount)
    const total = result.AccountAggregate?.aggregate?.count || 0
    return { accounts, total }
  }

  const fetchCustomerContacts = async (variables: CustomerContactQueryVariables = {}) => {
    const query = buildCustomerContactQuery()
    const customConditions: Record<string, any>[] = []
    if (variables.hasEmail) customConditions.push({ email: { _isNull: false, _neq: '' } })
    if (variables.missingEmail) customConditions.push({ _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }] })
    if (variables.hasPhone) customConditions.push({ phone: { _isNull: false, _neq: '' } })
    if (variables.missingPhone) customConditions.push({ _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }] })
    const whereCondition = buildCustomerContactWhereCondition(variables, [], customConditions)
    const orderBy = buildCustomerContactOrderBy(variables.orderBy || [])
    const graphQLVariables: Record<string, any> = {
      limit: Math.min(variables.limit || 50, 100),
      offset: variables.offset || 0,
      where: whereCondition,
      orderBy: orderBy
    }
    const result = await graphqlClient.request<CustomerContactListQueryResponse>(query, graphQLVariables)
    const contacts = result.Contact.map(toCustomerContact)
    const total = result.ContactAggregate?.aggregate?.count || 0
    return { contacts, total }
  }

  const fetchCustomerLeads = async (variables: CustomerLeadQueryVariables = {}) => {
    const query = buildCustomerLeadQuery()
    const whereCondition = buildCustomerLeadWhereCondition(variables)
    let orderBy = buildCustomerLeadOrderBy(variables.orderBy || [])
    if (orderBy.length === 0) {
      orderBy = buildCustomerLeadOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])
    }
    const graphQLVariables: Record<string, any> = {
      limit: Math.min(variables.limit || 50, 100),
      offset: variables.offset || 0,
      where: whereCondition,
      orderBy: orderBy
    }
    const result = await graphqlClient.request<CustomerLeadListQueryResponse>(query, graphQLVariables)
    const leads = result.Lead.map(toCustomerLead)
    const total = result.LeadAggregate?.aggregate?.count || 0
    return { leads, total }
  }

  const fetchCustomerLeadById = async (leadId: string) => {
    const query = buildCustomerLeadByIdQuery()
    const result = await graphqlClient.request<{
      LeadByPk: Record<string, unknown> | null
      leadStatuses?: Array<{
        id: string
        code: string
        value: string
        alternativeCode?: string
      }>
    }>(query, { id: leadId })
    if (!result.LeadByPk) {
      throw new Error(`Lead with ID ${leadId} not found`)
    }
    const lead = toCustomerLead(result.LeadByPk)
    return { ...lead, leadStatuses: result.leadStatuses || [] }
  }

  const fetchCustomerOpportunities = async (variables: CustomerOpportunityQueryVariables = {}) => {
    const query = buildCustomerOpportunityQuery()
    const customConditions: Record<string, any>[] = []
    if (variables.currencyCode) {
      customConditions.push({
        currency: { code: { _eq: variables.currencyCode } }
      })
    }
    if ((variables as any).stageValues?.length) {
      customConditions.push({
        _or: [
          { stage: { _in: (variables as any).stageValues } },
          { salesPipelineStage: { value: { _in: (variables as any).stageValues } } }
        ]
      })
    }
    const whereCondition = buildCustomerOpportunityWhereCondition(variables, [] as Descriptor[], customConditions)
    const orderBy = buildCustomerOpportunityOrderBy(variables.orderBy || [])
    const graphQLVariables: Record<string, any> = {
      limit: Math.min(variables.limit || 50, 100),
      offset: variables.offset || 0,
      where: whereCondition,
      orderBy: orderBy
    }
    const result = await graphqlClient.request<{
      Opportunity: any[]
      OpportunityAggregate: {
        aggregate: { count: number }
      }
    }>(query, graphQLVariables)
    const opportunities = result.Opportunity.map(toCustomerOpportunity)
    const total = result.OpportunityAggregate?.aggregate?.count || 0
    return { opportunities, total }
  }

  // Helper executor with mapper support
  const executeTest = async (testName: string, testFunction: () => Promise<any>, query?: string, variables?: any) => {
    const startTime = Date.now()
    setTestResults(prev => ({
      ...prev,
      [testName]: { name: testName, status: 'loading', query, variables }
    }))

    try {
      // Hooks already return mapped data - no need for manual mapping
      const data = await testFunction()
      const duration = Date.now() - startTime

      setTestResults(prev => ({
        ...prev,
        [testName]: {
          name: testName,
          status: 'success',
          mappedData: data, // Already mapped by hooks
          timestamp: new Date(),
          duration,
          query,
          variables
        }
      }))
    } catch (error) {
      const duration = Date.now() - startTime
      setTestResults(prev => ({
        ...prev,
        [testName]: {
          name: testName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          duration,
          query,
          variables
        }
      }))
    }
  }

  // Results renderer
  const getResultComponent = (testKey: string) => {
    const result = testResults[testKey]
    if (!result) return null
    const { status, mappedData, error, timestamp, duration, query, variables } = result

    let itemCount = 0
    if (mappedData) {
      if (Array.isArray(mappedData)) {
        itemCount = mappedData.length
      } else if (typeof mappedData === 'object') {
        // Check for common patterns in hook responses
        if (mappedData.leads) itemCount = mappedData.leads.length
        else if (mappedData.accounts) itemCount = mappedData.accounts.length
        else if (mappedData.contacts) itemCount = mappedData.contacts.length
        else if (mappedData.opportunities) itemCount = mappedData.opportunities.length
        else if (mappedData.tasks) itemCount = mappedData.tasks.length
        else if (mappedData.activities) itemCount = mappedData.activities.length
        else if (mappedData.total) itemCount = mappedData.total
        else {
          const arrayValues = Object.values(mappedData).find(v => Array.isArray(v)) as any[] | undefined
          if (arrayValues) itemCount = arrayValues.length
        }
      }
    }

    return (
      <Card className="gba:mt-4" data-testid={`customers-debug-result-${testKey}`}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            {status === 'loading' && <Badge variant="outline">Loading...</Badge>}
            {status === 'success' && <Badge variant="default">Success ({duration}ms)</Badge>}
            {status === 'error' && <Badge variant="destructive">Error ({duration}ms)</Badge>}
            {timestamp && (
              <span className="gba:text-sm gba:text-muted-foreground">{timestamp.toLocaleTimeString()}</span>
            )}
            {status === 'success' && <Badge variant="secondary">{itemCount} items</Badge>}
            {mappedData && <Badge variant="secondary">Mapped Types Available</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status === 'success' && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="gba:w-full">
                  {mappedData ? '📊 Show Data (Raw GraphQL + Mapped Types)' : '📊 Show Data'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="gba:mt-4">
                {mappedData ? (
                  <Tabs defaultValue="mapped" className="gba:w-full">
                    <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
                      <TabsTrigger value="mapped">🎯 Mapped Types</TabsTrigger>
                      <TabsTrigger value="raw">📡 Raw GraphQL</TabsTrigger>
                    </TabsList>
                    <TabsContent value="mapped" className="gba:space-y-4">
                      <Alert variant="default">
                        <AlertDescription>
                          Enhanced types after mapper transformation with normalized fields (accountAnnualRevenueBand,
                          accounts[])
                        </AlertDescription>
                      </Alert>
                      <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-auto gba:max-h-[300px] gba:text-xs">
                        {JSON.stringify(mappedData, null, 2)}
                      </pre>
                    </TabsContent>
                    <TabsContent value="raw" className="gba:space-y-4">
                      <Alert variant="default">
                        <AlertDescription>
                          Raw GraphQL response with CRM-specific field names (annualRevenue, account)
                        </AlertDescription>
                      </Alert>
                      <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-auto gba:max-h-[300px] gba:text-xs">
                        {JSON.stringify(mappedData, null, 2)}
                      </pre>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-auto gba:max-h-[300px] gba:text-xs">
                    {JSON.stringify(mappedData, null, 2)}
                  </pre>
                )}
                {query && (
                  <div className="gba:mt-4 gba:space-y-2">
                    <h4 className="gba:font-semibold gba:text-sm">Query Info</h4>
                    <pre className="gba:bg-muted gba:p-2 gba:rounded gba:text-xs">{query}</pre>
                    {variables && (
                      <>
                        <h4 className="gba:font-semibold gba:text-sm">Variables</h4>
                        <pre className="gba:bg-muted gba:p-2 gba:rounded gba:text-xs">
                          {JSON.stringify(variables, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    )
  }

  // Test configs
  const coreTests = [
    {
      key: 'customer-accounts',
      label: 'Accounts',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined } as any
        return executeTest(
          'customer-accounts',
          () => fetchCustomerAccounts(variables),
          'GET_CUSTOMER_ACCOUNTS',
          variables
        )
      }
    },
    {
      key: 'customer-contacts',
      label: 'Contacts',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined } as any
        return executeTest(
          'customer-contacts',
          () => fetchCustomerContacts(variables),
          'GET_CUSTOMER_CONTACTS',
          variables
        )
      }
    },
    {
      key: 'customer-leads',
      label: 'Leads (List)',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined } as any
        return executeTest('customer-leads', () => fetchCustomerLeads(variables), 'GET_CUSTOMER_LEADS', variables)
      }
    },
    {
      key: 'customer-lead-by-id',
      label: 'Lead (By ID)',
      run: () => {
        const id = leadId || DEFAULT_ID
        return executeTest('customer-lead-by-id', () => fetchCustomerLeadById(id), 'GET_CUSTOMER_LEAD_BY_ID', { id })
      }
    },
    {
      key: 'customer-opportunities',
      label: 'Opportunities',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined } as any
        return executeTest(
          'customer-opportunities',
          () => fetchCustomerOpportunities(variables),
          'GET_CUSTOMER_OPPORTUNITIES',
          variables
        )
      }
    },
    {
      key: 'customer-tasks',
      label: 'Tasks',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest('customer-tasks', () => fetchCustomerTasks(variables), 'GET_CUSTOMER_TASKS', variables)
      }
    },
    {
      key: 'customer-activities',
      label: 'Activities',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest(
          'customer-activities',
          () => fetchCustomerActivities(variables),
          'GET_CUSTOMER_ACTIVITIES',
          variables
        )
      }
    }
  ]

  const clearResults = () => setTestResults({})
  const runAllCore = async () => {
    for (const t of coreTests) await t.run()
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="customers-debug-container">
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:mb-2">🐛 Customer Data Foundation Debug</h1>
        <p className="gba:text-muted-foreground gba:mb-4">
          Validate customer data hooks with <Badge variant="secondary">Raw GraphQL + Mapped Types</Badge> display
        </p>
        <Alert variant="default">
          <AlertDescription>
            ✅ Updated: Lead Support + Type Transformation Display. Shows both Raw GraphQL responses and Mapped Types
            (after toCustomerLead transformation).
          </AlertDescription>
        </Alert>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🎛️ Test Controls</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            <div className="gba:space-y-2">
              <label htmlFor="customers-debug-search-input" className="gba:text-sm gba:font-medium">
                Search Term
              </label>
              <Input
                id="customers-debug-search-input"
                data-testid="customers-debug-search-input"
                placeholder="Enter search term..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="gba:space-y-2">
              <label htmlFor="customers-debug-lead-id-input" className="gba:text-sm gba:font-medium">
                Lead ID
              </label>
              <Input
                id="customers-debug-lead-id-input"
                data-testid="customers-debug-lead-id-input"
                placeholder="Lead ID for by-ID test"
                value={leadId}
                onChange={e => setLeadId(e.target.value)}
              />
            </div>
            <div className="gba:space-y-2">
              <span className="gba:text-sm gba:font-medium">Actions</span>
              <div className="gba:flex gba:gap-2">
                <Button onClick={runAllCore} data-testid="customers-debug-run-core-button">
                  Run All Core
                </Button>
                <Button variant="outline" onClick={clearResults} data-testid="customers-debug-clear-results-button">
                  Clear Results
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="gba:space-y-4">
        <h2 className="gba:text-2xl gba:font-semibold">Core Customer Data Tests</h2>
        <div className="gba:grid gba:grid-cols-4 gba:gap-4">
          {coreTests.map(t => (
            <div key={t.key} className="gba:space-y-2">
              <Button
                data-testid={`customers-debug-${t.key}-button`}
                onClick={t.run}
                disabled={testResults[t.key]?.status === 'loading'}
                className="gba:w-full"
              >
                {testResults[t.key]?.status === 'loading' ? 'Loading...' : t.label}
              </Button>
              {getResultComponent(t.key)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CustomersDebug
