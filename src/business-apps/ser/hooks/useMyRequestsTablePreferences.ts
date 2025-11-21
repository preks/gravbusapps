import { useState, useEffect, useCallback, useRef } from 'react';
import { ColumnConfig } from '@/components/dataController';

interface MyRequestsPreferences {
  search: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  selectedFilters: string[];
  columnConfig: ColumnConfig[];
}

const getDefaultColumnConfig = (): ColumnConfig[] => [
  { id: "requestId", label: "Request ID", visible: true }, // Togglable
  { id: "name", label: "Service", visible: true, disabled: true }, // Required - always visible
  { id: "comments", label: "Comments", visible: true }, // Togglable
  { id: "progress", label: "Progress", visible: true }, // Togglable
  { id: "category", label: "Category", visible: true }, // Togglable
  { id: "status", label: "Status", visible: true }, // Togglable
  { id: "createdAt", label: "Created", visible: true }, // Togglable
  { id: "debug", label: "Debug", visible: false }, // Togglable
  { id: "actions", label: "Actions", visible: true }, // Togglable
];

const getStorageKey = (tableId: string) => `myRequestsPrefs_${tableId}`;

// Simple, synchronous localStorage operations
const loadPreferences = (tableId: string): MyRequestsPreferences => {
  try {
    const stored = localStorage.getItem(getStorageKey(tableId));
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaultColumns = getDefaultColumnConfig();
      
      // Merge saved column config with defaults to handle new columns
      let mergedColumns = defaultColumns;
      if (parsed.columnConfig && Array.isArray(parsed.columnConfig)) {
        mergedColumns = defaultColumns.map(defaultCol => {
          const savedCol = parsed.columnConfig.find((col: ColumnConfig) => col.id === defaultCol.id);
          return savedCol ? { ...defaultCol, visible: savedCol.visible } : defaultCol;
        });
      }
      
      return {
        search: parsed.search || '',
        sortField: parsed.sortField || 'createdAt',
        sortOrder: parsed.sortOrder || 'DESC',
        selectedFilters: parsed.selectedFilters || [],
        columnConfig: mergedColumns,
      };
    }
  } catch (error) {
    console.warn('Failed to load My Requests preferences:', error);
  }
  
  return {
    search: '',
    sortField: 'createdAt',
    sortOrder: 'DESC',
    selectedFilters: [],
    columnConfig: getDefaultColumnConfig(),
  };
};

const savePreferences = (tableId: string, preferences: MyRequestsPreferences) => {
  try {
    localStorage.setItem(getStorageKey(tableId), JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save My Requests preferences:', error);
  }
};

export const useMyRequestsTablePreferences = (tableId: string) => {
  // Initialize state synchronously - no async loading
  const [state, setState] = useState<MyRequestsPreferences>(() => loadPreferences(tableId));
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences when tableId changes
  useEffect(() => {
    const newPreferences = loadPreferences(tableId);
    setState(newPreferences);
  }, [tableId]);

  // Debounced save function
  const debouncedSave = useCallback((newState: MyRequestsPreferences) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePreferences(tableId, newState);
    }, 500);
  }, [tableId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Simple setters - no complex dependencies
  const setSearch = useCallback((search: string) => {
    setState(prev => {
      const newState = { ...prev, search };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  const setSelectedFilters = useCallback((selectedFilters: string[]) => {
    setState(prev => {
      const newState = { ...prev, selectedFilters };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  // Handlers for UI components
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    setState(prev => {
      let newSortField: string;
      let newSortOrder: 'ASC' | 'DESC';

      if (order === '') {
        if (field === 'createdAt') {
          newSortField = '';
          newSortOrder = 'ASC';
        } else {
          newSortField = 'createdAt';
          newSortOrder = 'DESC';
        }
      } else {
        newSortField = field;
        newSortOrder = order;
      }

      const newState = { 
        ...prev, 
        sortField: newSortField, 
        sortOrder: newSortOrder 
      };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setState(prev => {
      const newFilters = selected 
        ? [...prev.selectedFilters, filterId]
        : prev.selectedFilters.filter(id => id !== filterId);
      const newState = { ...prev, selectedFilters: newFilters };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setState(prev => {
      const newColumns = prev.columnConfig.map(col => 
        col.id === columnId ? { ...col, visible } : col
      );
      const newState = { ...prev, columnConfig: newColumns };
      debouncedSave(newState);
      return newState;
    });
  }, [debouncedSave]);

  return {
    // Current values
    search: state.search,
    sortField: state.sortField,
    sortOrder: state.sortOrder,
    selectedFilters: state.selectedFilters,
    columnConfig: state.columnConfig,
    
    // Setters
    setSearch,
    setSelectedFilters,
    
    // Handlers
    handleSortingChange,
    handleFilterChange,
    handleColumnVisibilityChange,
    
    // No loading state - always ready
    isLoading: false,
  };
};
