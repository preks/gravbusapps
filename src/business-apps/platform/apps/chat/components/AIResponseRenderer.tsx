import React from 'react'
import { Building2, User, Users, UserCircle, Rocket, TrendingUp, Sparkles, ExternalLink } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { ScheduledMeeting } from '../hooks/useEveryAIChat'
import { MeetingCard } from './MeetingCard'

/**
 * Entity link pattern: [Display Name](type://id)
 * Examples:
 * - [Rainer Gläß](employee://adea850a-6583-458a-bf8b-d07d31a499a4)
 * - [CocaCola](account://e1ecee51-1f4b-4d0c-b33d-f4bdda1ab0a5)
 */
const ENTITY_LINK_REGEX = /\[([^\]]+)\]\((\w+):\/\/([^)]+)\)/g

/**
 * Markdown HTTP link pattern: [Display Text](https://url) or [Display Text](http://url)
 * Examples:
 * - [Website](https://www.zalando.com)
 * - [Activity Source](https://jobs.zalando.com/en/open-positions/)
 */
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g

interface EntityLink {
  displayName: string
  type: string
  id: string
  fullMatch: string
  startIndex: number
  endIndex: number
}

interface MarkdownLink {
  displayText: string
  url: string
  fullMatch: string
  startIndex: number
  endIndex: number
}

// Map entity types to icons
const ENTITY_TYPE_ICONS: Record<string, React.ElementType> = {
  employee: UserCircle,
  account: Building2,
  contact: User,
  lead: Users,
  opportunity: Rocket,
  investment: TrendingUp,
  investment_account: Building2,
  investment_contact: User,
  investment_lead: Users,
  investment_opportunity: Rocket
}

// Map entity types to navigation paths
const ENTITY_TYPE_PATHS: Record<string, string> = {
  employee: '/platform/employee-record',
  account: '/platform/crm/account-record',
  contact: '/platform/crm/contact-record',
  lead: '/platform/crm/lead-record',
  opportunity: '/platform/crm/opportunity-record',
  investment: '/platform/irm/investment-record',
  investment_account: '/platform/irm/account-record',
  investment_contact: '/platform/irm/contact-record',
  investment_lead: '/platform/irm/lead-record',
  investment_opportunity: '/platform/irm/opportunity-record'
}

// Map entity types to query param names
const ENTITY_TYPE_PARAMS: Record<string, string> = {
  employee: 'employeeId',
  account: 'accountId',
  contact: 'contactId',
  lead: 'leadId',
  opportunity: 'opportunityId',
  investment: 'investmentId',
  investment_account: 'accountId',
  investment_contact: 'contactId',
  investment_lead: 'leadId',
  investment_opportunity: 'opportunityId'
}

/**
 * Parse entity links from text
 */
