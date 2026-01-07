import { useState, useEffect, useCallback, useRef } from 'react';
import { ColumnConfig } from '@/components/dataController';

interface DeskPreferences {
  search: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  selectedFilters: string[];
  columnConfig: ColumnConfig[];
}

const getDefaultColumnConfig = (): ColumnConfig[] => [
  { id: "requestId", label: "Request ID", visible: true },
  { id: "stepName", label: "Ticket Title", visible: true },
  { id: "requester", label: "Requester", visible: true },
  { id: "status", label: "Status", visible: true },
  { id: "urgency", label: "Urgency", visible: true },
  { id: "slaDue", label: "SLA Due", visible: true },
  { id: "assignee", label: "Assignee", visible: true },
  { id: "updated", label: "Updated", visible: true },
  { id: "debug", label: "Debug", visible: false },
  { id: "actions", label: "Actions", visible: true, disabled: true },
];

const getStorageKey = (deskKey: string) => `deskPrefs_${deskKey}`;

// Simple, synchronous localStorage operations
const loadPreferences = (deskKey: string): DeskPreferences => {
  try {
    const stored = localStorage.getItem(getStorageKey(deskKey));
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        search: parsed.search || '',
        sortField: parsed.sortField || 'updatedAt',
        sortOrder: parsed.sortOrder || 'DESC',
        selectedFilters: parsed.selectedFilters || [],
        columnConfig: parsed.columnConfig || getDefaultColumnConfig(),
      };
    }
  } catch (error) {
    console.warn('Failed to load desk preferences:', error);
  }
  
  return {
    search: '',
    sortField: 'updatedAt',
    sortOrder: 'DESC',
    selectedFilters: [],
    columnConfig: getDefaultColumnConfig(),
  };
};

const savePreferences = (deskKey: string, preferences: DeskPreferences) => {
  try {
    localStorage.setItem(getStorageKey(deskKey), JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save desk preferences:', error);
  }
};

export const useDeskTablePreferencesSimple = (deskKey: string) => {
  // Initialize state synchronously - no async loading
  const [state, setState] = useState<DeskPreferences>(() => loadPreferences(deskKey));
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences when deskKey changes
  useEffect(() => {
    const newPreferences = loadPreferences(deskKey);
    setState(newPreferences);
  }, [deskKey]);

  // Debounced save function
  const debouncedSave = useCallback((newState: DeskPreferences) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePreferences(deskKey, newState);
    }, 500);
  }, [deskKey]);

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
        if (field === 'updatedAt') {
          newSortField = '';
          newSortOrder = 'ASC';
        } else {
          newSortField = 'updatedAt';
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
