import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { Globe, FolderOpen } from 'lucide-react'

interface Space {
  id: string
  name: string
}

interface NexusScopeSelectorProps {
  scope: 'all' | 'space'
  spaceId: string | null
  spaces: Space[]
  onScopeChange: (scope: 'all' | 'space') => void
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
  const currentValue = scope === 'all' ? 'all' : spaceId || 'all'

  const handleChange = (value: string) => {
    if (value === 'all') {
      onScopeChange('all')
      onSpaceChange(null)
    } else {
      onScopeChange('space')
      onSpaceChange(value)
    }
  }

  return (
    <div className="gba:px-4 gba:py-1.5" data-testid={testId}>
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger
          className="gba:h-7 gba:text-[11px] gba:border-0 gba:bg-transparent gba:px-0 gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
          data-testid={`${testId}-trigger`}
        >
          <SelectValue placeholder="Select scope" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid={`${testId}-all`}>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Globe className="gba:h-3 gba:w-3" />
              All my content
            </div>
          </SelectItem>
          {spaces.map(space => (
            <SelectItem key={space.id} value={space.id} data-testid={`${testId}-space-${space.id}`}>
              <div className="gba:flex gba:items-center gba:gap-2">
                <FolderOpen className="gba:h-3 gba:w-3" />
                {space.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
