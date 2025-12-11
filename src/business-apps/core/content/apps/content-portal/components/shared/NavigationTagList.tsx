import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import NavigationTag from './NavigationTag'
import { MoreVertical } from 'lucide-react'

interface NavigationTagListProps {
  tags: Array<{ label: string; checked: boolean }>
  onTagClick: (label: string) => void
  maxVisibleTags?: number
  alwaysVisibleTag?: string
}

const NavigationTagList: React.FC<NavigationTagListProps> = ({
  tags,
  onTagClick,
  maxVisibleTags = 7,
  alwaysVisibleTag
}) => {
  // If alwaysVisibleTag is provided, make sure it's displayed first
  const alwaysVisibleTagObj = alwaysVisibleTag ? tags.find(tag => tag.label === alwaysVisibleTag) : null

  // Filter out the always visible tag from the main tags array
  const filteredTags = alwaysVisibleTag ? tags.filter(tag => tag.label !== alwaysVisibleTag) : tags

  // Divide tags into visible and overflow groups
  const visibleTags = filteredTags.slice(0, maxVisibleTags)
  const overflowTags = filteredTags.slice(maxVisibleTags)
  const hasOverflow = overflowTags.length > 0

  return (
    <div
      className="gba:flex gba:items-center gba:overflow-x-auto gba:w-full gba:relative"
      data-testid="content-navigation-tag-list"
    >
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:pr-10">
        {/* Always show the alwaysVisibleTag first if provided */}
        {alwaysVisibleTagObj && (
          <NavigationTag
            key={alwaysVisibleTagObj.label}
            label={alwaysVisibleTagObj.label}
            selected={alwaysVisibleTagObj.checked}
            onClick={() => onTagClick(alwaysVisibleTagObj.label)}
          />
        )}

        {/* Display visible tags */}
        {visibleTags.map(tag => (
          <NavigationTag
            key={tag.label}
            label={tag.label}
            selected={tag.checked}
            onClick={() => onTagClick(tag.label)}
          />
        ))}
      </div>

      {/* Display ellipsis dropdown for overflow tags */}
      {hasOverflow && (
        <Popover>
          <PopoverTrigger asChild>
            <div
              className="gba:flex gba:items-center gba:justify-center gba:cursor-pointer gba:rounded-full gba:hover:bg-accent gba:transition-all gba:duration-200 gba:absolute gba:right-0 gba:top-1/2 gba:-translate-y-1/2 gba:p-2"
              data-testid="content-nav-tag-more"
            >
              <MoreVertical className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="gba:p-2 gba:max-h-[300px] gba:overflow-y-auto">
            <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-[200px]">
              {overflowTags.map(tag => (
                <NavigationTag
                  key={tag.label}
                  label={tag.label}
                  selected={tag.checked}
                  onClick={() => onTagClick(tag.label)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

export default NavigationTagList
