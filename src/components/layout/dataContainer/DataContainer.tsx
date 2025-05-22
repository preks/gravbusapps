import React from 'react';
import { DataController, DataControllerProps } from '@/components/dataController';
import { DataFilter, DataFilterProps } from '@/components/data-filter';
import { DetailsDefault } from '@/components/details';
import { cn } from '@/utils/cn';

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
 * @param dataControllerProps - Props for the DataController (search, filter toggle, etc.)
 * @param filterDefaultProps - Props for the DataFilter (content, onClose, etc.)
 * @param dataBody - The main content of the container (rows/items)
 * @param dataDetails - Optional details panel shown on the right side
 * @param className - Optional additional class names
 */
export interface DataContainerProps {
  dataControllerProps: Omit<DataControllerProps, 'showDataFilter' | 'onToggleDataFilter'>;
  dataFilterProps: Omit<DataFilterProps, 'show' | 'onClose'>;
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
  };
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
}

export const DataContainer: React.FC<Readonly<DataContainerProps>> = ({
  dataControllerProps,
  dataFilterProps,
  dataBody,
  dataDetails,
  className = '',
  hideFilter = false,
  contentBackground = 'gray',
  floatingDetails = false,
}) => {
  // Sidebar open/close state
  const [showDataFilter, setShowDataFilter] = React.useState(false);

  const handleToggleDataFilter = React.useCallback(() => {
    setShowDataFilter((prev) => !prev);
  }, []);

  const handleCloseDataFilter = React.useCallback(() => {
    setShowDataFilter(false);
  }, []);

  return (
    <div className={cn(
      'flex flex-row h-full w-full bg-gray-100',
      className
    )}>
      {/* Filter Sidebar - left column, visible if open */}
      {showDataFilter && (
        <div className="flex flex-col w-[336px] min-h-0 border-r border-gray-100 bg-white z-0">
          <DataFilter
            show={showDataFilter}
            onClose={handleCloseDataFilter}
            {...dataFilterProps}
          />
        </div>
      )}
      {/* Main Content - center column */}
      <div className="flex flex-col flex-1 min-h-0 bg-white">
          <DataController
            showDataFilter={showDataFilter}
            onToggleDataFilter={handleToggleDataFilter}
            hideFilter={hideFilter}
            {...dataControllerProps}
          />
        <div className={cn("flex-1 min-h-0 overflow-auto p-4", {
          'bg-gray-50': contentBackground === 'gray',
          'bg-white': contentBackground === 'white'
        })}>
          {dataBody}
        </div>
      </div>
      {/* Details Sidebar - right column or floating, only if present */}
      {dataDetails && (
        <div className={cn(
          "flex flex-col w-[336px] min-h-0 border-l border-gray-100 bg-white",
          {
            "z-0": !floatingDetails,
            "z-10 absolute right-0 top-0 bottom-0 shadow-lg": floatingDetails
          }
        )}>
          <DetailsDefault
            title={dataDetails.title}
            icon={dataDetails.icon}
            onClose={handleCloseDataFilter} /* Reusing the filter close handler for now */
            footer={dataDetails.footer}
          >
            {dataDetails.content}
          </DetailsDefault>
        </div>
      )}
    </div>
  );
};


