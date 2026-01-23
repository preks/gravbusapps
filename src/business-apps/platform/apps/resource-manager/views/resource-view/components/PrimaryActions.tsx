import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Plus } from '@phosphor-icons/react'
import { RefreshCw, Save, X } from 'lucide-react'

interface NavigationItemsActionsProps {
  addNavigation: (() => void) | null
  navigationRefetch: (() => void) | null
  urlResourcesLoading: boolean
  dataTestId: string
}

export const NavigationItemsActions: React.FC<NavigationItemsActionsProps> = ({
  addNavigation,
  navigationRefetch,
  urlResourcesLoading,
  dataTestId
}) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Button
      variant="default"
      size="sm"
      onClick={() => addNavigation?.()}
      disabled={urlResourcesLoading}
      data-testid={`${dataTestId}-create-navigation-button`}
    >
      <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
      Create
    </Button>
    <Button variant="outline" size="sm" onClick={() => navigationRefetch?.()} disabled={urlResourcesLoading}>
      <RefreshCw className={`gba:h-4 gba:w-4 ${urlResourcesLoading ? 'gba:animate-spin' : ''}`} />
    </Button>
  </div>
)

interface MenuActionsProps {
  menuDiscardAll: (() => void) | null
  menuSaveAll: (() => Promise<void>) | null
  menuHasChanges: boolean
  menuIsSaving: boolean
  dataTestId: string
}

export const MenuActions: React.FC<MenuActionsProps> = ({
  menuDiscardAll,
  menuSaveAll,
  menuHasChanges,
  menuIsSaving,
  dataTestId
}) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => menuDiscardAll?.()}
      disabled={!menuHasChanges || menuIsSaving}
      data-testid={`${dataTestId}-discard-all-button`}
    >
      <X className="gba:h-4 gba:w-4 gba:mr-1" />
      Discard All
    </Button>
    <Button
      variant="default"
      size="sm"
      onClick={() => menuSaveAll?.()}
      disabled={!menuHasChanges || menuIsSaving}
      data-testid={`${dataTestId}-save-all-button`}
    >
      <Save className="gba:h-4 gba:w-4 gba:mr-1" />
      {menuIsSaving ? 'Saving...' : 'Save All'}
    </Button>
  </div>
)

interface ActionItemsActionsProps {
  addAction: (() => void) | null
  actionRefetch: (() => void) | null
  actionLoading: boolean
  dataTestId: string
}

export const ActionItemsActions: React.FC<ActionItemsActionsProps> = ({
  addAction,
  actionRefetch,
  actionLoading,
  dataTestId
}) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Button
      variant="default"
      size="sm"
      onClick={() => addAction?.()}
      disabled={actionLoading}
      data-testid={`${dataTestId}-create-action-button`}
    >
      <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
      Create
    </Button>
    <Button variant="outline" size="sm" onClick={() => actionRefetch?.()} disabled={actionLoading}>
      <RefreshCw className={`gba:h-4 gba:w-4 ${actionLoading ? 'gba:animate-spin' : ''}`} />
    </Button>
  </div>
)

interface ContextActionsProps {
  addContext: (() => void) | null
  contextRefetch: (() => void) | null
  contextLoading: boolean
  dataTestId: string
}

export const ContextActions: React.FC<ContextActionsProps> = ({
  addContext,
  contextRefetch,
  contextLoading,
  dataTestId
}) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Button
      variant="default"
      size="sm"
      onClick={() => addContext?.()}
      disabled={contextLoading}
      data-testid={`${dataTestId}-create-context-button`}
    >
      <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
      Create
    </Button>
    <Button variant="outline" size="sm" onClick={() => contextRefetch?.()} disabled={contextLoading}>
      <RefreshCw className={`gba:h-4 gba:w-4 ${contextLoading ? 'gba:animate-spin' : ''}`} />
    </Button>
  </div>
)
