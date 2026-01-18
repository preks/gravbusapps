import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel as t } from '@/common/utils/windowUtils'
import { LightningIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface FlowActionItem {
  nameKey: string
  nameFallback: string
  iconRelative?: string
  disabled?: boolean
  hidden?: boolean
  link?: string
  modalKey?: string
}

interface FlowActionsButtonProps {
  actions: FlowActionItem[]
  onAction?: (action: FlowActionItem) => void
  dataTestId?: string
}

const FlowActionsButton: React.FC<FlowActionsButtonProps> = ({ actions, onAction, dataTestId }) => {
  const visibleActions = React.useMemo(() => actions.filter(a => !a.hidden), [actions])

  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="gba:shadow-none gba:flex gba:items-center gba:justify-center gba:gap-2 gba:pl-3 gba:pr-3 gba:h-8 gba:w-[100px] gba:rounded-full gba:shadow-none gba:mb-5"
          style={{ border: '2px solid border' }}
          data-testid={dataTestId ? `${dataTestId}-flows-button` : 'flows-button'}
          onMouseEnter={() => setOpen(true)}
        >
          {/* <img
            src={`${baseUrl}/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg`}
            alt="flows"
            className="gba:w-4 gba:h-4"
          /> */}
          <LightningIcon color={open ? '#6c7fee' : 'foreground'} weight={open ? 'fill' : 'regular'}></LightningIcon>
          <span className="gba:font-bold gba:text-xs">
            {t('lowcoder:employee_list.flows_button.actions', 'Actions')}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="gba:w-72"
        data-testid={dataTestId ? `${dataTestId}-flows-dropdown` : 'flows-dropdown'}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="gba:py-1">
          {visibleActions.map((action, idx) => {
            const label = t(action.nameKey, action.nameFallback)
            return (
              <DropdownMenuItem
                key={`${label}-${idx}`}
                className={`gba:flex gba:items-center gba:gap-2 ${
                  action.disabled
                    ? 'gba:cursor-default gba:hover:bg-background gba:focus:bg-background gba:data-[highlighted]:bg-background gba:text-black'
                    : 'gba:cursor-pointer'
                }`}
                tabIndex={action.disabled ? -1 : 0}
                style={action.disabled ? { backgroundColor: '#FFFFFF' } : undefined}
                // Use onSelect to prevent closing/triggering when "disabled" semantics apply
                onSelect={e => {
                  if (action.disabled) {
                    e.preventDefault()
                    return
                  }
                  setOpen(false)
                  if (action.link) {
                    const link = action.link
                    if (link.startsWith('/platform/')) {
                      navigateTo(link)
                      return
                    }
                    navigateTo(buildPlatformUrl(link))
                    return
                  }
                  setTimeout(() => {
                    onAction?.(action)
                  }, 0)
                }}
              >
                {/* {iconUrl ? <img src={iconUrl} alt="icon" className="gba:w-4 gba:h-4" /> : <span className="gba:w-4" />} */}
                <span className={action.disabled ? 'gba:font-bold gba:text-black' : ''}>{label}</span>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default FlowActionsButton
