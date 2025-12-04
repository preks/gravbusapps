import { useState, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type UniversalEntityType =
  // CRM Entities
  | 'account'
  | 'lead'
  | 'contact'
  | 'opportunity'
  // HR Entities
  | 'employee'
  | 'absence'
  // Finance Entities
  | 'expense-request'
  | 'expense-plan'
  | 'expense-item'
  // IRM/Investment Entities
  | 'investment-account'
  | 'investment-lead'
  | 'investment-opportunity'
  | 'investment'

export interface UniversalEntityOption {
  id: string
  name: string
  type: UniversalEntityType
  subtitle?: string
  icon?: string
  avatarUrl?: string
  displayUrl?: string
  metadata?: Record<string, any>
}

/**
 * Generate display URL for entity navigation
 * Uses platform URL pattern: /platform/{module}/{record-type}?{entityType}Id={id}
 */
const generateEntityDisplayUrl = (type: UniversalEntityType, id: string): string => {
  switch (type) {
    // CRM Entities
    case 'account':
      return `/platform/crm/account-record?accountId=${id}`
    case 'lead':
      return `/platform/crm/lead-record?leadId=${id}`
    case 'contact':
      return `/platform/crm/contact-record?contactId=${id}`
    case 'opportunity':
      return `/platform/crm/opportunity-record?opportunityId=${id}`

    // HR Entities
    case 'employee':
      return `/platform/employee-record?employeeId=${id}`
    case 'absence':
      // No dedicated absence record screen yet, link to manager-absences
      return `/platform/hr/absences/manager-absences`

    // Finance Entities
    case 'expense-request':
      return `/platform/fin/expenses/expense-request-record?expenseRequestId=${id}`
    case 'expense-plan':
      return `/platform/fin/expenses/expense-plan-record?expensePlanId=${id}`
    case 'expense-item':
      // No dedicated expense item record screen, link to personal-expenses
      return `/platform/fin/expenses/personal-expenses?tab=expense-items`

    // IRM/Investment Entities
    case 'investment-account':
      return `/platform/irm/account-record?accountId=${id}`
    case 'investment-lead':
      return `/platform/irm/lead-record?leadId=${id}`
    case 'investment-opportunity':
      return `/platform/irm/opportunity-record?opportunityId=${id}`
    case 'investment':
      return `/platform/irm/investment-record?investmentId=${id}`

    default:
      return '#'
  }
}

interface UseUniversalEntitySearchResult {
  entities: UniversalEntityOption[]
  loading: boolean
  error: Error | null
  searchEntities: (searchTerm: string) => Promise<void>
}

interface UseUniversalEntitySearchOptions {
  accessToken: string
  entityTypes?: UniversalEntityType[]
  limit?: number
}

const UNIVERSAL_ENTITY_SEARCH_QUERY = `
  query UniversalEntitySearch($searchPattern: String!, $limit: Int) {
    # CRM ENTITIES
    Lead(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $searchPattern } }
              { lastName: { _ilike: $searchPattern } }
              { companyName: { _ilike: $searchPattern } }
              { email: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      companyName
      email
      leadStatus { value }
    }

    Contact(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $searchPattern } }
              { lastName: { _ilike: $searchPattern } }
              { email: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      email
      jobTitle
      pictureUrl
      account { name }
    }

    Account(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
              { website: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      website
      industry { value }
    }

    Opportunity(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      estimatedAmount
      currencyRef
      account { name }
      salesPipelineStage { value }
    }

    # HR ENTITIES
    EmployeePosition(
      limit: $limit
      where: {
        employee: {
          isDeleted: { _eq: false }
          _or: [
            { firstName: { _ilike: $searchPattern } }
            { lastName: { _ilike: $searchPattern } }
            { displayName: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]
        }
      }
      orderBy: { firstName: ASC }
    ) {
      employeeId
      firstName
      lastName
      employee {
        id
        userId
        displayName
        code
        pictureThumbnail
      }
      organizationalUnit { name }
      jobPosition { name }
    }

    EmployeeAbsence(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { status: { _nin: ["CANCELLED", "REJECTED"] } }
          {
            _or: [
              { employee: { firstName: { _ilike: $searchPattern } } }
              { employee: { lastName: { _ilike: $searchPattern } } }
              { employee: { displayName: { _ilike: $searchPattern } } }
            ]
          }
        ]
      }
      orderBy: { startDate: DESC }
    ) {
      id
      startDate
      endDate
      status
      calendarDays
      employee {
        firstName
        lastName
        displayName
      }
      type { value }
    }

    # FINANCE ENTITIES
    ExpenseRequest(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { code: { _ilike: $searchPattern } }
              { title: { _ilike: $searchPattern } }
              { employee: { firstName: { _ilike: $searchPattern } } }
              { employee: { lastName: { _ilike: $searchPattern } } }
            ]
          }
        ]
      }
      orderBy: { requestDate: DESC }
    ) {
      id
      code
      title
      totalAmount
      currencyRef
      status
      requestDate
      employee {
        firstName
        lastName
        displayName
      }
    }

    ExpensePlan(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { code: { _ilike: $searchPattern } }
              { title: { _ilike: $searchPattern } }
              { employee: { firstName: { _ilike: $searchPattern } } }
              { employee: { lastName: { _ilike: $searchPattern } } }
            ]
          }
        ]
      }
      orderBy: { startDate: DESC }
    ) {
      id
      code
      title
      totalAmount
      currencyRef
      status
      startDate
      endDate
      employee {
        firstName
        lastName
        displayName
      }
    }

    ExpenseItem(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { code: { _ilike: $searchPattern } }
              { title: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { expenseDate: DESC }
    ) {
      id
      code
      title
      totalAmount
      currencyRef
      status
      expenseDate
      employee {
        firstName
        lastName
      }
      expenseClass { value }
    }

    # IRM/INVESTMENT ENTITIES
    InvestmentAccount(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
              { code: { _ilike: $searchPattern } }
              { website: { _ilike: $searchPattern } }
              { email: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      code
      name
      website
      email
      industryClass { value }
      ownerEmployee {
        displayName
      }
    }

    InvestmentLead(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $searchPattern } }
              { lastName: { _ilike: $searchPattern } }
              { companyName: { _ilike: $searchPattern } }
              { email: { _ilike: $searchPattern } }
              { investmentName: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      code
      firstName
      lastName
      companyName
      email
      investmentName
      leadStatus { value }
      investmentGroup { value }
      investmentType { value }
    }

    InvestmentOpportunity(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
              { investmentName: { _ilike: $searchPattern } }
              { code: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      code
      name
      investmentName
      estimatedAmount
      currencyRef
      dealType
      account { name }
      investmentGroup { value }
      investmentType { value }
    }
  }
`

export const useUniversalEntitySearch = (options: UseUniversalEntitySearchOptions): UseUniversalEntitySearchResult => {
  const { accessToken, entityTypes, limit = 10 } = options

  const [entities, setEntities] = useState<UniversalEntityOption[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const abortControllerRef = useRef<AbortController | null>(null)

  const transformResults = useCallback(
    (data: any): UniversalEntityOption[] => {
      const results: UniversalEntityOption[] = []

      // CRM Leads
      data.Lead?.forEach((lead: any) => {
        const name =
          [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || lead.companyName || 'Unknown Lead'
        results.push({
          id: lead.id,
          name,
          type: 'lead',
          subtitle: lead.companyName || lead.leadStatus?.value || 'Lead',
          icon: 'UserPlus',
          displayUrl: generateEntityDisplayUrl('lead', lead.id),
          metadata: { ...lead }
        })
      })

      // CRM Contacts
      data.Contact?.forEach((contact: any) => {
        const name =
          [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Unknown Contact'
        results.push({
          id: contact.id,
          name,
          type: 'contact',
          subtitle: contact.account?.name || contact.jobTitle || 'Contact',
          icon: 'User',
          avatarUrl: contact.pictureUrl,
          displayUrl: generateEntityDisplayUrl('contact', contact.id),
          metadata: { ...contact }
        })
      })

      // CRM Accounts
      data.Account?.forEach((account: any) => {
        results.push({
          id: account.id,
          name: account.name || 'Unknown Account',
          type: 'account',
          subtitle: account.industry?.value || 'Account',
          icon: 'Building',
          displayUrl: generateEntityDisplayUrl('account', account.id),
          metadata: { ...account }
        })
      })

      // CRM Opportunities
      data.Opportunity?.forEach((opp: any) => {
        results.push({
          id: opp.id,
          name: opp.name || 'Unknown Opportunity',
          type: 'opportunity',
          subtitle: opp.account?.name || opp.salesPipelineStage?.value || 'Opportunity',
          icon: 'Target',
          displayUrl: generateEntityDisplayUrl('opportunity', opp.id),
          metadata: { ...opp }
        })
      })

      // HR Employees
      data.EmployeePosition?.forEach((emp: any) => {
        const name =
          emp.employee?.displayName || [emp.firstName, emp.lastName].filter(Boolean).join(' ') || 'Unknown Employee'
        const employeeId = emp.employee?.id || emp.employeeId
        const generatedUrl = generateEntityDisplayUrl('employee', employeeId)

        results.push({
          id: employeeId,
          name,
          type: 'employee',
          subtitle: emp.jobPosition?.name || emp.organizationalUnit?.name || 'Employee',
          icon: 'User',
          avatarUrl: emp.employee?.pictureThumbnail,
          displayUrl: generatedUrl,
          metadata: { ...emp }
        })
      })

      // HR Absences
      data.EmployeeAbsence?.forEach((absence: any) => {
        const employeeName =
          absence.employee?.displayName ||
          [absence.employee?.firstName, absence.employee?.lastName].filter(Boolean).join(' ') ||
          'Unknown'
        const startDate = absence.startDate ? new Date(absence.startDate).toLocaleDateString() : ''
        results.push({
          id: absence.id,
          name: `${employeeName} - ${absence.type?.value || 'Absence'}`,
          type: 'absence',
          subtitle: `${startDate} (${absence.status})`,
          icon: 'Calendar',
          displayUrl: generateEntityDisplayUrl('absence', absence.id),
          metadata: { ...absence }
        })
      })

      // Finance Expense Requests
      data.ExpenseRequest?.forEach((exp: any) => {
        results.push({
          id: exp.id,
          name: exp.title || exp.code || 'Expense Request',
          type: 'expense-request',
          subtitle: `${exp.employee?.displayName || ''} (${exp.status})`,
          icon: 'DollarSign',
          displayUrl: generateEntityDisplayUrl('expense-request', exp.id),
          metadata: { ...exp }
        })
      })

      // Finance Expense Plans
      data.ExpensePlan?.forEach((plan: any) => {
        results.push({
          id: plan.id,
          name: plan.title || plan.code || 'Expense Plan',
          type: 'expense-plan',
          subtitle: `${plan.employee?.displayName || ''} (${plan.status})`,
          icon: 'FileText',
          displayUrl: generateEntityDisplayUrl('expense-plan', plan.id),
          metadata: { ...plan }
        })
      })

      // Finance Expense Items
      data.ExpenseItem?.forEach((item: any) => {
        results.push({
          id: item.id,
          name: item.title || item.code || 'Expense Item',
          type: 'expense-item',
          subtitle: `${item.expenseClass?.value || ''} (${item.status})`,
          icon: 'Receipt',
          displayUrl: generateEntityDisplayUrl('expense-item', item.id),
          metadata: { ...item }
        })
      })

      // IRM Investment Accounts
      data.InvestmentAccount?.forEach((acc: any) => {
        results.push({
          id: acc.id,
          name: acc.name || 'Investment Account',
          type: 'investment-account',
          subtitle: acc.industryClass?.value || 'Investment Account',
          icon: 'Building2',
          displayUrl: generateEntityDisplayUrl('investment-account', acc.id),
          metadata: { ...acc }
        })
      })

      // IRM Investment Leads
      data.InvestmentLead?.forEach((lead: any) => {
        const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.companyName || 'Investment Lead'
        results.push({
          id: lead.id,
          name,
          type: 'investment-lead',
          subtitle: lead.investmentGroup?.value || lead.investmentType?.value || 'Investment Lead',
          icon: 'TrendingUp',
          displayUrl: generateEntityDisplayUrl('investment-lead', lead.id),
          metadata: { ...lead }
        })
      })

      // IRM Investment Opportunities
      data.InvestmentOpportunity?.forEach((opp: any) => {
        results.push({
          id: opp.id,
          name: opp.investmentName || opp.name || 'Investment Opportunity',
          type: 'investment-opportunity',
          subtitle: opp.investmentGroup?.value || opp.dealType || 'Investment Opportunity',
          icon: 'Briefcase',
          displayUrl: generateEntityDisplayUrl('investment-opportunity', opp.id),
          metadata: { ...opp }
        })
      })

      // Filter by entity types if specified
      if (entityTypes && entityTypes.length > 0) {
        return results.filter(r => entityTypes.includes(r.type))
      }

      return results
    },
    [entityTypes]
  )

  const searchEntities = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        setEntities([])
        return
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      setLoading(true)
      setError(null)

      try {
        const searchPattern = `%${searchTerm.trim()}%`

        const result = await graphqlClient.request(UNIVERSAL_ENTITY_SEARCH_QUERY, {
          searchPattern,
          limit
        })

        const transformedResults = transformResults(result)
        setEntities(transformedResults)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err)
          console.error('Entity search error:', err)
        }
      } finally {
        setLoading(false)
      }
    },
    [graphqlClient, limit, transformResults]
  )

  return {
    entities,
    loading,
    error,
    searchEntities
  }
}
