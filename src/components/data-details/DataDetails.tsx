import React, { ReactNode } from 'react';
import { Button } from '@newwork/gravity-ui-catalog';
//import { useTranslation } from 'react-i18next';

/**
 * Props for the DataDetails component
 */
export interface DataDetailsProps {
  /**
   * Title to display in the header
   */
  title: string;

  /**
   * Optional icon to display before the title
   */
  icon?: ReactNode;

  /**
   * Content to display in the scrollable area
   */
  children: ReactNode;

  /**
   * Optional footer with action buttons
   */
  footer?: ReactNode;

  /**
   * Callback when the close button is clicked
   */
  onClose: () => void;

  /**
   * Additional class name for the component
   */
  className?: string;
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
export const DataDetails: React.FC<DataDetailsProps> = ({
  title,
  icon,
  children,
  footer,
  onClose,
  className = '',
}) => {
  //const { t } = useTranslation();

  return (
    <div className={`gba:flex gba:flex-col gba:h-full gba:bg-white ${className}`.trim()}>
      {/* Header with title and close button */}
      <div className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:border-b gba:border-gray-200">
        <div className="gba:flex gba:items-center gba:gap-2">
          {icon && <div className="gba:shrink-0">{icon}</div>}
          <h2 className="gba:text-lg gba:font-bold">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="gba:p-2 gba:rounded-full gba:hover:bg-gray-100 gba:transition-colors"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-4">
        {children}
      </div>

      {/* Optional footer with action buttons */}
      {footer && (
        <div className="gba:p-4 gba:border-t gba:border-gray-200 gba:bg-white">
          {footer}
        </div>
      )}
    </div>
  );
};
