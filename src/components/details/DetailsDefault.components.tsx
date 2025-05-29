import React, { ReactNode } from 'react';
import { Button } from '@newwork/gravity-ui-catalog';
//import { useTranslation } from 'react-i18next';

/**
 * Props for the DetailsDefault component
 */
export interface DetailsDefaultProps {
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
 * <DetailsDefault 
 *   title="Employee Details"
 *   icon={<EmployeeIcon />}
 *   onClose={handleClose}
 *   footer={
 *     <div className="flex justify-end gap-2">
 *       <Button variant="secondary">Cancel</Button>
 *       <Button variant="primary">Save</Button>
 *     </div>
 *   }
 * >
 *   <div>Content goes here</div>
 * </DetailsDefault>
 */
export const DetailsDefault: React.FC<DetailsDefaultProps> = ({
  title,
  icon,
  children,
  footer,
  onClose,
  className = '',
}) => {
  //const { t } = useTranslation();

  return (
    <div className={`flex flex-col h-full bg-white ${className}`.trim()}>
      {/* Header with title and close button */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
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
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>

      {/* Optional footer with action buttons */}
      {footer && (
        <div className="p-4 border-t border-gray-200 bg-white">
          {footer}
        </div>
      )}
    </div>
  );
};
