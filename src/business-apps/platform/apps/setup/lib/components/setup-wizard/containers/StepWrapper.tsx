import React, { ReactNode } from 'react'
import { formatDataTestId } from '../../../shims/formatDataTestId'
import ArrowLeftLineIcon from 'remixicon-react/ArrowLeftLineIcon'

export interface StepWrapperProps {
  readonly children: ReactNode
  readonly title?: string
  readonly dataTestId: string
  readonly renderTitle?: boolean
  readonly onBack?: () => void
}

function StepWrapper({ children, title, dataTestId, renderTitle = true, onBack }: StepWrapperProps) {
  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:w-full gba:h-full"
      data-testid={formatDataTestId(dataTestId, 'container')}
    >
      <div className="gba:w-full gba:max-w-[500px] gba:bg-white gba:p-6" data-testid={formatDataTestId(dataTestId, 'content')}>
        {renderTitle && title && (
          <header className="gba:flex gba:items-baseline gba:mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="gba:flex gba:items-center gba:justify-center gba:mr-2 gba:p-0"
                type="button"
                data-testid={formatDataTestId(dataTestId, 'back-button')}
              >
                <ArrowLeftLineIcon className="gba:w-5 gba:h-5" />
              </button>
            )}
            <h1 className="gba:text-2xl gba:font-bold" data-testid={formatDataTestId(dataTestId, 'heading')}>
              {title}
            </h1>
          </header>
        )}
        {children}
      </div>
    </div>
  )
}

export default StepWrapper
