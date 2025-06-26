import React, { ReactNode } from 'react';
import { Drawer } from 'antd';

/**
 * Props for the DataDetailsDrawer component
 */
export interface DataDetailsDrawerProps {
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
   * Whether the drawer is visible or not
   */
  open: boolean;

  /**
   * Callback when the drawer is closed
   */
  onClose: () => void;

  /**
   * Optional width of the drawer
   */
  width?: number | string;

  /**
   * Optional placement of the drawer
   */
  placement?: 'left' | 'right' | 'top' | 'bottom';

  /**
   * Data test id for testing
   */
  dataTestId?: string;

  /**
   * Additional class name for the component
   */
  className?: string;
}

/**
 * A drawer component with a header, scrollable content area, and optional footer.
 * Uses Ant Design Drawer with the UI template from DataDetails.
 * 
 * @example
 * <DataDetailsDrawer 
 *   title="Employee Details"
 *   icon={<EmployeeIcon />}
 *   open={isDrawerOpen}
 *   onClose={handleClose}
 *   width={500}
 *   placement="right"
 *   footer={
 *     <div className="gba:flex gba:justify-end gba:gap-2">
 *       <Button type="default">Cancel</Button>
 *       <Button type="primary">Save</Button>
 *     </div>
 *   }
 * >
 *   <div>Content goes here</div>
 * </DataDetailsDrawer>
 */
export const DataDetailsDrawer: React.FC<DataDetailsDrawerProps> = ({
  title,
  icon,
  children,
  footer,
  open,
  onClose,
  width = 500,
  placement = 'right',
  dataTestId,
  className = '',
}) => {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={width}
      placement={placement}
      closable={false}
      destroyOnClose
      className={`data-details-drawer ${className}`.trim()}
      data-testid={dataTestId}
      title={null} // We'll provide our own title in the content
      footer={footer && (
        <div className="gba:p-4 gba:border-t gba:border-gray-200 gba:bg-white">
          {footer}
        </div>
      )}
      styles={{
        body: {
          padding: 0, // Remove default padding to use our own layout
        },
        footer: {
          padding: 0, // Remove default padding to use our own layout
        }
      }}
    >
      <div className="gba:flex gba:flex-col gba:h-full gba:bg-white">
        {/* Header with title and close button */}
        <div className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:border-b gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:gap-2">
            {icon && <div className="gba:shrink-0">{icon}</div>}
            <h2 className="gba:text-lg gba:font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="gba:p-2 gba:rounded-full gba:hover:bg-gray-100 gba:transition-colors"
            aria-label="Close"
            data-testid={dataTestId ? `${dataTestId}-close-button` : undefined}
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
      </div>
    </Drawer>
  );
};
