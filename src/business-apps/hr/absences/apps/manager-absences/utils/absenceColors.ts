import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CatalogEntry } from '@/common/types/CatalogTypes';
import { AbsenceTypeOption, AbsenceGroupOption, useAbsenceCatalogs } from '../hooks/useAbsenceCatalogs';

export interface AbsenceColorConfig {
  id: string;
  name: string;
  color: string;
  type: 'group' | 'type';
  parentGroupId?: string;
}

export interface AbsenceColorsData {
  colorMap: { [key: string]: string };
  displayItems: AbsenceColorConfig[];
  loading: boolean;
  error: string | null;
}

// Fallback colors if catalog doesn't provide colors
const FALLBACK_COLORS = [
  "#10b981", "#f59e0b", "#ef4444", "#6b7280" // Status-based colors only
];

/**
 * Utility class to manage absence colors from catalog APIs
 * Handles special cases for remote, business trip, and work leave types
 */
export class AbsenceColorsManager {
  private catalogClient;
  private colorCache = new Map<string, string>();
  private absenceTypes: AbsenceTypeOption[] = [];
  private absenceGroups: AbsenceGroupOption[] = [];

  constructor(catalogClient: any, absenceTypes?: AbsenceTypeOption[], absenceGroups?: AbsenceGroupOption[]) {
    this.catalogClient = catalogClient;
    this.absenceTypes = absenceTypes || [];
    this.absenceGroups = absenceGroups || [];
  }

  /**
   * Update the absence types and groups data
   */
  updateCatalogData(absenceTypes: AbsenceTypeOption[], absenceGroups: AbsenceGroupOption[]) {
    this.absenceTypes = absenceTypes;
    this.absenceGroups = absenceGroups;
    // Clear cache when data is updated
    this.colorCache.clear();
  }

