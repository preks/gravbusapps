import React from 'react';
import { PiFunnelSimple, PiMagnifyingGlass, PiXCircle, PiX } from 'react-icons/pi';

/**
 * PlusSquareIcon - SVG icon for the Add button.
 */
export const PlusSquareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
    <path d="M14.25 0.5H1.75C1.41848 0.5 1.10054 0.631696 0.866116 0.866116C0.631696 1.10054 0.5 1.41848 0.5 1.75V14.25C0.5 14.5815 0.631696 14.8995 0.866116 15.1339C1.10054 15.3683 1.41848 15.5 1.75 15.5H14.25C14.5815 15.5 14.8995 15.3683 15.1339 15.1339C15.3683 14.8995 15.5 14.5815 15.5 14.25V1.75C15.5 1.41848 15.3683 1.10054 15.1339 0.866116C14.8995 0.631696 14.5815 0.5 14.25 0.5ZM14.25 14.25H1.75V1.75H14.25V14.25ZM11.75 8C11.75 8.16576 11.6842 8.32473 11.5669 8.44194C11.4497 8.55915 11.2908 8.625 11.125 8.625H8.625V11.125C8.625 11.2908 8.55915 11.4497 8.44194 11.5669C8.32473 11.6842 8.16576 11.75 8 11.75C7.83424 11.75 7.67527 11.6842 7.55806 11.5669C7.44085 11.4497 7.375 11.2908 7.375 11.125V8.625H4.875C4.70924 8.625 4.55027 8.55915 4.43306 8.44194C4.31585 8.32473 4.25 8.16576 4.25 8C4.25 7.83424 4.31585 7.67527 4.43306 7.55806C4.55027 7.44085 4.70924 7.375 4.875 7.375H7.375V4.875C7.375 4.70924 7.44085 4.55027 7.55806 4.43306C7.67527 4.31585 7.83424 4.25 8 4.25C8.16576 4.25 8.32473 4.31585 8.44194 4.43306C8.55915 4.55027 8.625 4.70924 8.625 4.875V7.375H11.125C11.2908 7.375 11.4497 7.44085 11.5669 7.55806C11.6842 7.67527 11.75 7.83424 11.75 8Z" fill="black" />
  </svg>
);

/**
 * Generic DataController for DataContainer listHeader.
 * Contains a filter toggle button and a search button/field.
 *
 * @param showDataFilter - Whether the filter sidebar is open
 * @param onToggleDataFilter - Callback to toggle the filter sidebar
 * @param search - Current search value
 * @param setSearch - Callback to update search value
 * @param placeholder - Placeholder for the search input
 * @param className - Optional additional class names
 */
/**
 * Props for DataController component.
 * @param listTitle - Optional title to display next to the search bar
 * @param listIcon - Optional icon to display in front of amount
 * @param listAmount - Optional amount to display after the title
 * @param actions - Optional actions to display right-aligned. This can be a single ReactNode or an array of ReactNodes (e.g., multiple action buttons such as Export, Archive, etc.).
 * @param addButton - Optional Add button. If provided, will be rendered in the actions-frame with dedicated design.
 */
export interface DataControllerProps {
  showDataFilter: boolean;
  onToggleDataFilter: () => void;
  search: string;
  setSearch: (v: string) => void;
  filter: string[];
  setFilter: (v: string[]) => void;
  filterLabelMap?: Record<string, string>; // Maps filter values (IDs) to display labels
  placeholder?: string;
  className?: string;
  listTitle?: React.ReactNode;
  listIcon?: React.ReactNode;
  listAmount?: React.ReactNode;
  /**
   * If true, the filter button will be hidden
   */
  hideFilter?: boolean;
  /**
   * Optional actions to display on the right side of the bar. Can be a single ReactNode or an array of ReactNodes (e.g., multiple action buttons such as Add, Export, Archive).
   */
  actions?: React.ReactNode | React.ReactNode[];
  /**
   * Optional Add button. If provided, will be rendered in the actions-frame with dedicated design.
   */
  addButton?: {
    onClick: () => void;
    label: string;
    icon?: React.ReactNode;
    'data-testid'?: string;
  };
}

/**
 * Render the add button with icon (default: PlusSquareIcon)
 */
const renderAddButton = (addButton: DataControllerProps['addButton']) => {
  if (!addButton) return null;
  const { onClick, label, icon, 'data-testid': dataTestId } = addButton;
  return (
    <button
      type="button"
      className="px-2 py-0 pl-2 pr-3 gap-1 w-[76px] h-8 rounded bg-black/[0.04] flex flex-row justify-center items-center"
      onClick={onClick}
      data-testid={dataTestId}
    >
      {icon ?? <PlusSquareIcon />}
      <span className="font-normal text-sm leading-4 text-black flex items-center w-[25px] h-4">{label}</span>
    </button>
  );
};

