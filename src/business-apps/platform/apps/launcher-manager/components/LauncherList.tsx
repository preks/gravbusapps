import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { CatalogEntry } from '@/common/data/catalog'

interface LauncherListProps {
  launchers: CatalogEntry[]
  selectedLauncherId: string
  onSelect: (id: string) => void
  dataTestIdPrefix: string
}

export const LauncherList: React.FC<LauncherListProps> = ({
  launchers,
  selectedLauncherId,
  onSelect,
  dataTestIdPrefix
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${dataTestIdPrefix}-LauncherList`}>
      {launchers.map(l => {
        const isActive = l.id === selectedLauncherId
        return (
          <Button
            key={l.id}
            variant={isActive ? 'secondary' : 'outline'}
            className="gba:justify-start"
            onClick={() => onSelect(l.id)}
            data-testid={`${dataTestIdPrefix}-LauncherItem-${l.id}`}
          >
            {l.value}
          </Button>
        )
      })}
      {launchers.length === 0 && (
        <div className="gba:text-sm gba:text-gray-500" data-testid={`${dataTestIdPrefix}-LauncherEmpty`}>
          No launchers found
        </div>
      )}
    </div>
  )
}
