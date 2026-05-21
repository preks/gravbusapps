import React from 'react'
import { ActionMenu, Button, Icon } from '@newwork/nw-design-system'
import type { ActionOption } from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon } from '@phosphor-icons/react'

interface HubRowActionMenuProps {
  actions: ActionOption[]
  dataTestId: string
  ariaLabel: string
  disabled?: boolean
}

export const HubRowActionMenu: React.FC<HubRowActionMenuProps> = ({
  actions,
  dataTestId,
  ariaLabel,
  disabled = false
}) => (
  <ActionMenu actions={actions} emptyStateBehavior="enable">
    <Button
      variant="ghost"
      size="icon"
      aria-label={ariaLabel}
      data-testid={dataTestId}
      disabled={disabled}
      onClick={event => {
        event.stopPropagation()
        event.preventDefault()
      }}
    >
      <Icon icon={DotsThreeVerticalIcon} />
    </Button>
  </ActionMenu>
)
