import type { ActionOption } from '@newwork/nw-design-system'
import type { AppActionProps } from '@/components/app-action/AppAction'
import type { SearchActionMenu, SearchActionVariant, SearchCustomAction, SearchTarget } from '../types'

const actionVariantMap: Record<SearchActionVariant, NonNullable<AppActionProps['variant']>> = {
  LIST_ITEM: 'list-item',
  TABLE_ROW: 'table-row',
  CUSTOM: 'custom'
}

const toActionOption = (action: SearchCustomAction, onCommand: (target: SearchTarget) => void): ActionOption => ({
  key: action.id,
  label: action.label,
  onClick: () => onCommand(action.target)
})

export const toAppActionProps = (
  actionMenu: SearchActionMenu | undefined,
  onCommandTarget: (target: SearchTarget) => void
): AppActionProps | null => {
  if (!actionMenu) {
    return null
  }

  const customActions = actionMenu.customActions?.map(action => toActionOption(action, onCommandTarget))

  return {
    variant: actionMenu.variant ? actionVariantMap[actionMenu.variant] : 'custom',
    mode: 'button',
    contexts: actionMenu.contexts,
    customActions,
    lazyLoad: actionMenu.lazyLoad,
    autoExecute: actionMenu.autoExecute,
    emptyState: 'enable'
  }
}
