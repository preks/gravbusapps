import { useState, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ContentGroup, resolveContentTypeName } from '@/common/data/content/constants/contentConstants'

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
    
    # Employees
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
      userId
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
    
    # Intranet Content (ContentEntry)
    ContentEntry(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { recordState: { _eq: "active" } }
          { title: { _neq: "" } }
          { _or: [
            { title: { _ilike: $searchPattern } }
            { preview: { _ilike: $searchPattern } }
          ]}
        ]
      }
      orderBy: { createdAt: DESC }
    ) {
      id
      title
      preview
      pictureThumbnail
      contentGroup
      contentType {
        name
        nameI18n
      }
      createdAt
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
    userId?: string
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
  ContentEntry: Array<{
    id: string
    title?: string
    preview?: string
    pictureThumbnail?: string
    contentGroup?: string
    contentType?: { name?: string; nameI18n?: Record<string, string> }
    createdAt?: string
  }>
}

export type EntityType =
  | 'ai_assistant'
  | 'every_expert'
  | 'account'
  | 'contact'
  | 'lead'
  | 'opportunity'
  | 'investment_account'
  | 'investment_contact'
  | 'investment_lead'
  | 'investment_opportunity'
  | 'investment'
  | 'employee'
  | 'campaign'
  | 'expense_request'
  | 'news_article'
  | 'knowledge_article'
  | 'intranet_article'
  | 'document_article'
  | 'document'

export interface EntityReference {
  id: string
  userId?: string
  type: EntityType | string
  name: string
  subtitle?: string
  pictureThumbnail?: string
  contentPreview?: string
  contentData?: any
}

export interface MessageEntityReference extends EntityReference {
  startIndex: number
  endIndex: number
}

interface MentionState {
  isActive: boolean
  query: string
  startIndex: number
  caretPosition: number
}

export interface UseEntityMentionsOptions {
  /** Optional active experts to include in search results (for chat app) */
  activeExperts?: Array<{
    expertId: string
    expertName: string
    specialty: string
  }>
  /** Controls how selected mentions are inserted into text */
  insertionMode?: 'at_mention' | 'markdown_link'
  /** Optional async function to search documents (Every Office). Results are merged with GraphQL entities. */
  searchDocuments?: (query: string) => Promise<EntityReference[]>
}

