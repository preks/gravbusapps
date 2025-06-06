import React from 'react';

/**
 * Props for the DataList component.
 * @template T - The type of items in the list.
 */
export interface DataListProps<T> {
  /**
   * The array of items to render in the list.
   */
  readonly items: readonly T[];
  /**
   * Function to render a list item. Receives the item, its index, and whether it is selected.
   */
  readonly renderItem: (item: T, index: number, selected: boolean) => React.ReactNode;
  /**
   * Optional function to extract a unique key for each item. Defaults to index if not provided.
   */
  readonly getKey?: (item: T, index: number) => React.Key;
  /**
   * The currently selected item, if any (for highlighting/select logic).
   */
  readonly selectedItem?: T;
  /**
   * Optional handler for item clicks. Receives the clicked item and its index.
   */
  readonly onItemClick?: (item: T, index: number) => void;
  /**
   * Additional className for the <ul> element.
   */
  readonly className?: string;
  /**
   * Additional props for the <ul> element.
   */
  readonly ulProps?: React.HTMLAttributes<HTMLUListElement>;
}

/**
 * DataList is a generic, reusable component for rendering lists with custom item rendering, selection, and click handling.
 *
 * @example
 * <DataList
 *   items={companies}
 *   selectedItem={selectedCompany}
 *   getKey={company => company.id}
 *   onItemClick={company => handleSelect(company)}
 *   renderItem={(company, idx, selected) => (
 *     <span className={selected ? 'font-bold' : ''}>{company.name}</span>
 *   )}
 * />
 */
export function DataList<T>({
  items,
  renderItem,
  getKey,
  selectedItem,
  onItemClick,
  className = '',
  ulProps = {},
}: DataListProps<T>) {
  return (
    <ul className={`w-full list-none p-0 m-0 border-t border-gray-200 ${className}`.trim()} {...ulProps}>
      {items.map((item, index) => {
        const selected = selectedItem === item;
        const key = getKey ? getKey(item, index) : index;
        
        // If item is clickable, wrap in a button for proper accessibility
        if (onItemClick) {
          return (
            <li key={key} className={`gba:border-b gba:border-gray-200 gba:transition-colors gba:duration-200 ${selected ? 'gba:bg-gray-100' : 'gba:hover:bg-gray-50'}`}>
              <button
                type="button"
                className="gba:w-full gba:text-left gba:bg-transparent gba:border-none gba:py-3 gba:px-4 gba:cursor-pointer gba:block gba:font-inherit gba:text-inherit"
                onClick={() => onItemClick(item, index)}
                aria-current={selected ? 'page' : undefined}
              >
                {renderItem(item, index, selected)}
              </button>
            </li>
          );
        }
        
        // Non-interactive item
        return (
          <li
            key={key}
            className={`gba:border-b gba:border-gray-200 gba:py-3 gba:px-4 gba:transition-colors gba:duration-200 ${selected ? 'gba:bg-gray-100' : 'gba:hover:bg-gray-50'}`}
            aria-current={selected ? 'page' : undefined}
          >
            {renderItem(item, index, selected)}
          </li>
        );
      })}
    </ul>
  );
}
