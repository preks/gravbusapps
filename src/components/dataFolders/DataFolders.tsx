import React, { useState, useCallback } from 'react';

/**
 * Props for the DataFolders component.
 * @template T - The type of items in the folders.
 * @template F - The type of folders.
 */
export interface DataFoldersProps<F, T> {
  /**
   * The array of folders to render.
   */
  readonly folders: readonly F[];
  
  /**
   * Function to get a unique key for each folder.
   */
  readonly getFolderKey: (folder: F) => React.Key;
  
  /**
   * Function to get the name of each folder.
   */
  readonly getFolderName: (folder: F) => string;
  
  /**
   * Function to get the items within a folder.
   */
  readonly getFolderItems: (folder: F) => readonly T[];
  
  /**
   * Function to render an item. Receives the item and its parent folder.
   */
  readonly renderItem: (item: T, folder: F) => React.ReactNode;
  
  /**
   * Function to get a unique key for each item.
   */
  readonly getItemKey: (item: T) => React.Key;
  
  /**
   * Optional array of initially open folder indices.
   */
  readonly initialOpenFolders?: number[];
  
  /**
   * Optional message to display when no folders are found.
   */
  readonly emptyMessage?: string;
  
  /**
   * Optional message to display when a folder has no items.
   */
  readonly emptyFolderMessage?: string;
  
  /**
   * Optional additional class name for the component.
   */
  readonly className?: string;
  
  /**
   * Optional callback when a folder is toggled open/closed.
   */
  readonly onFolderToggle?: (folderIndex: number, isOpen: boolean) => void;
}

/**
 * DataFolders is a reusable component for displaying items organized in collapsible folders.
 * 
 * @example
 * <DataFolders
 *   folders={modules}
 *   getFolderKey={(mod) => mod.id}
 *   getFolderName={(mod) => mod.name}
 *   getFolderItems={(mod) => mod.items}
 *   getItemKey={(item) => item.id}
 *   renderItem={(item, folder) => <ItemCard item={item} folderName={folder.name} />}
 *   initialOpenFolders={[0, 2]} // First and third folders open by default
 *   emptyMessage="No folders found."
 *   emptyFolderMessage="This folder is empty."
 * />
 */
export function DataFolders<F, T>({
  folders,
  getFolderKey,
  getFolderName,
  getFolderItems,
  renderItem,
  getItemKey,
  initialOpenFolders = [],
  emptyMessage = 'No folders found.',
  emptyFolderMessage = 'No items found in this folder.',
  className = '',
  onFolderToggle
}: DataFoldersProps<F, T>): JSX.Element {
  // State to track which folders are open
  const [openFolders, setOpenFolders] = useState<number[]>(initialOpenFolders);

  // Update openFolders when initialOpenFolders changes
  // This ensures folders open/close in response to search changes
  React.useEffect(() => {
    setOpenFolders(initialOpenFolders);
  }, [initialOpenFolders]);

  // Toggle a folder's open/closed state
  const toggleFolder = useCallback((idx: number) => {
    setOpenFolders(prev => {
      const isCurrentlyOpen = prev.includes(idx);
      const newOpenFolders = isCurrentlyOpen
        ? prev.filter(i => i !== idx)
        : [...prev, idx];
      
      // Call the callback if provided
      if (onFolderToggle) {
        onFolderToggle(idx, !isCurrentlyOpen);
      }
      
      return newOpenFolders;
    });
  }, [onFolderToggle]);

  // If there are no folders, show the empty message
  if (folders.length === 0) {
    return (
      <div className={`gba:flex gba:justify-center gba:items-center gba:p-6 ${className}`}>
        <div className="gba:text-gray-400 gba:text-center gba:text-base">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`gba:flex gba:flex-col gba:gap-4 gba:w-full ${className}`}>
      {folders.map((folder, idx) => {
        const isOpen = openFolders.includes(idx);
        const items = getFolderItems(folder);
        
        return (
          <div
            key={getFolderKey(folder)}
            className="gba:flex gba:flex-col gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden gba:bg-white gba:shadow-sm"
          >
            <button
              className="gba:flex gba:justify-between gba:items-center gba:p-4 gba:bg-gray-50 gba:font-semibold gba:cursor-pointer gba:border-none gba:w-full gba:text-left gba:hover:bg-gray-100"
              onClick={() => toggleFolder(idx)}
              type="button"
            >
              <span>{getFolderName(folder)}</span>
              <span className={`gba:inline-block gba:transition-transform gba:duration-200 gba:ease ${isOpen ? 'rotate-90' : ''}`}>▶</span>
            </button>
            {isOpen && (
              <div className="gba:p-4 gba:border-t gba:border-gray-200">
                {items.length > 0 ? (
                  <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:-mb-2">
                    {items.map(item => (
                      <React.Fragment key={getItemKey(item)}>
                        {renderItem(item, folder)}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="gba:p-4 gba:text-center gba:text-gray-500 gba:italic">{emptyFolderMessage}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DataFolders;
