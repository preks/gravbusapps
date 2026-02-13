import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@newwork/nw-design-system'
import { Globe, FolderOpen, Sparkles } from 'lucide-react'

interface Space {
  id: string
  name: string
}

interface NexusScopeSelectorProps {
  scope: 'all' | 'space' | 'none'
  spaceId: string | null
  spaces: Space[]
  onScopeChange: (scope: 'all' | 'space' | 'none') => void
  onSpaceChange: (spaceId: string | null) => void
  testId?: string
}

export const NexusScopeSelector = ({
  scope,
  spaceId,
  spaces,
  onScopeChange,
  onSpaceChange,
  testId = 'nexus-scope-selector'
}: NexusScopeSelectorProps) => {
  const selectedSpace = spaces.find(s => s.id === spaceId)

  const getLabel = () => {
    if (scope === 'none') return 'None'
    if (scope === 'space' && selectedSpace) {
      return selectedSpace.name.length > 12 ? `${selectedSpace.name.slice(0, 12)}...` : selectedSpace.name
    }
    return 'All'
  }

  const getIcon = () => {
    if (scope === 'none') return <Sparkles className="gba:h-3 gba:w-3" />
    if (scope === 'space') return <FolderOpen className="gba:h-3 gba:w-3" />
    return <Globe className="gba:h-3 gba:w-3" />
  }

  const handleSelect = (value: string) => {
    if (value === 'none') {
      onScopeChange('none')
      onSpaceChange(null)
    } else if (value === 'all') {
      onScopeChange('all')
      onSpaceChange(null)
    } else {
      onScopeChange('space')
      onSpaceChange(value)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="gba:flex gba:items-center gba:gap-1.5 gba:h-7 gba:px-2.5 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none gba:bg-muted gba:text-muted-foreground gba:hover:bg-accent"
          data-testid={`${testId}-trigger`}
        >
          {getIcon()}
          {getLabel()}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => handleSelect('none')} data-testid={`${testId}-none`}>
          <Sparkles className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-primary" />
          None {scope === 'none' ? '(active)' : ''}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelect('all')} data-testid={`${testId}-all`}>
          <Globe className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
          All my content {scope === 'all' ? '(active)' : ''}
        </DropdownMenuItem>
        {spaces.map(space => (
          <DropdownMenuItem
            key={space.id}
            onClick={() => handleSelect(space.id)}
            data-testid={`${testId}-space-${space.id}`}
          >
            <FolderOpen className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
            {space.name} {scope === 'space' && spaceId === space.id ? '(active)' : ''}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
