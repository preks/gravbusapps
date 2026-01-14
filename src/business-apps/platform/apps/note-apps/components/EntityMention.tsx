/**
 * EntityMention Component
 * 
 * Beautiful, clickable entity mention cards for the Note editor.
 * Supports all NEWWORK entity types with proper navigation.
 */

import React, { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react'
import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import {
  Building2,
  User,
  Users,
  Rocket,
  TrendingUp,
  UserCircle,
  Megaphone,
  Receipt,
  FileText,
  Newspaper,
  BookOpen,
  Globe,
  Sparkles,
  Search,
  Loader2
} from 'lucide-react'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

// Entity types (same as chat)
export type EntityType =
  | 'ai_assistant'
  | 'every_expert'
  | 'lead'
  | 'contact'
  | 'account'
  | 'opportunity'
  | 'investment_lead'
  | 'investment_contact'
  | 'investment_account'
  | 'investment_opportunity'
  | 'investment'
  | 'news_article'
  | 'knowledge_article'
  | 'intranet_article'
  | 'document_article'
  | 'employee'
  | 'campaign'
  | 'expense_request'

export interface EntityReference {
  id: string
  userId?: string
  type: EntityType | string
  name: string
  subtitle?: string
  pictureThumbnail?: string
}

// Entity icons
export const ENTITY_ICONS: Record<EntityType, React.ElementType> = {
  ai_assistant: Sparkles,
  every_expert: Sparkles,
  account: Building2,
  contact: User,
  lead: Users,
  opportunity: Rocket,
  investment_account: Building2,
  investment_contact: User,
  investment_lead: Users,
  investment_opportunity: Rocket,
  investment: TrendingUp,
  news_article: Newspaper,
  knowledge_article: BookOpen,
  intranet_article: Globe,
  document_article: FileText,
  employee: UserCircle,
  campaign: Megaphone,
  expense_request: Receipt
}

// Entity navigation paths
const ENTITY_NAVIGATION_PATHS: Record<EntityType, string> = {
  ai_assistant: '/platform/every-ai',
  every_expert: '/platform/every-ai',
  lead: '/platform/crm/lead-record',
  contact: '/platform/crm/contact-record',
  account: '/platform/crm/account-record',
  opportunity: '/platform/crm/opportunity-record',
  investment_lead: '/platform/irm/lead-record',
  investment_contact: '/platform/irm/contact-record',
  investment_account: '/platform/irm/account-record',
  investment_opportunity: '/platform/irm/opportunity-record',
  investment: '/platform/irm/investment-record',
  news_article: '/platform/content/intranet/content-record',
  knowledge_article: '/platform/content/intranet/content-record',
  intranet_article: '/platform/content/intranet/content-record',
  document_article: '/platform/content/intranet/content-record',
  employee: '/platform/employee-record',
  campaign: '/platform/crm/campaign-record',
  expense_request: '/platform/fin/expenses/expense-request-record'
}

const ENTITY_QUERY_PARAMS: Record<EntityType, string> = {
  ai_assistant: '',
  every_expert: '',
  lead: 'leadId',
  contact: 'contactId',
  account: 'accountId',
  opportunity: 'opportunityId',
  investment_lead: 'leadId',
  investment_contact: 'contactId',
  investment_account: 'accountId',
  investment_opportunity: 'opportunityId',
  investment: 'investmentId',
  news_article: 'contentId',
  knowledge_article: 'contentId',
  intranet_article: 'contentId',
  document_article: 'contentId',
  employee: 'employeeId',
  campaign: 'campaignId',
  expense_request: 'expenseRequestId'
}

// Entity category colors for visual distinction
export const ENTITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // CRM entities - Blue theme
  account: { bg: 'gba:bg-blue-50 dark:gba:bg-blue-950/30', border: 'gba:border-blue-200 dark:gba:border-blue-800', text: 'gba:text-blue-700 dark:gba:text-blue-300' },
  contact: { bg: 'gba:bg-blue-50 dark:gba:bg-blue-950/30', border: 'gba:border-blue-200 dark:gba:border-blue-800', text: 'gba:text-blue-700 dark:gba:text-blue-300' },
  lead: { bg: 'gba:bg-blue-50 dark:gba:bg-blue-950/30', border: 'gba:border-blue-200 dark:gba:border-blue-800', text: 'gba:text-blue-700 dark:gba:text-blue-300' },
  opportunity: { bg: 'gba:bg-blue-50 dark:gba:bg-blue-950/30', border: 'gba:border-blue-200 dark:gba:border-blue-800', text: 'gba:text-blue-700 dark:gba:text-blue-300' },
  // IRM entities - Purple theme
  investment_account: { bg: 'gba:bg-purple-50 dark:gba:bg-purple-950/30', border: 'gba:border-purple-200 dark:gba:border-purple-800', text: 'gba:text-purple-700 dark:gba:text-purple-300' },
  investment_contact: { bg: 'gba:bg-purple-50 dark:gba:bg-purple-950/30', border: 'gba:border-purple-200 dark:gba:border-purple-800', text: 'gba:text-purple-700 dark:gba:text-purple-300' },
  investment_lead: { bg: 'gba:bg-purple-50 dark:gba:bg-purple-950/30', border: 'gba:border-purple-200 dark:gba:border-purple-800', text: 'gba:text-purple-700 dark:gba:text-purple-300' },
  investment_opportunity: { bg: 'gba:bg-purple-50 dark:gba:bg-purple-950/30', border: 'gba:border-purple-200 dark:gba:border-purple-800', text: 'gba:text-purple-700 dark:gba:text-purple-300' },
  investment: { bg: 'gba:bg-purple-50 dark:gba:bg-purple-950/30', border: 'gba:border-purple-200 dark:gba:border-purple-800', text: 'gba:text-purple-700 dark:gba:text-purple-300' },
  // Employees - Green theme
  employee: { bg: 'gba:bg-emerald-50 dark:gba:bg-emerald-950/30', border: 'gba:border-emerald-200 dark:gba:border-emerald-800', text: 'gba:text-emerald-700 dark:gba:text-emerald-300' },
  // Content - Amber theme
  news_article: { bg: 'gba:bg-amber-50 dark:gba:bg-amber-950/30', border: 'gba:border-amber-200 dark:gba:border-amber-800', text: 'gba:text-amber-700 dark:gba:text-amber-300' },
  knowledge_article: { bg: 'gba:bg-amber-50 dark:gba:bg-amber-950/30', border: 'gba:border-amber-200 dark:gba:border-amber-800', text: 'gba:text-amber-700 dark:gba:text-amber-300' },
  intranet_article: { bg: 'gba:bg-amber-50 dark:gba:bg-amber-950/30', border: 'gba:border-amber-200 dark:gba:border-amber-800', text: 'gba:text-amber-700 dark:gba:text-amber-300' },
  document_article: { bg: 'gba:bg-amber-50 dark:gba:bg-amber-950/30', border: 'gba:border-amber-200 dark:gba:border-amber-800', text: 'gba:text-amber-700 dark:gba:text-amber-300' },
  // AI - Gradient/special
  ai_assistant: { bg: 'gba:bg-gradient-to-r gba:from-violet-50 gba:to-fuchsia-50 dark:gba:from-violet-950/30 dark:gba:to-fuchsia-950/30', border: 'gba:border-violet-200 dark:gba:border-violet-800', text: 'gba:text-violet-700 dark:gba:text-violet-300' },
  every_expert: { bg: 'gba:bg-gradient-to-r gba:from-violet-50 gba:to-fuchsia-50 dark:gba:from-violet-950/30 dark:gba:to-fuchsia-950/30', border: 'gba:border-violet-200 dark:gba:border-violet-800', text: 'gba:text-violet-700 dark:gba:text-violet-300' },
  // Other
  campaign: { bg: 'gba:bg-rose-50 dark:gba:bg-rose-950/30', border: 'gba:border-rose-200 dark:gba:border-rose-800', text: 'gba:text-rose-700 dark:gba:text-rose-300' },
  expense_request: { bg: 'gba:bg-slate-50 dark:gba:bg-slate-950/30', border: 'gba:border-slate-200 dark:gba:border-slate-800', text: 'gba:text-slate-700 dark:gba:text-slate-300' },
  // Default
  default: { bg: 'gba:bg-muted/50', border: 'gba:border-border', text: 'gba:text-foreground' }
}

