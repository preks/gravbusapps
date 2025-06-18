import React from 'react';
import { DataController, DataControllerProps } from '@/components/dataController';
import { DataFilter, DataFilterProps } from '@/components/data-filter';
import { DetailsDefault } from '@/components/details';
import { cn } from '../../../common/utils/cn';

/**
 * DataContainer is a layout component for displaying a filter and a list with header and body.
 * It is intended to be used as a variant of the contentContainer prop in PageLayout.
 *
 * @param filterDefault - The filter/search UI above the list
 * @param listHeader - The header row or title for the list
 * @param listBody - The main content of the list (rows/items)
 * @param className - Optional additional class names
 */


/**
 * DataContainer is a layout component for displaying a filter sidebar and data content with optional details.
 * It manages the open/close state of the sidebar and wires up the DataController and DataFilter.
 *
 * @template T The type of the DataController props
 * @param dataControllerProps - Props for the DataController (search, filter toggle, etc.)
 * @param dataControllerComponent - Optional custom DataController component
 * @param dataFilterProps - Props for the DataFilter (content, onClose, etc.)
 * @param dataBody - The main content of the container (rows/items)
 * @param dataDetails - Optional details panel shown on the right side
 * @param className - Optional additional class names
 */
export interface DataContainerProps<T extends DataControllerProps = DataControllerProps> {
  /**
   * Props for the DataController component
   */
  dataControllerProps: Omit<T, 'showDataFilter' | 'onToggleDataFilter'>;
  
  /**
   * Optional custom DataController component
   * If provided, this component will be used instead of the default DataController
   */
  dataControllerComponent?: React.ComponentType<T>;
  
  /**
   * Props for the DataFilter component
   */
  dataFilterProps: Omit<DataFilterProps, 'show' | 'onClose'>;
  
  /**
   * The main content of the container
   */
  dataBody?: React.ReactNode;
  
  /**
   * Details content to be displayed in the sidebar
   */
  dataDetails?: {
    /**
     * Title for the details sidebar
     */
    title: string;
    /**
     * Optional icon to display in the details header
     */
    icon?: React.ReactNode;
    /**
     * Content to display in the details sidebar
     */
    content: React.ReactNode;
    /**
     * Optional footer with action buttons
     */
    footer?: React.ReactNode;
    /**
     * Optional callback to be invoked when the details panel is closed
     */
    onClose?: () => void;
  };
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * If true, the filter button will be hidden
   */
  hideFilter?: boolean;
  
  /**
   * Background color for the content area
   */
  contentBackground?: 'white' | 'gray';
  
  /**
   * If true, the details panel will float over the content instead of taking up space in the layout
   */
  floatingDetails?: boolean;

  /**
   * Optional callback function to be invoked when the details panel's close button is clicked.
   */
  onDetailsPanelClose?: () => void;
}

export const DataContainer = <T extends DataControllerProps = DataControllerProps>({
  dataControllerProps,
  dataControllerComponent: CustomDataController,
  dataFilterProps,
  dataBody,
  dataDetails,
  className = '',
  hideFilter = false,
  contentBackground = 'gray',
  floatingDetails = false,
  onDetailsPanelClose = () => {},
}: DataContainerProps<T>): JSX.Element => {
  // Sidebar open/close state
  const [showDataFilter, setShowDataFilter] = React.useState(false);

  const handleToggleDataFilter = React.useCallback(() => {
    setShowDataFilter((prev) => !prev);
  }, []);

  const handleCloseDataFilter = React.useCallback(() => {
    setShowDataFilter(false);
  }, []);

  return (
    <div className={cn("gba:flex gba:flex-row gba:h-full gba:w-full gba:bg-gray-100", className
    )}>
      {/* Filter Sidebar - left column, visible if open */}
      {showDataFilter && (
        <div className="gba:flex gba:flex-col gba:w-[336px] gba:min-h-0 gba:border-r gba:border-gray-100 gba:bg-white gba:z-0">
          <DataFilter
            show={showDataFilter}
            onClose={handleCloseDataFilter}
            {...dataFilterProps}
          />
        </div>
      )}
      {/* Main Content - center column */}
      <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:bg-white">
          {CustomDataController ? (
            <CustomDataController
              showDataFilter={showDataFilter}
              onToggleDataFilter={handleToggleDataFilter}
              hideFilter={hideFilter}
              {...(dataControllerProps as any)}
            />
          ) : (
            <DataController
              showDataFilter={showDataFilter}
              onToggleDataFilter={handleToggleDataFilter}
              hideFilter={hideFilter}
              {...dataControllerProps}
            />
          )}
        <div className={cn("gba:flex-1 gba:min-h-0 gba:overflow-auto gba:p-4", {
          'gba:bg-gray-50': contentBackground === 'gray',
          'gba:bg-white': contentBackground === 'white'
        })}>
          {dataBody}
        </div>
      </div>
      {/* Details Sidebar - right column or floating, only if present */}
      {dataDetails && (
        <div className={cn("gba:flex gba:flex-col gba:w-[336px] gba:min-h-0 gba:border-l gba:border-gray-100 gba:bg-white", {
            "gba:z-0": !floatingDetails,
            "gba:z-10 gba:absolute gba:right-0 gba:top-0 gba:bottom-0 gba:shadow-lg": floatingDetails
          }
        )}>
          <DetailsDefault
            title={dataDetails.title}
            icon={dataDetails.icon}
            onClose={dataDetails.onClose || handleCloseDataFilter} /* Use specific onClose for details if provided, else fallback */
            footer={dataDetails.footer}
          >
            {dataDetails.content}
          </DetailsDefault>
        </div>
      )}
    </div>
  );
};


