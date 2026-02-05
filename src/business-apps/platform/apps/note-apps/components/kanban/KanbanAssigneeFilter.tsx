import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import { LayoutGrid } from 'lucide-react'
import type { KanbanParticipant } from '../../../shared/extensions/Kanban'

export function KanbanAssigneeFilter(props: {
  participants: KanbanParticipant[]
  value: string | null
  onChange: (next: string | null) => void
  testId: string
}): React.ReactElement | null {
  const { participants, value, onChange, testId } = props

  // Always show the filter if we have any participants
  if (!participants.length) return null

  const isSelected = (id: string | null) => value === id

  const chipClass = (active: boolean) =>
    `gba:rounded-full gba:transition-all gba:cursor-pointer hover:gba:scale-105 ${
      active ? 'gba:ring-2 gba:ring-primary gba:ring-offset-1' : 'gba:opacity-70 hover:gba:opacity-100'
    }`

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-2">
      {/* All filter */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={chipClass(isSelected(null))}
            onClick={() => onChange(null)}
            data-testid={`${testId}-assignee-filter-all`}
          >
            <div className="gba:h-6 gba:w-6 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <LayoutGrid className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="gba:text-[10px]">
          Show all cards
        </TooltipContent>
      </Tooltip>

      {/* Participant filters */}
      {participants.map(p => (
        <Tooltip key={p.userId}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={chipClass(isSelected(p.userId))}
              onClick={() => onChange(isSelected(p.userId) ? null : p.userId)}
              data-testid={`${testId}-assignee-filter-${p.userId}`}
            >
              <div
                className="gba:h-6 gba:w-6 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:overflow-hidden gba:bg-primary"
                style={{ backgroundColor: p.userColor || '#6366f1' }}
              >
                {p.userAvatar ? (
                  <img src={p.userAvatar} alt={p.userName || ''} className="gba:w-full gba:h-full gba:object-cover" />
                ) : (
                  <span className="gba:text-[10px] gba:font-bold gba:text-primary-foreground">
                    {p.userName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="gba:text-[10px]">
            {p.userName}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
