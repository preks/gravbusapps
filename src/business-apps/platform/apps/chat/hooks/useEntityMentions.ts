import { useState, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { EntityReference, MessageEntityReference } from '../types'

// GraphQL query for searching all entities
const SEARCH_ENTITIES_QUERY = `
  query SearchEntities($searchPattern: String!, $limit: Int) {
    # CRM Entities
    Account(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { name: { _ilike: $searchPattern } }
            { email: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      email
      code
    }
    
    Contact(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { firstName: { _ilike: $searchPattern } }
            { lastName: { _ilike: $searchPattern } }
            { email: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      email
      code
    }
    
    Lead(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { firstName: { _ilike: $searchPattern } }
            { lastName: { _ilike: $searchPattern } }
            { companyName: { _ilike: $searchPattern } }
            { email: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      companyName
      email
      code
    }
    
    Opportunity(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { name: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      stage
      code
    }
    
    # IRM Entities (Investment Relations)
    InvestmentAccount(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { name: { _ilike: $searchPattern } }
            { email: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      email
      code
    }
    
    InvestmentContact(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { firstName: { _ilike: $searchPattern } }
            { lastName: { _ilike: $searchPattern } }
            { fullName: { _ilike: $searchPattern } }
            { email: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      fullName
      email
      code
    }
    
    InvestmentLead(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { firstName: { _ilike: $searchPattern } }
            { lastName: { _ilike: $searchPattern } }
            { companyName: { _ilike: $searchPattern } }
            { email: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      companyName
      email
      code
    }
    
    InvestmentOpportunity(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { name: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      dealType
      code
    }
    
    # Investments
    Investment(
      limit: $limit
      where: {
        _or: [
          { name: { _ilike: $searchPattern } }
          { code: { _ilike: $searchPattern } }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      code
      investmentType {
        value
      }
    }
    
    # Employees - only firstName, lastName, code are filterable
    Employee(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { firstName: { _ilike: $searchPattern } }
            { lastName: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      pictureThumbnail
      employeePosition {
        jobPosition {
          name
        }
        organizationalUnit {
          name
        }
      }
    }
    
    
    # Sales Campaigns
    SalesCampaign(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { name: { _ilike: $searchPattern } }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      description
    }
    
    # Expense Requests
    ExpenseRequest(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { title: { _ilike: $searchPattern } }
            { code: { _ilike: $searchPattern } }
            { description: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { createdAt: DESC }
    ) {
      id
      title
      code
      status
      description
    }
  }
`

interface SearchResponse {
  // CRM
  Account: Array<{ id: string; name: string; email?: string; code?: string }>
  Contact: Array<{ id: string; firstName?: string; lastName?: string; email?: string; code?: string }>
  Lead: Array<{
    id: string
    firstName?: string
    lastName?: string
    companyName?: string
    email?: string
    code?: string
  }>
  Opportunity: Array<{ id: string; name: string; stage?: string; code?: string }>
  // IRM
  InvestmentAccount: Array<{ id: string; name: string; email?: string; code?: string }>
  InvestmentContact: Array<{
    id: string
    firstName?: string
    lastName?: string
    fullName?: string
    email?: string
    code?: string
  }>
  InvestmentLead: Array<{
    id: string
    firstName?: string
    lastName?: string
    companyName?: string
    email?: string
    code?: string
  }>
  InvestmentOpportunity: Array<{ id: string; name: string; dealType?: string; code?: string }>
  Investment: Array<{ id: string; name: string; code?: string; investmentType?: { value?: string } }>
  // Other
  Employee: Array<{
    id: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    employeePosition?: {
      jobPosition?: { name?: string }
      organizationalUnit?: { name?: string }
    }
  }>
  SalesCampaign: Array<{ id: string; name: string; description?: string }>
  ExpenseRequest: Array<{ id: string; title?: string; code?: string; status?: string; description?: string }>
}

interface MentionState {
  isActive: boolean
  query: string
  startIndex: number
  caretPosition: number
}

export function useEntityMentions(accessToken: string) {
  const graphqlClient = useGraphQLClient(accessToken)
  const [entities, setEntities] = useState<EntityReference[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [mentionState, setMentionState] = useState<MentionState | null>(null)
  const [selectedEntities, setSelectedEntities] = useState<MessageEntityReference[]>([])
  const searchAbortRef = useRef<AbortController | null>(null)

  // Detect if user is typing a mention (@ followed by text)
  const detectMention = useCallback((text: string, caretPosition: number): MentionState | null => {
    // Find the last @ before caret
    const textBeforeCaret = text.slice(0, caretPosition)
    const atIndex = textBeforeCaret.lastIndexOf('@')

    if (atIndex === -1) return null

    // Ensure @ starts a word (after space, newline, or at start)
    if (atIndex > 0) {
      const prevChar = text.charAt(atIndex - 1)
      if (!/\s|\n/.test(prevChar)) return null
    }

    // Get the query after @
    const query = textBeforeCaret.slice(atIndex + 1)

    // Stop if query contains space or another @
    if (/[@\s\n]/.test(query)) return null

    return {
      isActive: true,
      query,
      startIndex: atIndex,
      caretPosition
    }
  }, [])

  // Transform GraphQL response to EntityReference array
  const transformResponse = (result: SearchResponse): EntityReference[] => {
    const allEntities: EntityReference[] = []

    // CRM Accounts
    result.Account?.forEach(acc => {
      allEntities.push({
        id: acc.id,
        type: 'account',
        name: acc.name || 'Account',
        subtitle: `CRM • ${acc.email || acc.code || ''}`
      })
    })

    // CRM Contacts
    result.Contact?.forEach(contact => {
      const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Contact'
      allEntities.push({
        id: contact.id,
        type: 'contact',
        name,
        subtitle: `CRM • ${contact.email || contact.code || ''}`
      })
    })

    // CRM Leads
    result.Lead?.forEach(lead => {
      const name = lead.companyName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead'
      allEntities.push({
        id: lead.id,
        type: 'lead',
        name,
        subtitle: `CRM • ${lead.email || lead.code || ''}`
      })
    })

    // CRM Opportunities
    result.Opportunity?.forEach(opp => {
      allEntities.push({
        id: opp.id,
        type: 'opportunity',
        name: opp.name || 'Opportunity',
        subtitle: `CRM • ${opp.stage || opp.code || ''}`
      })
    })

    // IRM Accounts
    result.InvestmentAccount?.forEach(acc => {
      allEntities.push({
        id: acc.id,
        type: 'investment_account',
        name: acc.name || 'Account',
        subtitle: `IRM • ${acc.email || acc.code || ''}`
      })
    })

    // IRM Contacts
    result.InvestmentContact?.forEach(contact => {
      const name = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Contact'
      allEntities.push({
        id: contact.id,
        type: 'investment_contact',
        name,
        subtitle: `IRM • ${contact.email || contact.code || ''}`
      })
    })

    // IRM Leads
    result.InvestmentLead?.forEach(lead => {
      const name = lead.companyName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead'
      allEntities.push({
        id: lead.id,
        type: 'investment_lead',
        name,
        subtitle: `IRM • ${lead.email || lead.code || ''}`
      })
    })

    // IRM Opportunities
    result.InvestmentOpportunity?.forEach(opp => {
      allEntities.push({
        id: opp.id,
        type: 'investment_opportunity',
        name: opp.name || 'Opportunity',
        subtitle: `IRM • ${opp.dealType || opp.code || ''}`
      })
    })

    // Investments
    result.Investment?.forEach(inv => {
      allEntities.push({
        id: inv.id,
        type: 'investment',
        name: inv.name || 'Investment',
        subtitle: inv.investmentType?.value || inv.code
      })
    })

    // Employees
    result.Employee?.forEach(emp => {
      const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee'
      const jobTitle = emp.employeePosition?.jobPosition?.name
      const orgUnit = emp.employeePosition?.organizationalUnit?.name
      const subtitle = [jobTitle, orgUnit].filter(Boolean).join(' • ') || undefined
      allEntities.push({
        id: emp.id,
        type: 'employee',
        name,
        subtitle,
        pictureThumbnail: emp.pictureThumbnail
      })
    })

    // Sales Campaigns
    result.SalesCampaign?.forEach(campaign => {
      allEntities.push({
        id: campaign.id,
        type: 'campaign',
        name: campaign.name || 'Campaign',
        subtitle: campaign.description
      })
    })

    // Expense Requests
    result.ExpenseRequest?.forEach(expense => {
      allEntities.push({
        id: expense.id,
        type: 'expense_request',
        name: expense.title || expense.code || 'Expense Request',
        subtitle: expense.status ? `${expense.code || ''} • ${expense.status}`.trim() : expense.code
      })
    })

    return allEntities
  }

  // Search entities based on query
  const searchEntities = useCallback(
    async (query: string) => {
      // Cancel previous search
      if (searchAbortRef.current) {
        searchAbortRef.current.abort()
      }
      searchAbortRef.current = new AbortController()

      setIsLoading(true)
      try {
        const searchPattern = query ? `%${query}%` : '%%'
        const result = await graphqlClient.request<SearchResponse>(SEARCH_ENTITIES_QUERY, {
          searchPattern,
          limit: 5 // Limit per entity type
        })

        const allEntities = transformResponse(result)
        // Limit total results to 15 for better UX
        setEntities(allEntities.slice(0, 15))
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') {
          console.error('Error searching entities:', err)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient]
  )

  // Handle text change and detect mentions
  const handleTextChange = useCallback(
    (text: string, caretPosition: number) => {
      const mention = detectMention(text, caretPosition)
      setMentionState(mention)

      if (mention) {
        searchEntities(mention.query)
      } else {
        setEntities([])
      }
    },
    [detectMention, searchEntities]
  )

  // Insert selected entity into text
  const insertEntity = useCallback(
    (
      entity: EntityReference,
      currentText: string
    ): { newText: string; newCaretPosition: number; entityRef: MessageEntityReference } => {
      if (!mentionState) {
        return { newText: currentText, newCaretPosition: currentText.length, entityRef: null as any }
      }

      const before = currentText.slice(0, mentionState.startIndex)
      const after = currentText.slice(mentionState.caretPosition)
      const displayText = `@${entity.name}`
      const newText = `${before}${displayText} ${after}`
      const newCaretPosition = before.length + displayText.length + 1

      const entityRef: MessageEntityReference = {
        ...entity,
        startIndex: mentionState.startIndex,
        endIndex: mentionState.startIndex + displayText.length
      }

      setSelectedEntities(prev => [...prev, entityRef])
      setMentionState(null)
      setEntities([])

      return { newText, newCaretPosition, entityRef }
    },
    [mentionState]
  )

  // Clear all mention state
  const clearMentions = useCallback(() => {
    setMentionState(null)
    setEntities([])
    setSelectedEntities([])
  }, [])

  // Close mention popover
  const closeMention = useCallback(() => {
    setMentionState(null)
    setEntities([])
  }, [])

  return {
    entities,
    isLoading,
    mentionState,
    selectedEntities,
    handleTextChange,
    insertEntity,
    clearMentions,
    closeMention,
    searchEntities
  }
}
