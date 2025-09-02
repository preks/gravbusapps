import React from 'react';
import { DataController, DataControllerProps } from '@/components/dataController';
import { DataFilter, DataFilterProps } from '@/components/data-filter';
import { DataDetails } from '@/components/data-details';
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

  const handleDetailsClose = React.useCallback(() => {
    if (dataDetails?.onClose) {
      dataDetails.onClose();
    }
    onDetailsPanelClose();
  }, [dataDetails, onDetailsPanelClose]);

  // Measure the main content (controller + body) to cap the filter height
  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const [mainContentHeight, setMainContentHeight] = React.useState<number>(0);
  React.useEffect(() => {
    const el = mainContentRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMainContentHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={cn("gba:flex gba:flex-row gba:h-full gba:w-full gba:relative gba:min-w-0", className)} data-testid="data-container">
      {/* Filter Sidebar - left column, visible if open; capped to main content height */}
      {showDataFilter && (
        <div
          className="gba:flex gba:flex-col gba:w-[336px] gba:border-r gba:border-gray-100 gba:bg-white gba:z-0"
          style={{ maxHeight: mainContentHeight ? `${mainContentHeight}px` : undefined, overflowY: 'auto' }}
          data-testid="data-container-filter-sidebar"
        >
          <DataFilter
            show={showDataFilter}
            onClose={handleCloseDataFilter}
            {...dataFilterProps}
          />
        </div>
      )}

      {/* Main + Details wrapper */}
      <div className="gba:flex gba:flex-row gba:flex-1 gba:min-w-0" ref={mainContentRef}>
        {/* Main Content - controller above body */}
        <div className={cn("gba:flex gba:flex-col gba:flex-1 gba:min-w-0", !showDataFilter && "gba:pl-6")} data-testid="data-container-main-content">
          {CustomDataController ? (
            <CustomDataController
              showDataFilter={showDataFilter}
              onToggleDataFilter={handleToggleDataFilter}
              hideFilter={hideFilter}
              {...(dataControllerProps as any)}
              data-testid="data-container-custom-controller"
            />
          ) : (
            <DataController
              showDataFilter={showDataFilter}
              onToggleDataFilter={handleToggleDataFilter}
              hideFilter={hideFilter}
              {...dataControllerProps}
            />
          )}
          <div className={cn("gba:min-h-[400px] gba:overflow-auto", { 'gba:bg-gray-50': contentBackground === 'gray', 'gba:bg-white': contentBackground === 'white' })} data-testid="data-container-body">
            {dataBody}
          </div>
        </div>

        {/* Details Sidebar - right column or floating, only if present */}
        {dataDetails && (
          <div 
            className={cn(
              !floatingDetails
                ? "gba:flex gba:flex-col gba:w-[336px] gba:h-full gba:border-l gba:border-gray-100 gba:bg-white gba:z-0"
                : "",
              floatingDetails
                ? "gba:fixed gba:top-12 gba:right-0 gba:bottom-0 gba:w-[400px] gba:bg-white gba:border-l gba:border-gray-200 gba:z-20 gba:flex gba:flex-col gba:!shadow-lg"
                : ""
            )}
            onClick={(e) => e.stopPropagation()}
            data-testid={floatingDetails ? "data-container-details-floating" : "data-container-details-sidebar"}
          >
            <DataDetails
              title={dataDetails.title}
              icon={dataDetails.icon}
              onClose={handleDetailsClose}
              footer={dataDetails.footer}
            >
              {dataDetails.content}
            </DataDetails>
          </div>
        )}
      </div>
    </div>
  );
};


