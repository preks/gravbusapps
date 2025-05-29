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
            <li key={key} className={`border-b border-gray-200 transition-colors duration-200 ${selected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
              <button
                type="button"
                className="w-full text-left bg-transparent border-none py-3 px-4 cursor-pointer block font-inherit text-inherit"
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
            className={`border-b border-gray-200 py-3 px-4 transition-colors duration-200 ${selected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            aria-current={selected ? 'page' : undefined}
          >
            {renderItem(item, index, selected)}
          </li>
        );
      })}
    </ul>
  );
}