  /**
   * Fetch and process absence colors from catalogs
   */
  async getAbsenceColors(): Promise<AbsenceColorsData> {
    try {
      // Fetch both absence groups and types in parallel
      const [groupsResponse, typesResponse] = await Promise.all([
        this.fetchAbsenceGroups(),
        this.fetchAbsenceTypes()
      ]);

      const groups = groupsResponse || [];
      const types = typesResponse || [];

      // Define the desired order for absence groups
      const groupOrder = ['Vacation', 'Sick Leave', 'Special Leave', 'Work Leave'];
      const groupCodeOrder = ['RECR', 'HEALTH', 'SPCL', 'WORK']; // Corresponding codes
      
      // Sort groups according to the desired order
      const sortedGroups = groups.sort((a, b) => {
        const aIndex = groupOrder.findIndex(name => 
          a.value.toLowerCase().includes(name.toLowerCase()) || 
          groupCodeOrder.includes(a.code)
        );
        const bIndex = groupOrder.findIndex(name => 
          b.value.toLowerCase().includes(name.toLowerCase()) || 
          groupCodeOrder.includes(b.code)
        );
        
        // If both found, sort by index; if not found, put at end
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      console.log('Groups processing order:', sortedGroups.map(g => `${g.value} (${g.code})`));

      // Create maps for easy lookup
      const groupsMap = new Map(groups.map(g => [g.id, g]));
      const typesByGroupMap = new Map<string, CatalogEntry[]>();
      
      // Group types by their parent group
      types.forEach(type => {
        if (type.parentEntryId) {
          if (!typesByGroupMap.has(type.parentEntryId)) {
            typesByGroupMap.set(type.parentEntryId, []);
          }
          typesByGroupMap.get(type.parentEntryId)!.push(type);
        }
      });

      const colorMap: { [key: string]: string } = {};
      const displayItems: AbsenceColorConfig[] = [];
      let colorIndex = 0;

      // Process each group in the sorted order
      for (const group of sortedGroups) {
        const groupName = group.value.toLowerCase();
        
        // Special handling for Work Leave group - show individual types with combined names
        if (groupName.includes('work leave') || groupName.includes('work-leave') || group.code === 'WORK') {
          const workLeaveTypes = typesByGroupMap.get(group.id) || [];
          console.log(`Processing Work Leave types:`, workLeaveTypes.map(t => t.value));
          
          for (const workType of workLeaveTypes) {
            const typeColor = this.extractColorFromCatalog(workType) || FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length];
            const combinedName = `${group.value} - ${workType.value}`; // e.g., "Work Leave - Remote"
            
            console.log(`Adding Work Leave type: ${combinedName} with color ${typeColor}`);
            
            // Use combined name for both the type name and group name in color map
            colorMap[workType.value] = typeColor; // For direct type lookup
            colorMap[combinedName] = typeColor; // For combined name lookup
            colorMap[group.value] = typeColor; // Fallback for group lookup
            
            displayItems.push({
              id: workType.id,
              name: combinedName, // Use combined name for display
              color: typeColor,
              type: 'type',
              parentGroupId: group.id
            });
            colorIndex++;
          }
        } else {
          // Regular group handling for other groups
          const groupColor = this.extractColorFromCatalog(group) || FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length];
          
          console.log(`Adding regular group: ${group.value} with color ${groupColor}`);
          
          colorMap[group.value] = groupColor;
          displayItems.push({
            id: group.id,
            name: group.value,
            color: groupColor,
            type: 'group'
          });
          colorIndex++;
        }
      }

      // Special handling for Remote and Business Trip types that might not be in Work Leave group
      const specialTypes = types.filter(type => {
        const typeName = type.value.toLowerCase();
        return (typeName.includes('remote') || 
               typeName.includes('business trip') || 
               typeName.includes('business-trip')) &&
               !typesByGroupMap.get('AbsenceGroup:v1:WORK')?.some(wt => wt.id === type.id);
      });

      for (const specialType of specialTypes) {
        const typeColor = this.extractColorFromCatalog(specialType) || FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length];
        
        console.log(`Adding special type: ${specialType.value} with color ${typeColor}`);
        
        colorMap[specialType.value] = typeColor;
        displayItems.push({
          id: specialType.id,
          name: specialType.value,
          color: typeColor,
          type: 'type',
          parentGroupId: specialType.parentEntryId
        });
        colorIndex++;
      }

      console.log('Final color map:', colorMap);
      console.log('Final display items:', displayItems);

      return {
        colorMap,
        displayItems,
        loading: false,
        error: null
      };

    } catch (error) {
      console.error('Error fetching absence colors:', error);
      return {
        colorMap: {},
        displayItems: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch absence colors'
      };
    }
  }

  /**
   * Fetch absence groups from catalog
   */
  private async fetchAbsenceGroups(): Promise<CatalogEntry[]> {
    try {
      const response = await this.catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
        { 
          limit: 100, 
          offset: 0, 
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );
      return response.data || [];
    } catch (error) {
      console.error('Error fetching absence groups:', error);
      return [];
    }
  }

  /**
   * Fetch absence types from catalog
   */
  private async fetchAbsenceTypes(): Promise<CatalogEntry[]> {
    try {
      const response = await this.catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'AbsenceType', version: 'v1' },
        { 
          limit: 200, 
          offset: 0, 
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );
      return response.data || [];
    } catch (error) {
      console.error('Error fetching absence types:', error);
      return [];
    }
  }

  /**
   * Extract color from catalog entry
   * Look for color in various possible fields
   */
  private extractColorFromCatalog(entry: CatalogEntry): string | null {
    // Check objectValue.color field specifically (primary location for absence types)
    if (entry.objectValue && typeof entry.objectValue === 'object') {
      const obj = entry.objectValue as any;
      
      // Look for color field first (primary location in your data)
      if (obj.color && typeof obj.color === 'string') {
        let color = obj.color.trim();
        // Add # prefix if missing
        if (!color.startsWith('#')) {
          color = '#' + color;
        }
        console.log(`Found color in objectValue.color: ${color} for entry ${entry.value}`);
        return color;
      }
      
      // Fallback to other color field names
      if (obj.colors) return this.ensureHashPrefix(obj.colors);
      if (obj.hexColor) return this.ensureHashPrefix(obj.hexColor);
      if (obj.backgroundColor) return this.ensureHashPrefix(obj.backgroundColor);
      if (obj.chartColor) return this.ensureHashPrefix(obj.chartColor);
    }

    // Check additionalProperties.colors field (backup location)
    const entryWithProps = entry as any;
    if (entryWithProps.additionalProperties && typeof entryWithProps.additionalProperties === 'object') {
      const props = entryWithProps.additionalProperties;
      
      // Look for colors field first (priority)
      if (props.colors) return this.ensureHashPrefix(props.colors);
      if (props.color) return this.ensureHashPrefix(props.color);
      if (props.hexColor) return this.ensureHashPrefix(props.hexColor);
      if (props.backgroundColor) return this.ensureHashPrefix(props.backgroundColor);
      if (props.chartColor) return this.ensureHashPrefix(props.chartColor);
    }

    // Try to parse additionalProperties as JSON if it's a string
    if (entryWithProps.additionalProperties && typeof entryWithProps.additionalProperties === 'string') {
      try {
        const parsed = JSON.parse(entryWithProps.additionalProperties);
        if (parsed.colors) return this.ensureHashPrefix(parsed.colors);
        if (parsed.color) return this.ensureHashPrefix(parsed.color);
        if (parsed.hexColor) return this.ensureHashPrefix(parsed.hexColor);
        if (parsed.backgroundColor) return this.ensureHashPrefix(parsed.backgroundColor);
        if (parsed.chartColor) return this.ensureHashPrefix(parsed.chartColor);
      } catch {
        // Ignore parsing errors and continue
      }
    }

    // Check additional values that might contain color information
    if (entry.additionalValue1?.startsWith('#')) return entry.additionalValue1;
    if (entry.additionalValue2?.startsWith('#')) return entry.additionalValue2;
    if (entry.additionalValue3?.startsWith('#')) return entry.additionalValue3;

    // Check if any additional value contains "color" and a hex value
    const additionalValues = [entry.additionalValue1, entry.additionalValue2, entry.additionalValue3];
    for (const value of additionalValues) {
      if (value && typeof value === 'string' && value.includes('color') && value.includes('#')) {
        const hexMatch = value.match(/#[0-9a-fA-F]{6}/);
        if (hexMatch) return hexMatch[0];
      }
    }

    // Try to parse any additional value as JSON and look for colors properties
    for (const value of additionalValues) {
      if (value && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed.colors) return this.ensureHashPrefix(parsed.colors);
          if (parsed.color) return this.ensureHashPrefix(parsed.color);
          if (parsed.hexColor) return this.ensureHashPrefix(parsed.hexColor);
          if (parsed.backgroundColor) return this.ensureHashPrefix(parsed.backgroundColor);
          if (parsed.chartColor) return this.ensureHashPrefix(parsed.chartColor);
        } catch {
          // Ignore parsing errors and continue
        }
      }
    }

    console.log(`No color found for entry: ${entry.value} (${entry.id})`);
    return null;
  }

  /**
   * Ensure color has # prefix
   */
  private ensureHashPrefix(color: string): string {
    if (!color || typeof color !== 'string') return color;
    const trimmed = color.trim();
    return trimmed.startsWith('#') ? trimmed : '#' + trimmed;
  }

  /**
   * Get default color for absence type based on special rules
   */
  private getDefaultColorForType(typeCodeOrId: string): string {
    // Use status-based colors only
    return '#6b7280'; // Default gray for all types
  }

  /**
   * Simple hash function for consistent color assignment
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Get color for a specific absence name (group or type)
   */
  static getColorForAbsence(absenceName: string, colorMap: { [key: string]: string }): string {
    return colorMap[absenceName] || FALLBACK_COLORS[0];
  }

  /**
   * Get display name and color for chart legends
   */
  static getDisplayConfig(absenceName: string, displayItems: AbsenceColorConfig[]): AbsenceColorConfig | null {
    return displayItems.find(item => item.name === absenceName) || null;
  }

  /**
   * Get color for absence type by code or ID
   */
  getAbsenceTypeColor(typeCodeOrId: string): string {
    // First check if we have this type in cache
    if (this.colorCache.has(typeCodeOrId)) {
      return this.colorCache.get(typeCodeOrId)!;
    }

    // Look for the type in our catalog data
    const absenceType = this.absenceTypes.find(
      type => type.id === typeCodeOrId || 
              type.catalogEntry.code === typeCodeOrId || 
              type.name === typeCodeOrId
    );

    if (absenceType) {
      console.log(`Looking for color in absence type: ${absenceType.name} (${typeCodeOrId})`);
      const color = this.extractColorFromCatalog(absenceType.catalogEntry);
      if (color) {
        console.log(`Found color for type ${typeCodeOrId}: ${color}`);
        this.colorCache.set(typeCodeOrId, color);
        return color;
      }
    }

    // Apply special rules for specific types
    const defaultColor = this.getDefaultColorForType(typeCodeOrId);
    this.colorCache.set(typeCodeOrId, defaultColor);
    console.log(`Using default color for type ${typeCodeOrId}: ${defaultColor}`);
    return defaultColor;
  }

  /**
   * Get color for absence group by code or ID
   */
  getAbsenceGroupColor(groupCodeOrId: string): string {
    // First check if we have this group in cache
    if (this.colorCache.has(groupCodeOrId)) {
      return this.colorCache.get(groupCodeOrId)!;
    }

    // Look for the group in our catalog data
    const absenceGroup = this.absenceGroups.find(
      group => group.id === groupCodeOrId || 
               group.catalogEntry.code === groupCodeOrId || 
               group.name === groupCodeOrId
    );

    if (absenceGroup) {
      console.log(`Looking for color in absence group: ${absenceGroup.name} (${groupCodeOrId})`);
      const color = this.extractColorFromCatalog(absenceGroup.catalogEntry);
      if (color) {
        console.log(`Found color for group ${groupCodeOrId}: ${color}`);
        this.colorCache.set(groupCodeOrId, color);
        return color;
      }
    }

    // Apply special rules for specific groups
    const defaultColor = this.getDefaultColorForType(groupCodeOrId);
    this.colorCache.set(groupCodeOrId, defaultColor);
    console.log(`Using default color for group ${groupCodeOrId}: ${defaultColor}`);
    return defaultColor;
  }
}

