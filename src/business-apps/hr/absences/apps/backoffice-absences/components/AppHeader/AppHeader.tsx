import { Button } from '@newwork/nw-design-system'
import { RiMenuLine, RiSearchLine } from '@remixicon/react'

export const AppHeader = () => {
  return (
    <header 
      className="gba:sticky gba:top-0 gba:z-50 gba:flex gba:items-center gba:justify-between gba:p-3 gba:border-b gba:border-gray-200 gba:bg-white"
      data-testid="app-header"
    >
      <div className="gba:flex gba:items-center gba:gap-3" data-testid="app-header-left">
        <RiMenuLine className="gba:text-xl" />
        <h4 className="gba:text-lg gba:font-medium gba:m-0" data-testid="app-header-title">
          Absence Hub
        </h4>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="gba:gap-2" 
        data-testid="app-header-actions-button"
      >
        <RiSearchLine className="gba:text-base" />
        ACTIONS
      </Button>
    </header>
  )
}