/**
 * Navigate to entity record page
 */
export const navigateToEntity = (entity: EntityReference): void => {
  const type = entity.type as EntityType
  const basePath = ENTITY_NAVIGATION_PATHS[type]
  const queryParam = ENTITY_QUERY_PARAMS[type]

  if (!basePath) {
    console.warn('[EntityMention] Unknown entity type:', type)
    return
  }

  const isContentType = ['news_article', 'knowledge_article', 'intranet_article', 'document_article'].includes(type)

  const url = buildPlatformUrl(basePath, {
    ...(queryParam && { [queryParam]: entity.id }),
    source: 'note',
    ...(isContentType && { tab: 'home' })
  })

  navigateTo(url)
}

/**
 * Get entity URL for navigation
 */
export const getEntityUrl = (entity: { id: string; type: string }): string => {
  const type = entity.type as EntityType
  const basePath = ENTITY_NAVIGATION_PATHS[type]
  const queryParam = ENTITY_QUERY_PARAMS[type]

  if (!basePath) {
    console.warn('[EntityMention] Unknown entity type:', type)
    return '#'
  }

  const isContentType = ['news_article', 'knowledge_article', 'intranet_article', 'document_article'].includes(type)
  
  // Build URL with query params
  const params = new URLSearchParams()
  if (queryParam && entity.id) {
    params.set(queryParam, entity.id)
  }
  params.set('source', 'note')
  if (isContentType) {
    params.set('tab', 'home')
  }

  return `${basePath}?${params.toString()}`
}

