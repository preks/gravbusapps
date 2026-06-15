import { AppAction } from '@/components/app-action'
import type { ExpenseOwnerActionItem } from '../../utils/expenseRequestOwnerActions'

export type ExpenseOwnerActionMenuPlacement = 'details-sidebar' | 'record-header'

export interface ExpenseOwnerActionMenuProps {
  actions: ExpenseOwnerActionItem[]
  accessToken: string | undefined
  placement: ExpenseOwnerActionMenuPlacement
  testIdPrefix: string
}

export function ExpenseOwnerActionMenu({
  actions,
  accessToken,
  placement,
  testIdPrefix
}: Readonly<ExpenseOwnerActionMenuProps>) {
  if (actions.length === 0) {
    return null
  }

  const variant = placement === 'record-header' ? 'list-item' : 'table-row'

  const menu = (
    <AppAction
      variant={variant}
      customActions={actions}
      prefixDataTestId={testIdPrefix}
      accessToken={accessToken}
      emptyState="disable"
      lazyLoad
      data-testid={`${testIdPrefix}-button`}
    />
  )

  if (placement === 'record-header') {
    return menu
  }

  return <div className="gba:flex gba:justify-end">{menu}</div>
}
