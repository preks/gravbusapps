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
import {
  useCustomerTasks,
  useCustomerActivities,
  useCustomerAccounts,
  useCustomerContacts,
  useCustomerLeads,
  useCustomerOpportunities
} from '@/common/data/customer'

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
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const { fetchCustomerContacts } = useCustomerContacts(context)
  const { fetchCustomerLeads, fetchCustomerLeadById } = useCustomerLeads(context)
  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)

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
        if ((mappedData as any).leads) itemCount = (mappedData as any).leads.length
        else if ((mappedData as any).accounts) itemCount = (mappedData as any).accounts.length
        else if ((mappedData as any).contacts) itemCount = (mappedData as any).contacts.length
        else if ((mappedData as any).opportunities) itemCount = (mappedData as any).opportunities.length
        else if ((mappedData as any).tasks) itemCount = (mappedData as any).tasks.length
        else if ((mappedData as any).activities) itemCount = (mappedData as any).activities.length
        else if ((mappedData as any).total) itemCount = (mappedData as any).total
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
              <label className="gba:text-sm gba:font-medium">Search Term</label>
              <Input
                data-testid="customers-debug-search-input"
                placeholder="Enter search term..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">Lead ID</label>
              <Input
                data-testid="customers-debug-lead-id-input"
                placeholder="Lead ID for by-ID test"
                value={leadId}
                onChange={e => setLeadId(e.target.value)}
              />
            </div>
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">Actions</label>
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