/**
 * Entity Card rendered in the editor - Beautiful inline card with details
 */
interface EntityMentionCardProps {
  entity: EntityReference
  onClick?: () => void
}

export const EntityMentionCard: React.FC<EntityMentionCardProps> = ({ entity, onClick }) => {
  const type = entity.type as EntityType
  const Icon = ENTITY_ICONS[type] || FileText
  const colors = ENTITY_COLORS[type] || ENTITY_COLORS.default
  const showAvatar = type === 'employee' && entity.pictureThumbnail

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (onClick) {
      onClick()
    } else {
      // Open in new tab
      const url = getEntityUrl(entity)
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <span
      onClick={handleClick}
      className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-0.5 gba:rounded-md gba:border gba:text-sm gba:font-medium gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:scale-[1.02] hover:gba:shadow-sm gba:mx-0.5 ${colors.bg} ${colors.border} ${colors.text}`}
      contentEditable={false}
      data-entity-id={entity.id}
      data-entity-type={entity.type}
    >
      {showAvatar ? (
        <img
          src={entity.pictureThumbnail?.startsWith('data:') ? entity.pictureThumbnail : `data:image/png;base64,${entity.pictureThumbnail}`}
          alt={entity.name}
          className="gba:w-4 gba:h-4 gba:rounded-full gba:object-cover"
        />
      ) : (
        <Icon className="gba:w-3.5 gba:h-3.5" />
      )}
      <span className="gba:truncate gba:max-w-[150px]">{entity.name}</span>
    </span>
  )
}

/**
 * Suggestion List for the mention dropdown
 */
interface MentionSuggestionListProps {
  items: EntityReference[]
  command: (item: EntityReference) => void
  isLoading?: boolean
  query?: string
}

export interface MentionSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionSuggestionList = forwardRef<MentionSuggestionListRef, MentionSuggestionListProps>(
  ({ items, command, isLoading, query }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = useCallback((index: number) => {
      const item = items[index]
      if (item) {
        command(item)
      }
    }, [items, command])

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      }
    }))

    if (isLoading) {
      return (
        <div className="gba:bg-popover gba:border gba:rounded-lg gba:shadow-lg gba:p-4 gba:min-w-[280px]">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
            <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
            <span>Searching...</span>
          </div>
        </div>
      )
    }

    if (!items.length) {
      return (
        <div className="gba:bg-popover gba:border gba:rounded-lg gba:shadow-lg gba:p-4 gba:min-w-[280px]">
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:text-muted-foreground">
            <Search className="gba:w-5 gba:h-5" />
            <span className="gba:text-sm">
              {query ? `No results for "${query}"` : 'Type to search entities'}
            </span>
          </div>
        </div>
      )
    }

    return (
      <div className="gba:bg-popover gba:border gba:rounded-lg gba:shadow-xl gba:overflow-hidden gba:min-w-[320px] gba:max-h-[400px] gba:overflow-y-auto">
        <div className="gba:px-3 gba:py-2 gba:border-b gba:bg-muted/30">
          <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
            {items.length} result{items.length !== 1 ? 's' : ''} • Use ↑↓ to navigate, Enter to select
          </span>
        </div>
        <div className="gba:py-1">
          {items.map((item, index) => {
            const type = item.type as EntityType
            const Icon = ENTITY_ICONS[type] || FileText
            const colors = ENTITY_COLORS[type] || ENTITY_COLORS.default
            // Show picture for employees and accounts
            const hasPicture = item.pictureThumbnail && (type === 'employee' || type === 'account')
            
            // Format picture URL - handles base64, data URLs, and regular URLs
            const getPictureUrl = (url: string | undefined) => {
              if (!url) return null
              if (url.startsWith('data:')) return url
              if (url.startsWith('http://') || url.startsWith('https://')) return url
              return `data:image/png;base64,${url}`
            }
            const pictureUrl = getPictureUrl(item.pictureThumbnail)

            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => selectItem(index)}
                className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:transition-colors gba:text-left ${
                  index === selectedIndex
                    ? 'gba:bg-accent gba:text-accent-foreground'
                    : 'hover:gba:bg-muted/50'
                }`}
              >
                {/* Icon/Avatar/Logo */}
                <div className={`gba:w-9 gba:h-9 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:shrink-0 ${colors.bg} ${colors.border} gba:border gba:overflow-hidden`}>
                  {hasPicture && pictureUrl ? (
                    <img
                      src={pictureUrl}
                      alt={item.name}
                      className="gba:w-7 gba:h-7 gba:rounded-md gba:object-cover"
                      onError={(e) => {
                        // Hide broken images and show icon instead
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <Icon className={`gba:w-4 gba:h-4 ${colors.text}`} />
                  )}
                </div>

                {/* Text content */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:font-medium gba:text-sm gba:truncate">{item.name}</div>
                  {item.subtitle && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                      {item.subtitle}
                    </div>
                  )}
                </div>

                {/* Type badge */}
                <div className={`gba:text-[10px] gba:font-medium gba:px-1.5 gba:py-0.5 gba:rounded ${colors.bg} ${colors.text} gba:uppercase gba:tracking-wide`}>
                  {type.replace('_', ' ').split(' ')[0]}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)

MentionSuggestionList.displayName = 'MentionSuggestionList'

// GraphQL query for searching entities
const SEARCH_ENTITIES_QUERY = `
  query SearchEntities($searchPattern: String!, $limit: Int) {
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
      pictureThumbnailUrl
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
          ]}
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      email
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
    
    Employee(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { _or: [
            { firstName: { _ilike: $searchPattern } }
            { lastName: { _ilike: $searchPattern } }
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
      contentGroupRef
      contentGroup {
        value
      }
    }
  }
`

interface SearchResponse {
  Account: Array<{ id: string; name: string; email?: string; code?: string; pictureThumbnailUrl?: string }>
  Contact: Array<{ id: string; firstName?: string; lastName?: string; email?: string }>
  Lead: Array<{ id: string; firstName?: string; lastName?: string; companyName?: string; email?: string }>
  Opportunity: Array<{ id: string; name: string; stage?: string; code?: string }>
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
  ContentEntry: Array<{
    id: string
    title?: string
    preview?: string
    pictureThumbnail?: string
    contentGroupRef?: string
    contentGroup?: { value?: string }
  }>
}

/**
 * Transform GraphQL response to EntityReference array
 */
const transformSearchResponse = (result: SearchResponse): EntityReference[] => {
  const entities: EntityReference[] = []

  // Accounts - with logo support
  result.Account?.forEach(acc => {
    entities.push({
      id: acc.id,
      type: 'account',
      name: acc.name || 'Account',
      subtitle: `CRM Account • ${acc.email || acc.code || ''}`,
      pictureThumbnail: acc.pictureThumbnailUrl
    })
  })

  // Contacts
  result.Contact?.forEach(contact => {
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Contact'
    entities.push({
      id: contact.id,
      type: 'contact',
      name,
      subtitle: `CRM Contact • ${contact.email || ''}`
    })
  })

  // Leads
  result.Lead?.forEach(lead => {
    const name = lead.companyName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead'
    entities.push({
      id: lead.id,
      type: 'lead',
      name,
      subtitle: `CRM Lead • ${lead.email || ''}`
    })
  })

  // Opportunities
  result.Opportunity?.forEach(opp => {
    entities.push({
      id: opp.id,
      type: 'opportunity',
      name: opp.name || 'Opportunity',
      subtitle: `CRM Opportunity • ${opp.stage || opp.code || ''}`
    })
  })

  // Employees
  result.Employee?.forEach(emp => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee'
    const jobTitle = emp.employeePosition?.jobPosition?.name
    const orgUnit = emp.employeePosition?.organizationalUnit?.name
    const subtitle = [jobTitle, orgUnit].filter(Boolean).join(' • ') || 'Employee'
    entities.push({
      id: emp.id,
      userId: emp.userId,
      type: 'employee',
      name,
      subtitle,
      pictureThumbnail: emp.pictureThumbnail
    })
  })

  // Content entries
  result.ContentEntry?.forEach(entry => {
    const groupRef = entry.contentGroupRef || ''
    let entityType: EntityType = 'intranet_article'
    let categoryLabel = 'Content'

    if (groupRef.includes('NEWS')) {
      entityType = 'news_article'
      categoryLabel = 'News'
    } else if (groupRef.includes('KNOWLEDGE')) {
      entityType = 'knowledge_article'
      categoryLabel = 'Knowledge'
    } else if (groupRef.includes('DOCUMENT')) {
      entityType = 'document_article'
      categoryLabel = 'Document'
    }

    entities.push({
      id: entry.id,
      type: entityType,
      name: entry.title || 'Untitled',
      subtitle: `${categoryLabel} • ${entry.contentGroup?.value || 'Article'}`,
      pictureThumbnail: entry.pictureThumbnail
    })
  })

  return entities
}

/**
 * Create mention suggestion configuration for TipTap
 */
export const createMentionSuggestion = (accessToken: string) => {
  let componentRef: ReactRenderer | null = null
  let popup: TippyInstance[] | null = null

  // Set the access token on the shared client
  if (accessToken) {
    graphQLClient.setAccessToken(accessToken)
  }

  return {
    char: '@',
    
    items: async ({ query }: { query: string }): Promise<EntityReference[]> => {
      if (!accessToken) {
        console.warn('[EntityMention] No access token provided')
        return []
      }
      
      const searchPattern = query ? `%${query}%` : '%%'
      console.log('[EntityMention] Searching for:', query, 'pattern:', searchPattern)
      
      try {
        const result = await graphQLClient.request<SearchResponse>(SEARCH_ENTITIES_QUERY, {
          searchPattern,
          limit: 5
        })
        const entities = transformSearchResponse(result).slice(0, 12)
        console.log('[EntityMention] Found entities:', entities.length)
        return entities
      } catch (error) {
        console.error('[EntityMention] Search error:', error)
        return []
      }
    },

    command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
      // Insert the mention node with all entity attributes for beautiful card rendering
      // props contains the EntityReference fields: id, name, type, subtitle, pictureThumbnail, etc.
      console.log('[EntityMention] Inserting entity:', props)
      
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'mention',
            attrs: {
              id: props.id,
              label: props.name || props.label,
              type: props.type,
              subtitle: props.subtitle || null,
              pictureThumbnail: props.pictureThumbnail || null
            }
          },
          {
            type: 'text',
            text: ' '
          }
        ])
        .run()
    },

    render: () => {
      return {
        onStart: (props: any) => {
          console.log('[EntityMention] Suggestion started', props)
          
          componentRef = new ReactRenderer(MentionSuggestionList, {
            props: {
              ...props,
              isLoading: true
            },
            editor: props.editor
          })

          if (!props.clientRect) return

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: componentRef.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            animation: 'shift-away',
            theme: 'light-border'
          })
        },

        onUpdate: (props: any) => {
          console.log('[EntityMention] Suggestion updated', props.items?.length, 'items')
          
          componentRef?.updateProps({
            ...props,
            isLoading: false
          })

          if (!props.clientRect) return

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect
          })
        },

        onKeyDown: (props: any) => {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return (componentRef?.ref as any)?.onKeyDown?.(props) || false
        },

        onExit: () => {
          console.log('[EntityMention] Suggestion exited')
          popup?.[0]?.destroy()
          componentRef?.destroy()
        }
      }
    }
  }
}

export default EntityMentionCard
