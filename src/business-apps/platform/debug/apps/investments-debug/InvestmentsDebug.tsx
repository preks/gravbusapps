// Investment Data Foundation Debug App - Updated with nw-design-system
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

// Import investment data hooks
import { useGetInvestments, useSearchInvestments } from '@/common/data/investment/hooks/useInvestments'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useGetInvestmentLeads, useGetInvestmentLeadById } from '@/common/data/investment/hooks/useInvestmentLeads'
// Note: Using deprecated hook for imperative API in debug tool
// TODO: Migrate to useInvestmentOpportunitiesList when imperative API is available
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useGetInvestmentReports } from '@/common/data/investment/hooks/useInvestmentReports'
import { useInvestmentDataIntegration } from '@/common/data/investment/hooks/useInvestmentDataIntegration'

// Import mappers for demonstrating type transformation
// NOTE: Mappers are already applied in hooks!
// Raw data is not exposed by hooks - they return pre-mapped types

type InvestmentsDebugProps = BusinessAppContextProps

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

const InvestmentsDebug: React.FC<InvestmentsDebugProps> = context => {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTestId, setSelectedTestId] = useState<string>('')

  // Hooks
  const { fetchInvestments } = useGetInvestments(context)
  const { searchInvestments } = useSearchInvestments(context)
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)
  const { fetchInvestmentLeads } = useGetInvestmentLeads(context)
  const { fetchInvestmentLeadById } = useGetInvestmentLeadById(context)
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)
  const { fetchInvestmentReports } = useGetInvestmentReports(context)

  const {
    investments,
    investmentAccounts,
    investmentContacts,
    investmentOpportunities,
    investmentLeads,
    stats,
    isLoading: integrationLoading,
    error: integrationError,
    refetch: refetchIntegration
  } = useInvestmentDataIntegration(context)

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

    const isByIdTest = testKey.includes('-by-id')
    let dataCount = 0
    let totalCount = 0

    if (isByIdTest) {
      dataCount = mappedData ? 1 : 0
    } else if (mappedData && typeof mappedData === 'object') {
      // Check for common patterns in hook responses
      if (mappedData.investments) dataCount = mappedData.investments.length
      else if (mappedData.accounts) dataCount = mappedData.accounts.length
      else if (mappedData.contacts) dataCount = mappedData.contacts.length
      else if (mappedData.leads) dataCount = mappedData.leads.length
      else if (mappedData.opportunities) dataCount = mappedData.opportunities.length
      else if (mappedData.reports) dataCount = mappedData.reports.length
      else if (mappedData.total) {
        totalCount = mappedData.total
        dataCount = Array.isArray(mappedData.investments) ? mappedData.investments.length : 0
      } else if (Array.isArray(mappedData)) {
        dataCount = mappedData.length
      } else {
        const arrayValues = Object.values(mappedData).find(v => Array.isArray(v)) as any[] | undefined
        if (arrayValues) dataCount = arrayValues.length
      }
    }

    return (
      <Card className="gba:mt-4" data-testid={`investments-debug-result-${testKey}`}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            {status === 'loading' && <Badge variant="outline">Loading...</Badge>}
            {status === 'success' && <Badge variant="default">Success ({duration}ms)</Badge>}
            {status === 'error' && <Badge variant="destructive">Error ({duration}ms)</Badge>}
            {timestamp && (
              <span className="gba:text-sm gba:text-muted-foreground">{timestamp.toLocaleTimeString()}</span>
            )}
            {status === 'success' &&
              (isByIdTest ? (
                <Badge variant="secondary">{dataCount === 1 ? 'Found' : 'Not Found'}</Badge>
              ) : (
                <Badge variant="secondary">
                  {dataCount} items {totalCount > 0 && `(${totalCount} total)`}
                </Badge>
              ))}
            {mappedData && <Badge variant="secondary">Mapped Types</Badge>}
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
                          Enhanced types after mapper with normalized fields (accounts[], investmentAccount → accounts)
                        </AlertDescription>
                      </Alert>
                      {!isByIdTest && totalCount > 0 && (
                        <div className="gba:flex gba:gap-2">
                          <Badge variant="secondary">Total: {totalCount}</Badge>
                          <Badge variant="secondary">Returned: {dataCount}</Badge>
                          {dataCount < totalCount && <Badge variant="warning">Limited by pagination</Badge>}
                        </div>
                      )}
                      <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-auto gba:max-h-[300px] gba:text-xs">
                        {JSON.stringify(mappedData, null, 2)}
                      </pre>
                    </TabsContent>
                    <TabsContent value="raw" className="gba:space-y-4">
                      <Alert variant="default">
                        <AlertDescription>
                          Raw GraphQL response with IRM-specific structure (investmentAccount, investmentAccountId)
                        </AlertDescription>
                      </Alert>
                      <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-auto gba:max-h-[300px] gba:text-xs">
                        {JSON.stringify(mappedData, null, 2)}
                      </pre>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <>
                    {!isByIdTest && totalCount > 0 && (
                      <div className="gba:flex gba:gap-2 gba:mb-4">
                        <Badge variant="secondary">Total: {totalCount}</Badge>
                        <Badge variant="secondary">Returned: {dataCount}</Badge>
                      </div>
                    )}
                    <pre className="gba:bg-muted gba:p-4 gba:rounded-lg gba:overflow-auto gba:max-h-[300px] gba:text-xs">
                      {JSON.stringify(mappedData, null, 2)}
                    </pre>
                  </>
                )}
                {query && (
                  <div className="gba:mt-4 gba:space-y-2">
                    <h4 className="gba:font-semibold gba:text-sm">Query Info</h4>
                    <pre className="gba:bg-muted gba:p-2 gba:rounded gba:text-xs">{query}</pre>
                    {variables && Object.keys(variables).length > 0 && (
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

  // Test functions
  const coreTests = [
    {
      key: 'investments',
      label: 'Investments',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest('investments', () => fetchInvestments(variables), 'GET_INVESTMENTS', variables)
      }
    },
    {
      key: 'investment-accounts',
      label: 'Accounts',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest(
          'investment-accounts',
          () => fetchInvestmentAccounts(variables),
          'GET_INVESTMENT_ACCOUNTS',
          variables
        )
      }
    },
    {
      key: 'investment-contacts',
      label: 'Contacts',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest(
          'investment-contacts',
          () => fetchInvestmentContacts(variables),
          'GET_INVESTMENT_CONTACTS',
          variables
        )
      }
    },
    {
      key: 'investment-leads',
      label: 'Leads (List)',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest('investment-leads', () => fetchInvestmentLeads(variables), 'GET_INVESTMENT_LEADS', variables)
      }
    },
    {
      key: 'investment-lead-by-id',
      label: 'Lead (By ID)',
      run: () => {
        const testId = selectedTestId || DEFAULT_ID
        return executeTest(
          'investment-lead-by-id',
          () => fetchInvestmentLeadById(testId),
          'GET_INVESTMENT_LEAD_BY_ID',
          { id: testId }
        )
      }
    },
    {
      key: 'investment-opportunities',
      label: 'Opportunities',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest(
          'investment-opportunities',
          () => fetchInvestmentOpportunities(variables),
          'GET_INVESTMENT_OPPORTUNITIES',
          variables
        )
      }
    },
    {
      key: 'investment-reports',
      label: 'Reports',
      run: () => {
        const variables = { limit: 10, search: searchTerm || undefined }
        return executeTest(
          'investment-reports',
          () => fetchInvestmentReports(variables),
          'GET_INVESTMENT_REPORTS',
          variables
        )
      }
    },
    {
      key: 'search-investments',
      label: 'Search Investments',
      run: () => {
        const searchQuery = searchTerm || 'test'
        const variables = { limit: 5 }
        return executeTest(
          'search-investments',
          () => searchInvestments(searchQuery, variables),
          'SEARCH_INVESTMENTS',
          { searchTerm: searchQuery, ...variables }
        )
      }
    }
  ]

  const clearResults = () => setTestResults({})
  const runAllCore = async () => {
    for (const t of coreTests) await t.run()
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="investments-debug-container">
      <div>
        <h1 className="gba:text-3xl gba:font-bold gba:mb-2">🐛 Investment Data Foundation Debug</h1>
        <p className="gba:text-muted-foreground gba:mb-4">
          Test investment data hooks with <Badge variant="secondary">Raw GraphQL + Mapped Types</Badge> display
        </p>
        <Alert variant="default">
          <AlertDescription>
            ✅ Updated: Lead Support + Type Transformation Display. Shows Raw GraphQL and Mapped Types (toInvestmentLead
            transformation).
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
              <label htmlFor="debug-search-input" className="gba:text-sm gba:font-medium">
                Search Term
              </label>
              <Input
                id="debug-search-input"
                data-testid="debug-search-input"
                placeholder="Enter search term..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="gba:space-y-2">
              <label htmlFor="debug-test-id-input" className="gba:text-sm gba:font-medium">
                Test ID (for by-ID tests)
              </label>
              <Input
                id="debug-test-id-input"
                data-testid="debug-test-id-input"
                placeholder="UUID for by-ID tests"
                value={selectedTestId}
                onChange={e => setSelectedTestId(e.target.value)}
              />
            </div>
            <div className="gba:space-y-2">
              <span className="gba:text-sm gba:font-medium">Actions</span>
              <div className="gba:flex gba:gap-2">
                <Button onClick={runAllCore} data-testid="debug-run-all-core-button">
                  Run All Core
                </Button>
                <Button variant="outline" onClick={clearResults} data-testid="debug-clear-results-button">
                  Clear Results
                </Button>
                <Button
                  variant="outline"
                  onClick={() => refetchIntegration()}
                  disabled={integrationLoading}
                  data-testid="debug-refetch-integration-button"
                >
                  Refetch Integration
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📊 Data Integration Hook Status</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:font-medium">Status:</span>
            {integrationLoading && <Badge variant="outline">Loading...</Badge>}
            {integrationError && <Badge variant="destructive">Error</Badge>}
            {!integrationLoading && !integrationError && <Badge variant="default">Ready</Badge>}
          </div>
          {integrationError && (
            <Alert variant="destructive">
              <AlertDescription>{integrationError}</AlertDescription>
            </Alert>
          )}
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Badge variant="secondary">Investments: {investments.length}</Badge>
            <Badge variant="secondary">Accounts: {investmentAccounts.length}</Badge>
            <Badge variant="secondary">Contacts: {investmentContacts.length}</Badge>
            <Badge variant="secondary">Opportunities: {investmentOpportunities.length}</Badge>
            <Badge variant="secondary">Leads: {investmentLeads.length}</Badge>
          </div>
          {stats && (
            <div className="gba:mt-2">
              <span className="gba:font-medium">Total Market Value: </span>
              <Badge variant="default">${stats.totalMarketValue.toLocaleString()}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="gba:space-y-4">
        <h2 className="gba:text-2xl gba:font-semibold">Core Investment Entity Tests</h2>
        <div className="gba:grid gba:grid-cols-4 gba:gap-4">
          {coreTests.map(t => (
            <div key={t.key} className="gba:space-y-2">
              <Button
                data-testid={`debug-test-${t.key}-button`}
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

export default InvestmentsDebug
