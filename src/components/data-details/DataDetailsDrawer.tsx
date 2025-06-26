import React, { ReactNode } from 'react';
import { Drawer, Button } from 'antd';

/**
 * Navigation link item props
 */
export interface NavigationLinkProps {
  /**
   * Label to display for the link
   */
  label: string;

  /**
   * URL to navigate to when clicked
   */
  url: string;

  /**
   * Optional icon to display before the label
   */
  icon?: ReactNode;

  /**
   * Optional description to display under the label
   */
  description?: string;

  /**
   * Optional color theme for the link (will be used for icon background and text)
   */
  color?: 'blue' | 'green' | 'orange' | 'cyan' | 'purple' | 'red' | 'gray';

  /**
   * Optional function to execute on click (instead of navigation)
   */
  onClick?: () => void;

  /**
   * Data test id for testing
   */
  dataTestId?: string;
}

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

  /**
   * Optional navigation links to display at the bottom of the content area
   */
  navigationLinks?: NavigationLinkProps[];
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
 *   navigationLinks={[
 *     { label: 'View Profile', url: '/profiles/123', dataTestId: 'view-profile-link' },
 *     { label: 'View Department', url: '/departments/456', dataTestId: 'view-department-link' }
 *   ]}
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
  navigationLinks,
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
        <div className="gba:flex-1 gba:overflow-auto gba:p-4 gba:flex gba:flex-col">
          <div className="gba:flex-1">
            {children}
          </div>
          
          {/* Navigation links section */}
          {navigationLinks && navigationLinks.length > 0 && (
            <div className="gba:mt-6">
              <div className="gba:mb-4">
                <div className="gba:flex gba:items-center gba:mb-2">
                  <div className="gba:flex-grow gba:border-b gba:border-gray-300" />
                  <h3 className="gba:text-base gba:font-medium gba:text-gray-700 gba:px-3 gba:flex gba:items-center gba:gap-2" 
                    data-testid={dataTestId ? `${dataTestId}-navigation-title` : 'drawer-navigation-title'}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span>Related Resources</span>
                  </h3>
                  <div className="gba:flex-grow gba:border-b gba:border-gray-300" />
                </div>
              </div>
              <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                {navigationLinks.map((link, index) => {
                  // Default to blue if no color specified
                  const colorTheme = link.color || 'blue';
                  
                  // Color mapping for different themes
                  const colorMap = {
                    blue: { bg: 'gba:bg-blue-100', text: 'gba:text-blue-600', hover: 'gba:hover:text-blue-800' },
                    green: { bg: 'gba:bg-green-100', text: 'gba:text-green-600', hover: 'gba:hover:text-green-800' },
                    orange: { bg: 'gba:bg-orange-100', text: 'gba:text-orange-600', hover: 'gba:hover:text-orange-800' },
                    cyan: { bg: 'gba:bg-cyan-100', text: 'gba:text-cyan-600', hover: 'gba:hover:text-cyan-800' },
                    purple: { bg: 'gba:bg-purple-100', text: 'gba:text-purple-600', hover: 'gba:hover:text-purple-800' },
                    red: { bg: 'gba:bg-red-100', text: 'gba:text-red-600', hover: 'gba:hover:text-red-800' },
                    gray: { bg: 'gba:bg-gray-100', text: 'gba:text-gray-600', hover: 'gba:hover:text-gray-800' }
                  };
                  
                  const colors = colorMap[colorTheme];
                  
                  return (
                    <div
                      key={`nav-link-${index}`}
                      className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow gba:rounded gba:border gba:border-gray-100"
                      data-testid={link.dataTestId || `${dataTestId}-nav-link-${index}`}
                    >
                      <a 
                        href={link.url}
                        className={`gba:flex gba:items-center gba:gap-3 ${colors.text} ${colors.hover} gba:p-3`}
                        onClick={(e) => {
                          if (link.onClick) {
                            e.preventDefault();
                            link.onClick();
                          }
                        }}
                        target={link.url.startsWith('/') || link.url === '#' ? '_self' : '_blank'}
                        rel={link.url.startsWith('/') || link.url === '#' ? undefined : 'noopener noreferrer'}
                      >
                        {link.icon && (
                          <div className={`gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full ${colors.bg}`}>
                            <span className={`gba:text-lg ${colors.text}`}>{link.icon}</span>
                          </div>
                        )}
                        <div className="gba:flex-grow">
                          <div className="gba:font-medium">{link.label}</div>
                          {link.description && (
                            <div className="gba:text-xs gba:text-gray-500">
                              {link.description}
                            </div>
                          )}
                        </div>
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="#9ca3af"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="gba:text-gray-400"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