/**
 * React hook for managing absence colors
 * Integrates with catalog data from useAbsenceCatalogs hook
 */
export const useAbsenceColors = (context: BusinessAppContextProps) => {
  const [colorsData, setColorsData] = useState<AbsenceColorsData>({
    colorMap: {},
    displayItems: [],
    loading: true,
    error: null
  });

  // Get catalog data with detailed logging
  const { absenceTypes, absenceGroups, isLoading: catalogsLoading, error: catalogsError } = useAbsenceCatalogs(context);

  // Call the hook at the top level
  const catalogClient = useCatalogManagerClient(context.accessToken);

  // Create the manager with the client and catalog data
  const colorsManager = useMemo(() => {
    const manager = new AbsenceColorsManager(catalogClient, absenceTypes, absenceGroups);
    return manager;
  }, [catalogClient, absenceTypes, absenceGroups]);

  // Update manager data when catalog data changes
  useEffect(() => {
    if (absenceTypes.length > 0 || absenceGroups.length > 0) {
      colorsManager.updateCatalogData(absenceTypes, absenceGroups);
    }
  }, [colorsManager, absenceTypes, absenceGroups]);

  const loadColors = useCallback(async () => {
    setColorsData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await colorsManager.getAbsenceColors();
      setColorsData(data);
    } catch (error) {
      setColorsData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load colors'
      }));
    }
  }, [colorsManager]);

  useEffect(() => {
    if (context.accessToken && catalogClient && !catalogsLoading) {
      loadColors();
    }
  }, [context.accessToken, catalogClient, catalogsLoading, loadColors]);

  // Add individual color lookup methods
  const getAbsenceTypeColor = useCallback((typeCodeOrId: string): string => {
    return colorsManager.getAbsenceTypeColor(typeCodeOrId);
  }, [colorsManager]);

  const getAbsenceGroupColor = useCallback((groupCodeOrId: string): string => {
    return colorsManager.getAbsenceGroupColor(groupCodeOrId);
  }, [colorsManager]);

  return {
    ...colorsData,
    loading: colorsData.loading || catalogsLoading,
    error: colorsData.error || catalogsError,
    refetch: loadColors,
    getColorForAbsence: (absenceName: string) => 
      AbsenceColorsManager.getColorForAbsence(absenceName, colorsData.colorMap),
    getDisplayConfig: (absenceName: string) => 
      AbsenceColorsManager.getDisplayConfig(absenceName, colorsData.displayItems),
    getAbsenceTypeColor,
    getAbsenceGroupColor
  };
};

/**
 * Transform absence data for charts based on the color configuration
 * This replaces group names with type names where appropriate
 */
export const transformAbsenceDataForCharts = (
  absences: any[], 
  displayItems: AbsenceColorConfig[]
): any[] => {
  return absences.map(absence => {
    const originalGroupName = absence.type?.groupName;
    
    // Find if this absence type should be displayed differently
    const displayConfig = displayItems.find(item => 
      (item.type === 'type' && item.name === absence.type?.value) ||
      (item.type === 'group' && item.name === originalGroupName)
    );

    return {
      ...absence,
      displayName: displayConfig?.name || originalGroupName || absence.type?.value || 'Unknown',
      displayColor: displayConfig?.color || FALLBACK_COLORS[0],
      isTypeLevel: displayConfig?.type === 'type'
    };
  });
}; 