function parseEntityLinks(text: string): EntityLink[] {
  const links: EntityLink[] = []
  let match

  // Reset regex lastIndex
  ENTITY_LINK_REGEX.lastIndex = 0

  while ((match = ENTITY_LINK_REGEX.exec(text)) !== null) {
    links.push({
      displayName: match[1],
      type: match[2],
      id: match[3],
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }

  return links
}

/**
 * Parse markdown HTTP links from text
 */
function parseMarkdownLinks(text: string): MarkdownLink[] {
  const links: MarkdownLink[] = []
  let match

  // Reset regex lastIndex
  MARKDOWN_LINK_REGEX.lastIndex = 0

  while ((match = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
    links.push({
      displayText: match[1],
      url: match[2],
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }

  return links
}

/**
 * Navigate to an entity
 */
function navigateToEntity(type: string, id: string) {
  const basePath = ENTITY_TYPE_PATHS[type]
  const paramName = ENTITY_TYPE_PARAMS[type]

  if (basePath && paramName) {
    navigateTo(`${basePath}?${paramName}=${id}`)
  }
}

/**
 * Entity chip component - clickable badge for entity references
 */
const EntityChip: React.FC<{ link: EntityLink }> = ({ link }) => {
  const Icon = ENTITY_TYPE_ICONS[link.type] || Sparkles
  const isClickable = !!ENTITY_TYPE_PATHS[link.type]

  return (
    <button
      onClick={e => {
        e.stopPropagation()
        if (isClickable) {
          navigateToEntity(link.type, link.id)
        }
      }}
      disabled={!isClickable}
      className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-md gba:text-xs gba:font-medium gba:transition-all gba:mx-0.5 gba:my-0.5 ${
        isClickable
          ? 'gba:bg-primary/10 gba:text-primary gba:hover:bg-primary/20 gba:cursor-pointer gba:border gba:border-primary/20 gba:hover:border-primary/40'
          : 'gba:bg-muted gba:text-muted-foreground'
      }`}
      title={isClickable ? `Open ${link.type}: ${link.displayName}` : link.displayName}
      data-testid={`ai-entity-chip-${link.type}-${link.id}`}
    >
      <Icon className="gba:w-3.5 gba:h-3.5" />
      <span className="gba:truncate gba:max-w-[150px]">{link.displayName}</span>
    </button>
  )
}

/**
 * Markdown link component - clickable link for HTTP URLs
 */
const MarkdownLinkChip: React.FC<{ link: MarkdownLink }> = ({ link }) => {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:text-primary gba:underline gba:hover:text-primary/80 gba:transition-colors"
      title={link.url}
      data-testid={`ai-markdown-link`}
    >
      {link.displayText}
      <ExternalLink className="gba:w-3 gba:h-3" />
    </a>
  )
}

/**
 * Combined link type for sorting
 */
type ParsedLink = { type: 'entity'; data: EntityLink } | { type: 'markdown'; data: MarkdownLink }

/**
 * Parse all links (entity + markdown) from text and sort by position
 */
function parseAllLinks(text: string): ParsedLink[] {
  const entityLinks = parseEntityLinks(text)
  const markdownLinks = parseMarkdownLinks(text)

  const allLinks: ParsedLink[] = [
    ...entityLinks.map(link => ({ type: 'entity' as const, data: link })),
    ...markdownLinks.map(link => ({ type: 'markdown' as const, data: link }))
  ]

  // Sort by start index
  allLinks.sort((a, b) => {
    const aStart = a.type === 'entity' ? a.data.startIndex : a.data.startIndex
    const bStart = b.type === 'entity' ? b.data.startIndex : b.data.startIndex
    return aStart - bStart
  })

  return allLinks
}

interface AIResponseRendererProps {
  content: string
  scheduledMeeting?: ScheduledMeeting
}

/**
 * Render AI response with clickable entity cards, markdown links, and optional meeting card
 */
export const AIResponseRenderer: React.FC<AIResponseRendererProps> = ({ content, scheduledMeeting }) => {
  const allLinks = parseAllLinks(content)

  const renderTextContent = () => {
    if (allLinks.length === 0) {
      // No links, render as plain text with markdown-style formatting
      return <span className="gba:whitespace-pre-wrap">{renderMarkdownLite(content)}</span>
    }

    // Build parts array with text and link chips
    const parts: React.ReactNode[] = []
    let lastIndex = 0

    allLinks.forEach((link, idx) => {
      const startIndex = link.type === 'entity' ? link.data.startIndex : link.data.startIndex
      const endIndex = link.type === 'entity' ? link.data.endIndex : link.data.endIndex

      // Add text before this link
      if (startIndex > lastIndex) {
        const textBefore = content.slice(lastIndex, startIndex)
        parts.push(
          <span key={`text-${idx}`} className="gba:whitespace-pre-wrap">
            {renderMarkdownLite(textBefore)}
          </span>
        )
      }

      // Add the appropriate chip based on link type
      if (link.type === 'entity') {
        parts.push(<EntityChip key={`entity-${idx}`} link={link.data} />)
      } else {
        parts.push(<MarkdownLinkChip key={`mdlink-${idx}`} link={link.data} />)
      }

      lastIndex = endIndex
    })

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key="text-end" className="gba:whitespace-pre-wrap">
          {renderMarkdownLite(content.slice(lastIndex))}
        </span>
      )
    }

    return <div className="gba:leading-relaxed">{parts}</div>
  }

  // Render meeting card with error boundary
  const renderMeetingCard = () => {
    if (!scheduledMeeting) return null

    try {
      return <MeetingCard meeting={scheduledMeeting} />
    } catch (error) {
      console.error('❌ [AIResponseRenderer] Error rendering MeetingCard:', error)
      // Fail silently - show text response only
      return null
    }
  }

  return (
    <div className="gba:space-y-3">
      {renderTextContent()}
      {renderMeetingCard()}
    </div>
  )
}

/**
 * URL regex pattern for detecting URLs in text
 * Matches http://, https://, and www. prefixed URLs
 */
const URL_REGEX = /(https?:\/\/[^\s<>[\]()]+|www\.[^\s<>[\]()]+)/gi

/**
 * Render URLs as clickable links
 */
function renderTextWithUrls(text: string, keyPrefix: string): React.ReactNode {
  const parts = text.split(URL_REGEX)

  return parts.map((part, idx) => {
    // Check if this part is a URL
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex since we're using 'g' flag
      URL_REGEX.lastIndex = 0

      // Add https:// if it starts with www.
      const href = part.startsWith('www.') ? `https://${part}` : part

      return (
        <a
          key={`${keyPrefix}-url-${idx}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="gba:text-primary gba:underline gba:hover:text-primary/80 gba:transition-colors"
          onClick={e => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
}

/**
 * Simple markdown-lite renderer for basic formatting
 * Handles: **bold**, *italic*, `code`, URLs, and line breaks
 */
function renderMarkdownLite(text: string): React.ReactNode {
  // Split by bold markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="gba:font-semibold">
          {renderTextWithUrls(part.slice(2, -2), `bold-${idx}`)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={idx} className="gba:italic">
          {renderTextWithUrls(part.slice(1, -1), `italic-${idx}`)}
        </em>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="gba:bg-muted gba:px-1 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    // For plain text, also check for URLs
    return <React.Fragment key={idx}>{renderTextWithUrls(part, `text-${idx}`)}</React.Fragment>
  })
}

/**
 * AI Thinking indicator component
 */
export const AIThinkingIndicator: React.FC = () => {
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:py-2">
      <div className="gba:flex gba:gap-1">
        <span
          className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span>Every AI is thinking...</span>
    </div>
  )
}

export { parseEntityLinks, type EntityLink }
