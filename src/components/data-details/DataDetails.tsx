import React, { ReactNode } from 'react'
import { Button } from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
//import { useTranslation } from 'react-i18next';

/**
 * Props for the DataDetails component
 */
export interface DataDetailsProps {
  /**
   * Title to display in the header
   */
  title: string

  /**
   * Optional icon to display before the title
   */
  icon?: ReactNode

  /**
   * Content to display in the scrollable area
   */
  children: ReactNode

  /**
   * Optional footer with action buttons
   */
  footer?: ReactNode

  /**
   * Callback when the close button is clicked
   */
  onClose: () => void

  /**
   * Additional class name for the component
   */
  className?: string
}

/**
 * A generic details component with a header, scrollable content area, and optional footer.
 *
 * @example
 * <DataDetails
 *   title="Employee Details"
 *   icon={<EmployeeIcon />}
 *   onClose={handleClose}
 *   footer={
 *     <div className="gba:flex gba:justify-end gba:gap-2">
 *       <Button variant="secondary">Cancel</Button>
 *       <Button variant="primary">Save</Button>
 *     </div>
 *   }
 * >
 *   <div>Content goes here</div>
 * </DataDetails>
 */
export const DataDetails: React.FC<DataDetailsProps> = ({ title, icon, children, footer, onClose, className = '' }) => {
  //const { t } = useTranslation();

  return (
    <div
      className={`gba:flex gba:flex-col gba:h-full gba:bg-white ${className}`.trim()}
      data-testid="data-details-container"
    >
      {/* Header with title and close button */}
      <div
        className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:border-b gba:border-gray-200"
        data-testid="data-details-header"
      >
        <div className="gba:flex gba:items-center gba:gap-2" data-testid="data-details-title-section">
          {icon && (
            <div className="gba:shrink-0" data-testid="data-details-icon">
              {icon}
            </div>
          )}
          <h2 className="gba:text-lg gba:font-bold" data-testid="data-details-title">
            {title}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gba:p-2 gba:rounded-full gba:hover:bg-gray-100"
          aria-label="Close"
          data-testid="data-details-close-button"
        >
          <XIcon className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      {/* Scrollable content area */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-4" data-testid="data-details-content">
        {children}
      </div>

      {/* Optional footer with action buttons */}
      {footer && (
        <div className="gba:p-4 gba:border-t gba:border-gray-200 gba:bg-white" data-testid="data-details-footer">
          {footer}
        </div>
      )}
    </div>
  )
}
