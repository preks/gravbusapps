import React from 'react'
import { AppAction } from '@/components/app-action/AppAction'
import { toAppActionProps } from '../adapters'
import type { SearchActionMenu, SearchTarget } from '../types'

export interface GlobalSearchActionSlotProps {
  actionMenu?: SearchActionMenu
  accessToken?: string
  onCommandTarget: (target: SearchTarget) => void
  onActionExecute: () => void
}

export const GlobalSearchActionSlot: React.FC<GlobalSearchActionSlotProps> = ({
  actionMenu,
  accessToken,
  onCommandTarget,
  onActionExecute
}) => {
  const appActionProps = toAppActionProps(actionMenu, onCommandTarget)

  if (!appActionProps) {
    return null
  }

  return (
    <AppAction
      {...appActionProps}
      accessToken={accessToken}
      variant={appActionProps.variant ?? 'list-item'}
      buttonSize="iconSm"
      buttonVariant="ghost"
      onActionExecute={onActionExecute}
      data-testid="GlobalSearchActionSlot"
    />
  )
}
