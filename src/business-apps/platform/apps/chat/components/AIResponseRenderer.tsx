import React from 'react'
import { Building2, User, Users, UserCircle, Rocket, TrendingUp, Sparkles } from 'lucide-react'
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

interface EntityLink {
  displayName: string
  type: string
  id: string
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

interface AIResponseRendererProps {
  content: string
  scheduledMeeting?: ScheduledMeeting
}

/**
 * Render AI response with clickable entity cards and optional meeting card
 */
export const AIResponseRenderer: React.FC<AIResponseRendererProps> = ({ content, scheduledMeeting }) => {
  const entityLinks = parseEntityLinks(content)

  const renderTextContent = () => {
    if (entityLinks.length === 0) {
      // No entity links, render as plain text with markdown-style formatting
      return <span className="gba:whitespace-pre-wrap">{renderMarkdownLite(content)}</span>
    }

    // Build parts array with text and entity chips
    const parts: React.ReactNode[] = []
    let lastIndex = 0

    entityLinks.forEach((link, idx) => {
      // Add text before this link
      if (link.startIndex > lastIndex) {
        const textBefore = content.slice(lastIndex, link.startIndex)
        parts.push(
          <span key={`text-${idx}`} className="gba:whitespace-pre-wrap">
            {renderMarkdownLite(textBefore)}
          </span>
        )
      }

      // Add the entity chip
      parts.push(<EntityChip key={`entity-${idx}`} link={link} />)

      lastIndex = link.endIndex
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
 * Simple markdown-lite renderer for basic formatting
 * Handles: **bold**, *italic*, `code`, and line breaks
 */
function renderMarkdownLite(text: string): React.ReactNode {
  // Split by bold markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="gba:font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={idx} className="gba:italic">
          {part.slice(1, -1)}
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
    return part
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

/**
 * Expert Thinking indicator component - shows when an AI expert is processing
 */
export interface ExpertThinkingIndicatorProps {
  expertName: string
  expertColor?: string
}

export const ExpertThinkingIndicator: React.FC<ExpertThinkingIndicatorProps> = ({ expertName, expertColor }) => {
  const color = expertColor || 'var(--nw-primary)'

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:text-sm gba:py-3">
      {/* Animated dots with expert color */}
      <div className="gba:flex gba:gap-1.5">
        <span
          className="gba:w-2.5 gba:h-2.5 gba:rounded-full gba:animate-bounce"
          style={{ backgroundColor: color, animationDelay: '0ms' }}
        />
        <span
          className="gba:w-2.5 gba:h-2.5 gba:rounded-full gba:animate-bounce"
          style={{ backgroundColor: color, animationDelay: '150ms' }}
        />
        <span
          className="gba:w-2.5 gba:h-2.5 gba:rounded-full gba:animate-bounce"
          style={{ backgroundColor: color, animationDelay: '300ms' }}
        />
      </div>
      {/* Expert name and status */}
      <div className="gba:flex gba:flex-col gba:gap-0.5">
        <span className="gba:font-medium" style={{ color }}>
          {expertName}
        </span>
        <span className="gba:text-xs gba:text-muted-foreground">is analyzing your request...</span>
      </div>
    </div>
  )
}

export { parseEntityLinks, type EntityLink }
