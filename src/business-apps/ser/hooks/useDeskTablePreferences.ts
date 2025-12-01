import { useState, useEffect, useCallback, useRef } from 'react';
import { ColumnConfig } from '@/components/dataController';
import { 
  DeskTablePreferences, 
  TablePreferencesStorage, 
  getDefaultDeskTablePreferences 
} from '../types/tablePreferences';
import { LocalStorageTablePreferences } from '../adapters/LocalStorageTablePreferences';

interface UseDeskTablePreferencesOptions {
  storage?: TablePreferencesStorage;
  autoSaveDelay?: number;
  debug?: boolean;
}

export const useDeskTablePreferences = (
  deskKey: string,
  options: UseDeskTablePreferencesOptions = {}
) => {
  const {
    storage = new LocalStorageTablePreferences(),
    autoSaveDelay = 1000,
    debug = false
  } = options;

  const tableId = `deskQueue_${deskKey}`;
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Single state object to prevent circular dependencies
  const [state, setState] = useState<DeskTablePreferences>(() => getDefaultDeskTablePreferences());
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Debug logging removed - using inline debug checks instead

  // Auto-save function with debouncing - stable references
  const scheduleAutoSave = useCallback((newState: DeskTablePreferences) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        if (debug) {
          console.log(`[useDeskTablePreferences:${deskKey}] 💾 Auto-saving preferences...`);
        }
        await storage.savePreferences(tableId, newState);
        setLastSaved(new Date());
        if (debug) {
          console.log(`[useDeskTablePreferences:${deskKey}] ✅ Preferences saved successfully`);
        }
      } catch (error) {
        if (debug) {
          console.log(`[useDeskTablePreferences:${deskKey}] ❌ Failed to save preferences:`, error);
        }
      }
    }, autoSaveDelay);
  }, [storage, tableId, autoSaveDelay, debug, deskKey]);

  // Load initial preferences
  useEffect(() => {
    let isMounted = true;

    const loadInitialPreferences = async () => {
      try {
        if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 📥 Loading initial preferences...`);
        const savedPreferences = await storage.getPreferences(tableId);
        
        if (isMounted) {
          if (savedPreferences) {
            if (debug) console.log(`[useDeskTablePreferences:${deskKey}] ✅ Loaded saved preferences:`, savedPreferences);
            setState(savedPreferences);
          } else {
            if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 📝 Using default preferences`);
            setState(getDefaultDeskTablePreferences());
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (debug) console.log(`[useDeskTablePreferences:${deskKey}] ❌ Failed to load preferences:`, error);
        if (isMounted) {
          setState(getDefaultDeskTablePreferences());
          setIsLoading(false);
        }
      }
    };

    loadInitialPreferences();

    return () => {
      isMounted = false;
    };
  }, [storage, tableId, debug, deskKey]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Direct state updates with auto-save - no intermediate updateState function

  // Individual setters
  const setSearch = useCallback((search: string) => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 🔍 Setting search:`, search);
    setState(prevState => {
      const newState = { ...prevState, search };
      scheduleAutoSave(newState);
      return newState;
    });
  }, [scheduleAutoSave, debug, deskKey]);

  const setSortField = useCallback((field: string) => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 📊 Setting sort field:`, field);
    setState(prevState => {
      const newState = { 
        ...prevState, 
        sorting: { ...prevState.sorting, field } 
      };
      scheduleAutoSave(newState);
      return newState;
    });
  }, [scheduleAutoSave, debug, deskKey]);

  const setSortOrder = useCallback((order: 'ASC' | 'DESC') => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 📊 Setting sort order:`, order);
    setState(prevState => {
      const newState = { 
        ...prevState, 
        sorting: { ...prevState.sorting, order } 
      };
      scheduleAutoSave(newState);
      return newState;
    });
  }, [scheduleAutoSave, debug, deskKey]);

  const setSelectedFilters = useCallback((filters: string[]) => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 🔽 Setting filters:`, filters);
    setState(prevState => {
      const newState = { ...prevState, filters };
      scheduleAutoSave(newState);
      return newState;
    });
  }, [scheduleAutoSave, debug, deskKey]);

  const setColumnConfig = useCallback((columns: ColumnConfig[]) => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 📋 Setting column config:`, columns);
    setState(prevState => {
      const newState = { ...prevState, columns };
      scheduleAutoSave(newState);
      return newState;
    });
  }, [scheduleAutoSave, debug, deskKey]);

  // Convenience handlers for UI components
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 🔄 Sort change requested:`, field, order);
    
    setState(prevState => {
      let newSorting;
      if (order === '') {
        // Reset to default or clear
        if (field === 'updatedAt') {
          newSorting = { field: '', order: 'ASC' as const };
        } else {
          newSorting = { field: 'updatedAt', order: 'DESC' as const };
        }
      } else {
        newSorting = { field, order };
      }
      
      const newState = { ...prevState, sorting: newSorting };
      scheduleAutoSave(newState);
      return newState;
    });
  }, [scheduleAutoSave, debug, deskKey]);

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 🔽 Filter change:`, filterId, selected);
    setState(prevState => {
      const newFilters = selected 
        ? [...prevState.filters, filterId]
        : prevState.filters.filter(id => id !== filterId);
      const newState = { ...prevState, filters: newFilters };
      scheduleAutoSave(newState);
      return newState;
    });
  }, [scheduleAutoSave, debug, deskKey]);

  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 👁️ Column visibility change:`, columnId, visible);
    setState(prevState => {
      const newColumns = prevState.columns.map(col => 
        col.id === columnId ? { ...col, visible } : col
      );
      const newState = { ...prevState, columns: newColumns };
      scheduleAutoSave(newState);
      return newState;
    });
  }, [scheduleAutoSave, debug, deskKey]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    if (debug) console.log(`[useDeskTablePreferences:${deskKey}] 🔄 Resetting to defaults`);
    const defaults = getDefaultDeskTablePreferences();
    setState(defaults);
    scheduleAutoSave(defaults);
  }, [scheduleAutoSave, debug, deskKey]);

  return {
    // Current values
    search: state.search,
    sortField: state.sorting.field,
    sortOrder: state.sorting.order,
    selectedFilters: state.filters,
    columnConfig: state.columns,
    
    // Setters
    setSearch,
    setSortField,
    setSortOrder,
    setSelectedFilters,
    setColumnConfig,
    
    // Handlers for UI components
    handleSortingChange,
    handleFilterChange,
    handleColumnVisibilityChange,
    
    // Utility
    resetToDefaults,
    isLoading,
    lastSaved,
  };
};