export const DataController: React.FC<Readonly<DataControllerProps>> = ({
  showDataFilter,
  onToggleDataFilter,
  search,
  setSearch,
  filter = [],
  setFilter,
  filterLabelMap,
  placeholder = 'Search...',
  className = '',
  listTitle,
  listIcon,
  listAmount,
  actions,
  addButton,
  hideFilter = false,
}) => {
  const [showSearchInput, setShowSearchInput] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showSearchInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearchInput]);

  return (
    <div className="w-full bg-white pt-6 px-6">

        <div className="flex flex-row items-center w-full gap-2">
          {/* Left: Filter and Search */}
          <div className="flex flex-row items-center gap-2 pb-5 flex-shrink-0">
            {!hideFilter && (
              <button
                className={`flex flex-row justify-center items-center p-0 w-8 h-8 rounded flex-none order-0 flex-grow-0 ${showDataFilter ? 'bg-black text-white' : 'bg-black/[0.04] text-black'}`}
                aria-label={showDataFilter ? 'Close filter sidebar' : 'Open filter sidebar'}
                onClick={onToggleDataFilter}
                type="button"
              >
                <div className="w-5 h-5 flex-none order-0 flex-grow-0">
                  {showDataFilter ? (
                    <PiFunnelSimple fill="#fff" size={20} />
                  ) : (
                    <PiFunnelSimple size={20} />
                  )}
                </div>
              </button>
            )}
            {!showSearchInput ? (
              <button
                className="flex flex-row justify-center items-center p-0 w-8 h-8 rounded bg-black/[0.04] flex-none order-0 flex-grow-0"
                aria-label="Open search"
                onClick={() => setShowSearchInput(true)}
                type="button"
              >
                <div className="w-5 h-5 flex-none order-0 flex-grow-0">
                  <PiMagnifyingGlass size={20} />
                </div>
              </button>
            ) : (
              <div className="flex items-center bg-black/[0.04] rounded px-2 h-8 w-[240px]">
                <span className="text-gray-500 mr-2">
                  <PiMagnifyingGlass size={20} />
                </span>
                <input
                  ref={inputRef}
                  className="bg-transparent border-none outline-none w-full text-sm"
                  type="text"
                  placeholder={placeholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onBlur={e => {
                    if (!e.target.value) setShowSearchInput(false);
                  }}
                />
              </div>
            )}
          {/* Center: List Title */}
          {listTitle && (
            <div className="flex-1 ml-4 font-semibold text-base text-black truncate">{listTitle}</div>
          )}
          {/* Optional: Icon and Amount */}
          {(listIcon || listAmount) && (
            <div className="flex flex-row items-center gap-2 ml-2">
              {listIcon && <span>{listIcon}</span>}
              {listAmount && <span className="font-semibold text-base text-gray-700">{listAmount}</span>}
            </div>
          )}
          </div>

          {/* Right: Actions */}
          {(addButton || actions) && (
            // All actions including Add are right-aligned (ml-auto)
            <div className="flex flex-row items-center gap-2 pb-5 w-full justify-end">
              {/* Add Button: match design, no frame, no background, icon left, label right */}
              {addButton && (
                <button
                  className="flex flex-row justify-center items-center px-3 py-0 h-8 rounded gap-1"
                  onClick={addButton.onClick}
                  data-testid={addButton['data-testid']}
                  type="button"
                >
                  <span className="w-5 h-5 flex items-center justify-center flex-none order-0 flex-grow-0">
                    {addButton.icon ?? <PlusSquareIcon />}
                  </span>
                  <span className="w-[25px] h-4 font-normal text-sm leading-4 flex items-center text-black flex-none order-1 flex-grow-0">{addButton.label}</span>
                </button>
              )}
              {actions && (Array.isArray(actions)
                ? actions.map((action, idx) => {
                  // Try to use a stable key if possible
                  let key = idx;
                  if (React.isValidElement(action) && action.props?.['data-testid']) {
                    key = action.props['data-testid'];
                  }
                  return (
                    <div
                      key={key}
                      className="flex flex-row justify-center items-center px-3 h-8 rounded bg-black/[0.04] gap-1"
                    >
                      {action}
                    </div>
                  );
                })
                : (
                  <div
                    className="flex flex-row justify-center items-center px-3 h-8 rounded bg-black/[0.04] gap-1"
                  >
                    {actions}
                  </div>
                ))}
            </div>
          )}
        </div>
        {/* Filter pills row: always below the bar group, left-aligned */}
        {filter && filter.length > 0 && setFilter && (
          <div className="flex items-center gap-2 self-start mb-5">
            {filter.map(val => (
              <div key={val} className="flex h-6 py-1 px-3 items-center gap-3 rounded-full bg-gray-100">
                <span>{filterLabelMap?.[val] ?? val}</span>
                <button
                  className="ml-0.5 bg-transparent border-none text-gray-800 w-3 h-3 flex items-center justify-center p-0 cursor-pointer rounded-full hover:bg-gray-200 transition-colors"
                  onClick={() => setFilter(filter.filter(f => f !== val))}
                  aria-label={`Remove filter ${filterLabelMap?.[val] ?? val}`}
                  tabIndex={0}
                  type="button"
                >
                  <PiX size={12} />
                </button>
              </div>
            ))}
            <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors" onClick={() => setFilter([])} type="button">
              <span>Clear all filters</span>
              <span className="flex items-center justify-center">
                <PiXCircle size={16} />
              </span>
            </button>
          </div>
        )}
      </div>
  );
};
