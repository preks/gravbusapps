import { useState } from 'react'
import { ChevronDown, ChevronRight, Bot } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import type { CommEvent } from './AgentCommFeed'

interface SubAgentSourcesProps {
  commEvents: CommEvent[]
  accessToken: string
}

/**
 * Displays sub-agent responses as expandable source sections below
 * the main assistant answer, giving transparency into which experts
 * contributed to the final response.
 */
export const SubAgentSources = ({ commEvents, accessToken }: SubAgentSourcesProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const subAgentResponses = commEvents.filter(e => e.type === 'response' && e.status === 'success' && e.response)

  if (subAgentResponses.length === 0) return null

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="gba:mt-2 gba:border-t gba:border-border gba:pt-2 gba:space-y-1" data-testid="sub-agent-sources">
      <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">Sources</span>
      {subAgentResponses.map(event => {
        const isExpanded = expandedIds.has(event.id)
        const agentLabel = event.toAgent || event.fromAgent || 'Agent'

        return (
          <div
            key={event.id}
            className="gba:rounded gba:border gba:border-border"
            data-testid={`sub-agent-source-${event.id}`}
          >
            <button
              type="button"
              onClick={() => toggleExpanded(event.id)}
              className="gba:flex gba:items-center gba:gap-1.5 gba:w-full gba:px-2 gba:py-1 gba:text-xs gba:text-muted-foreground gba:hover:bg-accent/50 gba:rounded gba:transition-colors"
              data-testid={`sub-agent-source-toggle-${event.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="gba:w-3 gba:h-3 gba:flex-shrink-0" />
              ) : (
                <ChevronRight className="gba:w-3 gba:h-3 gba:flex-shrink-0" />
              )}
              <Bot className="gba:w-3 gba:h-3 gba:flex-shrink-0" />
              <span className="gba:truncate">{agentLabel}</span>
              {event.durationMs != null && (
                <span className="gba:ml-auto gba:text-muted-foreground/60 gba:flex-shrink-0">
                  {event.durationMs < 1000 ? `${event.durationMs}ms` : `${(event.durationMs / 1000).toFixed(1)}s`}
                </span>
              )}
            </button>
            {isExpanded && event.response && (
              <div className="gba:px-2 gba:pb-2 gba:text-xs">
                <MarkdownWithChipsRenderer content={event.response} accessToken={accessToken} variant="chat" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
