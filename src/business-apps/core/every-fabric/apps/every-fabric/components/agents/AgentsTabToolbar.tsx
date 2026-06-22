import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, UserPlusIcon } from '@phosphor-icons/react'

export const AGENTS_TAB_SUBTITLE = 'Create agents, configure their capabilities, and choose where they run.'

export const AGENTS_CREATE_LABEL = 'Create agent or worker'

export const AGENTS_HIRE_LABEL = 'Hire digital employee'

interface AgentsCreateButtonProps {
  onClick: () => void
  className?: string
}

export const AgentsCreateButton: React.FC<AgentsCreateButtonProps> = ({ onClick, className }) => (
  <Button type="button" onClick={onClick} className={className} data-testid="agents-hire-button">
    {AGENTS_CREATE_LABEL}
  </Button>
)

interface AgentsHireButtonProps {
  onClick: () => void
  className?: string
}

export const AgentsHireButton: React.FC<AgentsHireButtonProps> = ({ onClick, className }) => (
  <Button
    type="button"
    variant="outline"
    onClick={onClick}
    className={className}
    data-testid="agents-hire-employee-button"
  >
    <UserPlusIcon className="gba:mr-1.5 gba:h-4 gba:w-4" />
    {AGENTS_HIRE_LABEL}
  </Button>
)

interface AgentsTabToolbarProps {
  subtitle?: string
  search: string
  onSearchChange: (value: string) => void
  onCreate: () => void
  onHire?: () => void
  showSubtitle?: boolean
  showCreateAction?: boolean
}

export const AgentsTabToolbar: React.FC<AgentsTabToolbarProps> = ({
  subtitle = AGENTS_TAB_SUBTITLE,
  search,
  onSearchChange,
  onCreate,
  onHire,
  showSubtitle = true,
  showCreateAction = true
}) => (
  <div className="gba:space-y-5" data-testid="agents-tab-toolbar">
    {showSubtitle || showCreateAction ? (
      <div className="gba:flex gba:flex-col gba:gap-3 md:gba:flex-row md:gba:items-start md:gba:justify-between md:gba:gap-4">
        {showSubtitle ? (
          <p className="gba:max-w-2xl gba:flex-1 gba:text-sm gba:text-muted-foreground">{subtitle}</p>
        ) : null}
        {showCreateAction ? (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:shrink-0 md:gba:ml-4">
            {onHire ? <AgentsHireButton onClick={onHire} className="gba:w-fit gba:max-w-full" /> : null}
            <AgentsCreateButton onClick={onCreate} className="gba:w-fit gba:max-w-full" />
          </div>
        ) : null}
      </div>
    ) : null}

    <div className="gba:relative gba:w-full gba:max-w-xl">
      <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
      <input
        type="text"
        placeholder="Search active and archived agents..."
        value={search}
        onChange={event => onSearchChange(event.target.value)}
        className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:py-2 gba:pl-9 gba:pr-3 gba:text-sm gba:text-foreground gba:placeholder-muted-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
        data-testid="agents-search-input"
      />
    </div>
  </div>
)
