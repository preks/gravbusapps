import React, { useEffect, useRef } from 'react'
import { Badge, Spinner } from '@newwork/nw-design-system'
import {
  Building2,
  User,
  Users,
  Rocket,
  TrendingUp,
  UserCircle,
  Megaphone,
  Receipt,
  Newspaper,
  BookOpen,
  Globe,
  FileText,
  Sparkles
} from 'lucide-react'
import type { EntityReference, EntityType } from '@/common/hooks/useEntityMentions'

interface EntityMentionPopoverProps {
  entities: EntityReference[]
  isLoading: boolean
  onSelect: (entity: EntityReference) => void
  onClose: () => void
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
}

const ENTITY_ICONS: Record<EntityType, React.ElementType> = {
  // AI Assistants
  ai_assistant: Sparkles,
  every_expert: Sparkles,
  // CRM
  account: Building2,
  contact: User,
  lead: Users,
  opportunity: Rocket,
  // IRM
  investment_account: Building2,
  investment_contact: User,
  investment_lead: Users,
  investment_opportunity: Rocket,
  investment: TrendingUp,
  // Intranet content
  news_article: Newspaper,
  knowledge_article: BookOpen,
  intranet_article: Globe,
  document_article: FileText,
  // Other
  employee: UserCircle,
  campaign: Megaphone,
  expense_request: Receipt
}

const ENTITY_COLORS: Record<EntityType, string> = {
  // AI Assistants (gradient-like accent)
  ai_assistant: 'gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:text-primary-foreground',
  every_expert: 'gba:bg-gradient-to-br gba:from-accent gba:to-primary gba:text-primary-foreground',
  // CRM (blue/green tones)
  account: 'gba:bg-info-secondary gba:text-info-secondary-foreground',
  contact: 'gba:bg-success-secondary gba:text-success-secondary-foreground',
  lead: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground',
  opportunity: 'gba:bg-primary/10 gba:text-primary',
  // IRM (purple/accent tones)
  investment_account: 'gba:bg-accent gba:text-accent-foreground',
  investment_contact: 'gba:bg-accent gba:text-accent-foreground',
  investment_lead: 'gba:bg-accent gba:text-accent-foreground',
  investment_opportunity: 'gba:bg-accent gba:text-accent-foreground',
  investment: 'gba:bg-accent gba:text-accent-foreground',
  // Intranet content (info/knowledge tones)
  news_article: 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground',
  knowledge_article: 'gba:bg-info-secondary gba:text-info-secondary-foreground',
  intranet_article: 'gba:bg-success-secondary gba:text-success-secondary-foreground',
  document_article: 'gba:bg-offline-secondary gba:text-offline-secondary-foreground',
  // Other
  employee: 'gba:bg-muted gba:text-muted-foreground',
  campaign: 'gba:bg-secondary gba:text-secondary-foreground',
  expense_request: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
}

const ENTITY_LABELS: Record<EntityType, string> = {
  // AI Assistants
  ai_assistant: 'AI Assistant',
  every_expert: 'Expert',
  // CRM
  account: 'CRM Account',
  contact: 'CRM Contact',
  lead: 'CRM Lead',
  opportunity: 'CRM Opportunity',
  // IRM
  investment_account: 'IRM Account',
  investment_contact: 'IRM Contact',
  investment_lead: 'IRM Lead',
  investment_opportunity: 'IRM Opportunity',
  investment: 'Investment',
  // Intranet content
  news_article: 'News',
  knowledge_article: 'Knowledge',
  intranet_article: 'Intranet',
  document_article: 'Document',
  // Other
  employee: 'Employee',
  campaign: 'Campaign',
  expense_request: 'Expense'
}

/**
 * EntityMentionPopover - Shared component for displaying entity search results
 * Used by both Chat and Every-AI apps for @ mention functionality
 */
export const EntityMentionPopover: React.FC<EntityMentionPopoverProps> = ({
  entities,
  isLoading,
  onSelect,
  selectedIndex,
  onSelectedIndexChange
}) => {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  // Note: Keyboard navigation is handled by parent component (MessageInput or ChatInput)
  // to prevent double-handling of events

  if (isLoading && entities.length === 0) {
    return (
      <div
        className="gba:absolute gba:bottom-full gba:left-0 gba:right-0 gba:mb-2 gba:bg-popover gba:border gba:border-border gba:rounded-lg gba:shadow-lg gba:p-3 gba:z-50"
        data-testid="entity-mention-popover"
      >
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
          <Spinner size="sm" />
          <span>Searching...</span>
        </div>
      </div>
    )
  }

  if (entities.length === 0) {
    return (
      <div
        className="gba:absolute gba:bottom-full gba:left-0 gba:right-0 gba:mb-2 gba:bg-popover gba:border gba:border-border gba:rounded-lg gba:shadow-lg gba:p-3 gba:z-50"
        data-testid="entity-mention-popover"
      >
        <div className="gba:text-sm gba:text-muted-foreground gba:text-center">
          No entities found. Try a different search.
        </div>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="gba:absolute gba:bottom-full gba:left-0 gba:right-0 gba:mb-2 gba:bg-popover gba:border gba:border-border gba:rounded-lg gba:shadow-lg gba:overflow-hidden gba:z-50 gba:max-h-64 gba:overflow-y-auto"
      data-testid="entity-mention-popover"
    >
      <div className="gba:p-1.5">
        <div className="gba:text-[10px] gba:uppercase gba:font-medium gba:text-muted-foreground gba:px-2 gba:py-1">
          Reference an entity
        </div>
        {entities.map((entity, index) => {
          const Icon = ENTITY_ICONS[entity.type as EntityType] || User
          const colorClass = ENTITY_COLORS[entity.type as EntityType] || 'gba:bg-muted gba:text-muted-foreground'
          const isSelected = index === selectedIndex

          return (
            <button
              key={`${entity.type}-${entity.id}`}
              ref={el => {
                itemRefs.current[index] = el
              }}
              onClick={() => onSelect(entity)}
              onMouseEnter={() => onSelectedIndexChange(index)}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-2 gba:py-2 gba:rounded-md gba:transition-colors gba:text-left ${
                isSelected ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-muted/50'
              }`}
              data-testid={`entity-mention-item-${entity.id}`}
            >
              {entity.pictureThumbnail ? (
                <img
                  src={`data:image/jpeg;base64,${entity.pictureThumbnail}`}
                  alt={entity.name}
                  className="gba:w-8 gba:h-8 gba:rounded-full gba:object-cover gba:flex-shrink-0"
                />
              ) : (
                <div
                  className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${colorClass}`}
                >
                  <Icon className="gba:w-4 gba:h-4" />
                </div>
              )}

              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-sm gba:font-medium gba:truncate">{entity.name}</span>
                  <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                    {ENTITY_LABELS[entity.type as EntityType] || entity.type}
                  </Badge>
                </div>
                {entity.subtitle && (
                  <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{entity.subtitle}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {isLoading && (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-2 gba:border-t gba:border-border">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  )
}