export function useEntityMentions(accessToken: string, options: UseEntityMentionsOptions = {}) {
  const { activeExperts = [], insertionMode = 'at_mention', searchDocuments } = options
  const graphqlClient = useGraphQLClient(accessToken)
  const [entities, setEntities] = useState<EntityReference[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [mentionState, setMentionState] = useState<MentionState | null>(null)
  const [selectedEntities, setSelectedEntities] = useState<MessageEntityReference[]>([])
  const searchAbortRef = useRef<AbortController | null>(null)
  const justInsertedRef = useRef<{ endPosition: number; timestamp: number } | null>(null)

  // Check if an @ position is within an already completed mention
  const isWithinCompletedMention = useCallback((atIndex: number, entities: MessageEntityReference[]): boolean => {
    return entities.some(entity => atIndex >= entity.startIndex && atIndex < entity.endIndex)
  }, [])

  // Detect if user is typing a mention (@ followed by text)
  const detectMention = useCallback(
    (text: string, caretPosition: number, completedEntities: MessageEntityReference[]): MentionState | null => {
      // If we just inserted a mention, skip detection briefly
      if (justInsertedRef.current) {
        const { endPosition, timestamp } = justInsertedRef.current
        if (Date.now() - timestamp < 500 && caretPosition <= endPosition + 1) {
          return null
        }
        if (Date.now() - timestamp > 500) {
          justInsertedRef.current = null
        }
      }

      // Find the last @ before caret
      const textBeforeCaret = text.slice(0, caretPosition)
      const atIndex = textBeforeCaret.lastIndexOf('@')

      if (atIndex === -1) return null

      // Check if this @ is within an already completed mention
      if (isWithinCompletedMention(atIndex, completedEntities)) {
        return null
      }

      // Ensure @ starts a word (after space, newline, or at start)
      if (atIndex > 0) {
        const prevChar = text.charAt(atIndex - 1)
        if (!/\s|\n/.test(prevChar)) return null
      }

      // Get the query after @
      const query = textBeforeCaret.slice(atIndex + 1)

      // Special case: If text starts with @Every (case-insensitive), don't activate mention detection
      // This handles the reply button case where @Every is inserted and user continues typing
      if (atIndex === 0 && /^every\s/i.test(query)) {
        return null
      }

      // Check if this @ is part of a completed mention entity
      const matchesCompletedMention = completedEntities.some(entity => {
        // Check if the @ we found is part of this completed mention
        if (atIndex >= entity.startIndex && atIndex < entity.endIndex) {
          return true
        }
        // Also check if query starts with the entity name (for cases where user types after @Every)
        if (atIndex === entity.startIndex && query.toLowerCase().startsWith(entity.name.toLowerCase())) {
          return true
        }
        return false
      })
      if (matchesCompletedMention) {
        return null
      }

      // Stop if query contains another @ or newline
      if (/[@\n]/.test(query)) return null

      // Stop if query ends with double space
      if (query.endsWith('  ')) return null

      // Limit query length
      if (query.length > 50) return null

      return {
        isActive: true,
        query: query.trim(),
        startIndex: atIndex,
        caretPosition
      }
    },
    [isWithinCompletedMention]
  )

  // Every AI assistant entity - shown when user types @Every, @AI, or @Assistant
  const EVERY_AI_ENTITY: EntityReference = {
    id: 'every-ai-assistant',
    type: 'ai_assistant',
    name: 'Every',
    subtitle: 'AI Assistant • Ask me anything'
  }

  // Check if query matches Every AI
  const matchesEveryAI = (query: string): boolean => {
    const lowerQuery = query.toLowerCase().trim()
    return (
      lowerQuery === '' || // Show on empty query (just typed @)
      'every'.startsWith(lowerQuery) ||
      'ai'.startsWith(lowerQuery) ||
      'assistant'.startsWith(lowerQuery) ||
      'every ai'.startsWith(lowerQuery)
    )
  }

  // Transform GraphQL response to EntityReference array
  const transformResponse = (result: SearchResponse, query: string): EntityReference[] => {
    const allEntities: EntityReference[] = []

    // Add Every AI if query matches
    if (matchesEveryAI(query)) {
      allEntities.push(EVERY_AI_ENTITY)
    }

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
        userId: emp.userId,
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

    // Intranet Content
    result.ContentEntry?.forEach(entry => {
      const group = entry.contentGroup || ''
      let entityType: 'news_article' | 'knowledge_article' | 'intranet_article' | 'document_article' =
        'intranet_article'
      let categoryLabel = 'Content'

      if (group === ContentGroup.NEWS) {
        entityType = 'news_article'
        categoryLabel = 'News'
      } else if (group === ContentGroup.KNOWLEDGE || group === ContentGroup.GLOSSARY) {
        entityType = 'knowledge_article'
        categoryLabel = 'Knowledge'
      } else if (group === ContentGroup.DOCUMENT) {
        entityType = 'document_article'
        categoryLabel = 'Document'
      } else if (group === ContentGroup.QUESTION) {
        entityType = 'knowledge_article'
        categoryLabel = 'Q&A'
      } else {
        entityType = 'intranet_article'
        categoryLabel = 'Content'
      }

      const contentCategory = resolveContentTypeName(entry.contentType)
      const subtitle = contentCategory ? `${categoryLabel} • ${contentCategory}` : categoryLabel

      allEntities.push({
        id: entry.id,
        type: entityType,
        name: entry.title || 'Untitled Content',
        subtitle,
        pictureThumbnail: entry.pictureThumbnail || undefined,
        contentPreview: entry.preview || undefined,
        contentData: {
          title: entry.title,
          preview: entry.preview,
          contentGroup: entry.contentGroup,
          contentType: resolveContentTypeName(entry.contentType),
          createdAt: entry.createdAt
        }
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

        // Search GraphQL entities, experts, and documents in parallel
        const [graphqlResult, expertResults, documentResults] = await Promise.all([
          graphqlClient.request<SearchResponse>(SEARCH_ENTITIES_QUERY, {
            searchPattern,
            limit: 5 // Limit per entity type
          }),
          Promise.resolve(
            // Filter active experts by query
            activeExperts
              .filter(expert => {
                if (!query) return true
                const lowerQuery = query.toLowerCase()
                return (
                  expert.expertName.toLowerCase().includes(lowerQuery) ||
                  expert.specialty.toLowerCase().includes(lowerQuery)
                )
              })
              .map(
                (expert): EntityReference => ({
                  id: expert.expertId,
                  type: 'every_expert',
                  name: expert.expertName,
                  subtitle: `Expert • ${expert.specialty}`
                })
              )
          ),
          searchDocuments
            ? searchDocuments(query).catch(err => {
                console.error('Error searching documents:', err)
                return [] as EntityReference[]
              })
            : Promise.resolve([] as EntityReference[])
        ])

        const graphqlEntities = transformResponse(graphqlResult, query)

        // Combine experts (at the top), then GraphQL entities, then documents
        const allEntities = [...expertResults, ...graphqlEntities, ...documentResults]

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
    [graphqlClient, activeExperts, searchDocuments]
  )

  // Handle text change and detect mentions
  const handleTextChange = useCallback(
    (text: string, caretPosition: number) => {
      const mention = detectMention(text, caretPosition, selectedEntities)
      setMentionState(mention)

      if (mention) {
        searchEntities(mention.query)
      } else {
        setEntities([])
      }
    },
    [detectMention, searchEntities, selectedEntities]
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
      const displayText =
        insertionMode === 'markdown_link' ? `[${entity.name}](${entity.type}://${entity.id})` : `@${entity.name}`
      const newText = `${before}${displayText} ${after}`
      const newCaretPosition = before.length + displayText.length + 1

      // Strip out pictureThumbnail to avoid storing large base64 data in state
      // It's only needed for UI display in the popover, not in selected entities
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pictureThumbnail, ...entityWithoutPicture } = entity
      const entityRef: MessageEntityReference = {
        ...entityWithoutPicture,
        startIndex: mentionState.startIndex,
        endIndex: mentionState.startIndex + displayText.length
      }

      justInsertedRef.current = {
        endPosition: newCaretPosition,
        timestamp: Date.now()
      }

      setSelectedEntities(prev => [...prev, entityRef])
      setMentionState(null)
      setEntities([])

      return { newText, newCaretPosition, entityRef }
    },
    [mentionState, insertionMode]
  )

  // Clear all mention state
  const clearMentions = useCallback(() => {
    setMentionState(null)
    setEntities([])
    setSelectedEntities([])
  }, [])

  // Remove a specific mention entity
  const removeMention = useCallback((mention: MessageEntityReference) => {
    setSelectedEntities(prev =>
      prev.filter(e => !(e.id === mention.id && e.startIndex === mention.startIndex && e.endIndex === mention.endIndex))
    )
  }, [])

  // Close mention popover
  const closeMention = useCallback(() => {
    setMentionState(null)
    setEntities([])
  }, [])

  // Register a mention entity at a specific position (for programmatic insertion like @Every)
  const registerMentionEntity = useCallback(
    (entity: EntityReference, text: string, startIndex: number): MessageEntityReference => {
      const displayText = `@${entity.name}`
      const endIndex = startIndex + displayText.length

      // Strip out pictureThumbnail to avoid storing large base64 data in state
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pictureThumbnail, ...entityWithoutPicture } = entity
      const entityRef: MessageEntityReference = {
        ...entityWithoutPicture,
        startIndex,
        endIndex
      }

      setSelectedEntities(prev => {
        // Check if this entity is already registered at this position
        const exists = prev.some(e => e.id === entity.id && e.startIndex === startIndex && e.endIndex === endIndex)
        if (exists) return prev
        return [...prev, entityRef]
      })

      // Mark this position as just inserted to prevent re-detection
      justInsertedRef.current = {
        endPosition: text.length,
        timestamp: Date.now()
      }

      return entityRef
    },
    []
  )

  return {
    entities,
    isLoading,
    mentionState,
    selectedEntities,
    handleTextChange,
    insertEntity,
    clearMentions,
    removeMention,
    closeMention,
    searchEntities,
    registerMentionEntity
  }
}
