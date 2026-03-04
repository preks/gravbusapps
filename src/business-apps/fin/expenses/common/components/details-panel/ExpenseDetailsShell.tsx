import React, { ReactNode } from 'react'
import { Button } from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
export interface ExpenseDetailsShellProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose?: () => void
  /**
   * By default we hide the internal close button because Sheets already provide one.
   */
  showCloseButton?: boolean
  /**
   * Adds extra left/right padding inside the scrollable content area,
   * without touching shared components outside expenses.
   */
  contentInnerClassName?: string
  className?: string
  dataTestIdPrefix?: string
}

export const ExpenseDetailsShell: React.FC<ExpenseDetailsShellProps> = ({
  title,
  icon,
  children,
  footer,
  onClose,
  showCloseButton = false,
  contentInnerClassName = 'gba:px-4',
  className = '',
  dataTestIdPrefix = 'expense-details-shell'
}) => {
  return (
    <div
      className={`gba:flex gba:flex-col gba:h-full gba:bg-white ${className}`.trim()}
      data-testid={`${dataTestIdPrefix}-container`}
    >
      <div
        className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:border-b gba:border-gray-200"
        data-testid={`${dataTestIdPrefix}-header`}
      >
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:min-w-0"
          data-testid={`${dataTestIdPrefix}-title-section`}
        >
          {icon ? (
            <div className="gba:shrink-0" data-testid={`${dataTestIdPrefix}-icon`}>
              {icon}
            </div>
          ) : null}
          <h2 className="gba:text-lg gba:font-bold gba:truncate" data-testid={`${dataTestIdPrefix}-title`}>
            {title}
          </h2>
        </div>
        {showCloseButton && onClose ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:p-2 gba:rounded-full gba:hover:bg-gray-100"
            aria-label="Close"
            data-testid={`${dataTestIdPrefix}-close-button`}
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </Button>
        ) : null}
      </div>

      <div className="gba:flex-1 gba:overflow-auto gba:p-4" data-testid={`${dataTestIdPrefix}-content`}>
        <div className={contentInnerClassName} data-testid={`${dataTestIdPrefix}-content-inner`}>
          {children}
        </div>
      </div>

      {footer ? (
        <div
          className="gba:p-4 gba:border-t gba:border-gray-200 gba:bg-white"
          data-testid={`${dataTestIdPrefix}-footer`}
        >
          <div className={contentInnerClassName}>{footer}</div>
        </div>
      ) : null}
    </div>
  )
}

export default ExpenseDetailsShell
