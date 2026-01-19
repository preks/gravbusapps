import { DeskTablePreferences, TablePreferencesStorage } from '../types/tablePreferences';

// Future API-based storage implementation
export class ApiTablePreferences implements TablePreferencesStorage {
  private apiUrl: string;
  private accessToken: string;
  private userId: string;

  constructor(apiUrl: string, accessToken: string, userId: string) {
    this.apiUrl = apiUrl;
    this.accessToken = accessToken;
    this.userId = userId;
  }

  async getPreferences(tableId: string): Promise<DeskTablePreferences | null> {
    try {
      // Future implementation - REST API call
      console.log(`[ApiTablePreferences] Would fetch preferences for ${tableId} from ${this.apiUrl}`);
      
      // Example implementation:
      // const response = await fetch(`${this.apiUrl}/users/${this.userId}/table-preferences/${tableId}`, {
      //   headers: { 
      //     'Authorization': `Bearer ${this.accessToken}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // 
      // if (!response.ok) {
      //   if (response.status === 404) return null; // No preferences found
      //   throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      // }
      // 
      // return await response.json() as DeskTablePreferences;

      return null; // For now, return null (no preferences found)
    } catch (error) {
      console.error(`[ApiTablePreferences] Failed to get preferences for ${tableId}:`, error);
      return null;
    }
  }

  async savePreferences(tableId: string, preferences: DeskTablePreferences): Promise<void> {
    try {
      // Future implementation - REST API call
      console.log(`[ApiTablePreferences] Would save preferences for ${tableId} to ${this.apiUrl}:`, preferences);
      
      // Example implementation:
      // await fetch(`${this.apiUrl}/users/${this.userId}/table-preferences/${tableId}`, {
      //   method: 'PUT',
      //   headers: { 
      //     'Authorization': `Bearer ${this.accessToken}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(preferences)
      // });
      
    } catch (error) {
      console.error(`[ApiTablePreferences] Failed to save preferences for ${tableId}:`, error);
      // Don't throw - graceful degradation
    }
  }
}
