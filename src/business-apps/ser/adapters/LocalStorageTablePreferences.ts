import { DeskTablePreferences, TablePreferencesStorage, getDefaultDeskTablePreferences } from '../types/tablePreferences';

const STORAGE_PREFIX = 'newwork.deskTable.';

export class LocalStorageTablePreferences implements TablePreferencesStorage {
  async getPreferences(tableId: string): Promise<DeskTablePreferences | null> {
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
      if (item) {
        const preferences: DeskTablePreferences = JSON.parse(item);
        
        // Basic validation and migration
        if (preferences.version === '1.0' && preferences.columns && preferences.sorting) {
          return {
            ...getDefaultDeskTablePreferences(),
            ...preferences,
            lastUsed: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.warn(`[LocalStorageTablePreferences] Failed to get preferences for ${tableId}:`, error);
    }
    return null;
  }

  async savePreferences(tableId: string, preferences: DeskTablePreferences): Promise<void> {
    try {
      const toSave = {
        ...preferences,
        lastUsed: new Date().toISOString()
      };
      localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(toSave));
    } catch (error) {
      console.warn(`[LocalStorageTablePreferences] Failed to save preferences for ${tableId}:`, error);
    }
  }
}
