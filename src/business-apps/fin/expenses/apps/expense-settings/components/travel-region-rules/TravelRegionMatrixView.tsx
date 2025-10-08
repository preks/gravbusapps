import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Alert, 
  AlertDescription,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system';
import { 
  PiArrowLeft, 
  PiPlus, 
  PiMapPin, 
  PiWarning,
  PiFloppyDisk,
  PiDotsSixVertical
} from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
// Removed form imports - using inline editing instead
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient';
import dayjs from 'dayjs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Custom toast function
const toast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
};

interface TravelRegion {
  id: string;
  code: string;
  value: string;
}

interface AllowanceRegionRule {
  id: string;
  code: string;
  name: string;
  activeFrom: string;
  activeTo?: string;
  ruleOrder?: number;
  details: AllowanceRegionRuleDetail[];
}

interface AllowanceRegionRuleDetail {
  id: string;
  amount: number;
  activeFrom: string;
  activeTo?: string;
  country?: {
    id: string;
    code: string;
    value: string;
  };
  currency?: {
    id: string;
    code: string;
    value: string;
  };
  travelRegion?: {
    id: string;
    code: string;
    value: string;
  };
}

interface EditableCell {
  id?: string; // detail ID for existing, undefined for new
  travelRegionId: string;
  allowanceRegionRuleId: string;
  amount: number;
  currencyCode: string;
  activeFrom: string;
  activeTo?: string;
  isNew: boolean;
  isModified: boolean;
  hasError?: boolean;
  errorMessage?: string;
  // Additional fields for validation
  validityPeriodId?: string; // To group cells with same validity period
}

interface EditableTravelRegion extends TravelRegion {
  isEditing: boolean;
  editingCode: string;
  editingValue: string;
  isModified: boolean;
  isNew: boolean;
  validityPeriods: ValidityPeriod[];
}

interface ValidityPeriod {
  id: string;
  activeFrom: string;
  activeTo?: string;
  currencyCode: string;
  hasConflict: boolean;
}

interface CurrencyOption {
  id: string;
  code: string;
  value: string;
}

interface TravelRegionMatrixViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  travelRegionSetId: string;
  travelRegionSetName: string;
  onBack: () => void;
}

// Sortable column header component for drag-and-drop
const SortableColumnHeader: React.FC<{
  rule: AllowanceRegionRule;
  onAddRule: () => void;
  children: React.ReactNode;
}> = ({ rule, onAddRule, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableHead 
      ref={setNodeRef} 
      style={style} 
      className="gba:w-48 gba:min-w-48 gba:relative gba:border gba:p-0"
    >
      <div className="gba:p-3">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <div 
            {...attributes} 
            {...listeners}
            className="gba:cursor-grab gba:text-gray-400 hover:gba:text-gray-600"
          >
            <PiDotsSixVertical className="gba:w-4 gba:h-4" />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddRule}
            className="gba:h-6 gba:w-6 gba:p-0"
          >
            <PiPlus className="gba:w-3 gba:h-3" />
          </Button>
        </div>
        {children}
      </div>
    </TableHead>
  );
};

const TravelRegionMatrixView: React.FC<TravelRegionMatrixViewProps> = ({
  accessToken,
  prefixDataTestId = '',
  travelRegionSetId,
  travelRegionSetName,
  onBack,
}) => {
  const [editableTravelRegions, setEditableTravelRegions] = useState<EditableTravelRegion[]>([]);
  const [allowanceRegionRules, setAllowanceRegionRules] = useState<AllowanceRegionRule[]>([]);
  const [editableCells, setEditableCells] = useState<EditableCell[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ ruleId: string; regionId: string; field?: string } | null>(null);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRuleName, setNewRuleName] = useState('');

  const graphqlClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);
  const expenseSettingsClient = new ExpenseSettingsClient();

  // Initialize client
  useEffect(() => {
    if (accessToken) {
      expenseSettingsClient.setAccessToken(accessToken);
    }
  }, [accessToken]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );



  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  // Load currencies from catalog
  const loadCurrencies = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'Currency', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      );
      setCurrencies(response.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        value: item.value
      })));
    } catch (err) {
      console.error('Error loading currencies:', err);
    }
  }, [catalogClient]);

  // Load travel regions
  const loadTravelRegions = useCallback(async () => {
    try {
      // Use the catalog client to get travel regions by parent
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'TravelRegion', version: 'v1' },
        { 
          limit: 100, 
          offset: 0, 
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );
      
      // Filter by parent ID on the client side since catalog API doesn't support it directly
      const filteredData = response.data
        .filter((item: any) => item.parentEntryId === travelRegionSetId)
        .map((item: any) => ({
          id: item.id,
          code: item.code,
          value: item.value
        }));
      
      // Remove duplicates based on ID
      return filteredData.filter((region, index, self) => 
        index === self.findIndex(r => r.id === region.id)
      );
    } catch (err) {
      console.error('Error loading travel regions:', err);
      return [];
    }
  }, [catalogClient, travelRegionSetId]);

  // Load allowance region rules
  const loadAllowanceRegionRules = useCallback(async () => {
    try {
      // Use the exact same query structure as the working TravelRegionMatrixView
      const query = `
        query GetAllowanceRegionRulesWithTravelRegionSet($travelRegionSetId: String!) {
          AllowanceRegionRule(
            where: { 
              isDeleted: { _eq: false },
              travelRegionSetRef: { _eq: $travelRegionSetId }
            }
            orderBy: [{ ruleOrder: ASC }, { code: ASC }]
          ) {
            id
            code
            name
            activeFrom
            activeTo
            ruleOrder
            allowanceRegionRuleDetail(where: { isDeleted: { _eq: false } }) {
              id
              amount
              activeFrom
              activeTo
              travelRegionRef
              country {
                id
                code
                value
              }
              currency {
                id
                code
                value
              }
            }
          }
        }
      `;

      const result = await graphqlClient.request<{ AllowanceRegionRule: any[] }>(
        query, 
        { travelRegionSetId }
      );
      
      const rules: AllowanceRegionRule[] = result.AllowanceRegionRule.map((rule: any) => ({
        id: rule.id,
        code: rule.code,
        name: rule.name,
        activeFrom: rule.activeFrom,
        activeTo: rule.activeTo,
        ruleOrder: rule.ruleOrder,
        details: rule.allowanceRegionRuleDetail.map((detail: any) => ({
          ...detail,
          // Extract travel region info from the reference string if needed
          travelRegion: detail.travelRegionRef ? {
            id: detail.travelRegionRef,
            code: '',
            value: ''
          } : undefined
        }))
      }));
      
      return rules;
    } catch (err) {
      console.error('Error loading allowance region rules:', err);
      return [];
    }
  }, [graphqlClient, travelRegionSetId]);

  // Convert rule details to editable cells
  const convertToEditableCells = useCallback((rules: AllowanceRegionRule[], regions: TravelRegion[]): EditableCell[] => {
    const cells: EditableCell[] = [];
    
    rules.forEach(rule => {
      regions.forEach(region => {
        // Find existing details for this rule-region combination
        const existingDetails = rule.details?.filter(detail => 
          detail.travelRegion?.id === region.id
        ) || [];
        
        if (existingDetails.length > 0) {
          // Create cells for existing details
          existingDetails.forEach(detail => {
            cells.push({
              id: detail.id,
              travelRegionId: region.id,
              allowanceRegionRuleId: rule.id,
              amount: detail.amount,
              currencyCode: detail.currency?.code || 'EUR',
              activeFrom: detail.activeFrom,
              activeTo: detail.activeTo,
              isNew: false,
              isModified: false
            });
          });
        } else {
          // Create empty cell placeholder
          cells.push({
            travelRegionId: region.id,
            allowanceRegionRuleId: rule.id,
            amount: 0,
            currencyCode: 'EUR',
            activeFrom: dayjs().format('YYYY-MM-DD'),
            activeTo: undefined,
            isNew: true,
            isModified: false
          });
        }
      });
    });
    
    return cells;
  }, []);

  // Validate currency consistency for each region
  const validateCurrencies = useCallback((cells: EditableCell[]): EditableCell[] => {
    const regionCurrencies: { [regionId: string]: Set<string> } = {};
    
    // Group currencies by region
    cells.forEach(cell => {
      if (cell.amount > 0) {
        if (!regionCurrencies[cell.travelRegionId]) {
          regionCurrencies[cell.travelRegionId] = new Set();
        }
        regionCurrencies[cell.travelRegionId].add(cell.currencyCode);
      }
    });
    
    // Mark cells with currency conflicts
    return cells.map(cell => {
      const regionCurrenciesSet = regionCurrencies[cell.travelRegionId];
      const hasConflict = regionCurrenciesSet && regionCurrenciesSet.size > 1;
      
      return {
        ...cell,
        hasError: hasConflict,
        errorMessage: hasConflict ? 'Currency mismatch in this region' : undefined
      };
    });
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [regions, rules] = await Promise.all([
        loadTravelRegions(),
        loadAllowanceRegionRules(),
        loadCurrencies()
      ]);
      
      setAllowanceRegionRules(rules);
      
      const cells = convertToEditableCells(rules, regions);
      const validatedCells = validateCurrencies(cells);
      setEditableCells(validatedCells);
      
      // Store regions temporarily to convert after convertToEditableRegions is available
      // Remove duplicates based on region ID
      const uniqueRegions = regions.filter((region, index, self) => 
        index === self.findIndex(r => r.id === region.id)
      );
      
      setEditableTravelRegions(uniqueRegions.map(region => ({
        ...region,
        isEditing: false,
        editingCode: region.code,
        editingValue: region.value,
        isModified: false,
        isNew: false,
        validityPeriods: []
      })));
      
    } catch (err) {
      console.error('Error loading matrix data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load matrix data');
    } finally {
      setIsLoading(false);
    }
  }, [loadTravelRegions, loadAllowanceRegionRules, loadCurrencies, convertToEditableCells, validateCurrencies]);

  // Convert regular travel regions to editable ones
  const convertToEditableRegions = useCallback((regions: TravelRegion[], cells: EditableCell[]): EditableTravelRegion[] => {
    return regions.map(region => {
      // Group cells by validity periods for this region
      const regionCells = cells.filter(cell => cell.travelRegionId === region.id);
      const validityPeriods: ValidityPeriod[] = [];
      
      // Create validity periods based on unique activeFrom/activeTo combinations
      const periodMap = new Map<string, ValidityPeriod>();
      
      regionCells.forEach(cell => {
        const periodKey = `${cell.activeFrom}-${cell.activeTo || 'null'}`;
        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            id: periodKey,
            activeFrom: cell.activeFrom,
            activeTo: cell.activeTo,
            currencyCode: cell.currencyCode,
            hasConflict: false
          });
        } else {
          // Check for currency conflicts
          const existing = periodMap.get(periodKey)!;
          if (existing.currencyCode !== cell.currencyCode) {
            existing.hasConflict = true;
          }
        }
      });
      
      validityPeriods.push(...periodMap.values());
      
      // If no validity periods exist, create a default one
      if (validityPeriods.length === 0) {
        validityPeriods.push({
          id: `default-${region.id}`,
          activeFrom: dayjs().format('YYYY-MM-DD'),
          activeTo: undefined,
          currencyCode: 'EUR',
          hasConflict: false
        });
      }
      
      return {
        ...region,
        isEditing: false,
        editingCode: region.code,
        editingValue: region.value,
        isModified: false,
        isNew: false,
        validityPeriods
      };
    });
  }, []);

  useEffect(() => {
    if (accessToken && travelRegionSetId) {
      loadData();
    }
  }, [accessToken, travelRegionSetId, loadData]);

  // Update editable regions with validity periods after cells are loaded
  useEffect(() => {
    if (editableTravelRegions.length > 0 && editableCells.length > 0) {
      const updatedRegions = convertToEditableRegions(
        editableTravelRegions.map(r => ({ id: r.id, code: r.code, value: r.value })),
        editableCells
      );
      setEditableTravelRegions(updatedRegions);
    }
  }, [editableCells, convertToEditableRegions]);

  // Handle region field editing
  const handleRegionEdit = (regionId: string, field: 'code' | 'value') => {
    setEditableTravelRegions(prev => prev.map(region => 
      region.id === regionId ? { ...region, isEditing: true } : region
    ));
    setEditingCell({ ruleId: '', regionId, field });
  };

  const handleRegionChange = (regionId: string, field: 'code' | 'value', value: string) => {
    setEditableTravelRegions(prev => prev.map(region => 
      region.id === regionId 
        ? { 
            ...region, 
            [`editing${field.charAt(0).toUpperCase() + field.slice(1)}`]: value,
            isModified: true 
          }
        : region
    ));
    setHasUnsavedChanges(true);
  };

  const handleRegionBlur = (regionId: string) => {
    setEditableTravelRegions(prev => prev.map(region => 
      region.id === regionId ? { ...region, isEditing: false } : region
    ));
    setEditingCell(null);
  };

  // Handle validity period editing
  const handlePeriodEdit = (regionId: string, _periodId: string, field: 'currency' | 'activeFrom' | 'activeTo') => {
    setEditingCell({ ruleId: '', regionId, field });
  };

  const handlePeriodChange = (regionId: string, periodId: string, field: 'currencyCode' | 'activeFrom' | 'activeTo', value: string) => {
    // Update the validity period in the region
    setEditableTravelRegions(prev => prev.map(region => 
      region.id === regionId 
        ? {
            ...region,
            validityPeriods: region.validityPeriods.map(period =>
              period.id === periodId
                ? { ...period, [field]: value }
                : period
            ),
            isModified: true
          }
        : region
    ));

    // Also update all cells that match this period
    setEditableCells(prev => prev.map(cell => {
      if (cell.travelRegionId === regionId) {
        const currentPeriod = editableTravelRegions
          .find(r => r.id === regionId)
          ?.validityPeriods.find(p => p.id === periodId);
        
        if (currentPeriod && 
            cell.activeFrom === currentPeriod.activeFrom &&
            (cell.activeTo || undefined) === currentPeriod.activeTo) {
          return { ...cell, [field]: value, isModified: true };
        }
      }
      return cell;
    }));

    setHasUnsavedChanges(true);
  };

  // Add new validity period to a region
  const handleAddValidityPeriod = (regionId: string) => {
    const newPeriodId = `${regionId}-period-${Date.now()}`;
    const newPeriod: ValidityPeriod = {
      id: newPeriodId,
      activeFrom: dayjs().format('YYYY-MM-DD'),
      activeTo: undefined,
      currencyCode: 'EUR',
      hasConflict: false
    };

    setEditableTravelRegions(prev => prev.map(region => 
      region.id === regionId 
        ? {
            ...region,
            validityPeriods: [...region.validityPeriods, newPeriod],
            isModified: true
          }
        : region
    ));

    setHasUnsavedChanges(true);
  };

  // Handle drag end for column reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setAllowanceRegionRules((rules) => {
        const oldIndex = rules.findIndex(rule => rule.id === active.id);
        const newIndex = rules.findIndex(rule => rule.id === over?.id);

        const newRules = arrayMove(rules, oldIndex, newIndex);
        
        // Update rule order
        const updatedRules = newRules.map((rule, index) => ({
          ...rule,
          ruleOrder: index + 1
        }));

        // Regenerate editable cells with new order
        const currentRegions = editableTravelRegions.map(r => ({ id: r.id, code: r.code, value: r.value }));
        const newCells = convertToEditableCells(updatedRules, currentRegions);
        const validatedCells = validateCurrencies(newCells);
        setEditableCells(validatedCells);
        setHasUnsavedChanges(true);

        return updatedRules;
      });
    }
  }, [convertToEditableCells, editableTravelRegions, validateCurrencies]);

  // Add new region directly
  const handleAddRegion = async () => {
    const regionName = newRegionName || prompt('Enter region name:');
    if (!regionName?.trim()) {
      toast('Please enter a region name', 'error');
      return;
    }

    try {
      // First, check if a region with this code already exists
      const proposedCode = regionName.trim().toUpperCase().replace(/\s+/g, '_');
      
      // Get all existing travel regions to check for duplicates
      const allRegionsResponse = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'TravelRegion', version: 'v1' },
        { 
          limit: 1000, 
          offset: 0, 
          returnTotalRecords: false
        }
      );
      
      const existingCodes = allRegionsResponse.data.map((item: any) => item.code);
      
      if (existingCodes.includes(proposedCode)) {
        // Generate a unique code by appending a number
        let uniqueCode = proposedCode;
        let counter = 1;
        while (existingCodes.includes(uniqueCode)) {
          uniqueCode = `${proposedCode}_${counter}`;
          counter++;
        }
        
        const confirmMessage = `A travel region with code "${proposedCode}" already exists. Would you like to create it with code "${uniqueCode}" instead?`;
        if (!confirm(confirmMessage)) {
          toast('Region creation cancelled', 'error');
          return;
        }
      }

      // Create travel region via catalog API
      const regionData = {
        code: existingCodes.includes(proposedCode) ? 
          `${proposedCode}_${existingCodes.filter(code => code.startsWith(proposedCode)).length}` : 
          proposedCode,
        value: regionName.trim(),
        description: `Travel region: ${regionName.trim()}`,
        parentEntryId: travelRegionSetId,
        translations: [
          {
            localeCode: 'en',
            value: regionName.trim()
          }
        ]
      };

      console.log('🚀 Creating travel region:', regionData);
      await catalogClient.createCatalogEntry('TravelRegion', 'v1', regionData);
      
      setNewRegionName('');
      toast('Travel region created successfully', 'success');
      
      // Reload data to show the new region
      await loadData();
    } catch (err) {
      console.error('❌ Error creating region:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create region';
      
      // Check if it's a duplicate code error
      if (errorMessage.includes('Duplicate catalog entry codes')) {
        toast('A region with this code already exists. Please try a different name.', 'error');
      } else {
        toast(errorMessage, 'error');
      }
    }
  };

  // Add new rule column directly
  const handleAddRule = async () => {
    const ruleName = newRuleName || prompt('Enter rule name:');
    if (!ruleName?.trim()) {
      toast('Please enter a rule name', 'error');
      return;
    }

    try {
      const ruleData = {
        code: ruleName.trim().toUpperCase().replace(/\s+/g, '_'),
        name: ruleName.trim(),
        description: `Allowance rule: ${ruleName.trim()}`,
        activeFrom: dayjs().format('YYYY-MM-DD'),
        activeTo: null,
        travelRegionSetRef: travelRegionSetId,
        ruleOrder: allowanceRegionRules.length + 1,
        additionalProperties: {},
        businessKey: ruleName.trim().toUpperCase().replace(/\s+/g, '_')
      };

      await expenseSettingsClient.saveAllowanceRegionRule(ruleData);
      setNewRuleName('');
      loadData();
      toast('Allowance rule added successfully', 'success');
    } catch (err) {
      console.error('Error creating rule:', err);
      toast('Failed to create rule', 'error');
    }
  };

  // Handle inline cell editing
  const handleCellClick = (ruleId: string, regionId: string, periodId: string) => {
    setEditingCell({ ruleId, regionId, field: undefined });
    
    // If cell doesn't exist in state yet, add it
    const existingCell = editableCells.find(c => 
      c.allowanceRegionRuleId === ruleId && 
      c.travelRegionId === regionId &&
      c.validityPeriodId === periodId
    );
    
    if (!existingCell) {
      const region = editableTravelRegions.find(r => r.id === regionId);
      const period = region?.validityPeriods.find(p => p.id === periodId);
      
      if (region && period) {
        const newCell: EditableCell = {
          id: undefined,
          allowanceRegionRuleId: ruleId,
          travelRegionId: regionId,
          amount: 0,
          currencyCode: period.currencyCode,
          activeFrom: period.activeFrom,
          activeTo: period.activeTo,
          isNew: true,
          isModified: false,
          hasError: false,
          validityPeriodId: periodId
        };
        
        setEditableCells(prev => [...prev, newCell]);
      }
    }
  };

  const handleCellChange = (ruleId: string, regionId: string, field: 'amount', value: number) => {
    const currentEditingCell = editingCell;
    
    setEditableCells(prev => prev.map(cell => {
      // Match by rule, region, and validity period
      if (cell.allowanceRegionRuleId === ruleId && 
          cell.travelRegionId === regionId &&
          currentEditingCell) {
        
        // Find the correct period for this editing session
        const region = editableTravelRegions.find(r => r.id === regionId);
        const matchingPeriod = region?.validityPeriods.find(p => 
          cell.activeFrom === p.activeFrom && 
          (cell.activeTo || undefined) === (p.activeTo || undefined)
        );
        
        if (matchingPeriod) {
          return { ...cell, [field]: value, isModified: true };
        }
      }
      return cell;
    }));
    setHasUnsavedChanges(true);
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  // Save all changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const modifiedCells = editableCells.filter(cell => 
        (cell.isModified && !cell.isNew && cell.amount > 0) || 
        (cell.isNew && cell.amount > 0)
      );

      // Group by rule and save
      const savePromises = modifiedCells.map(async (cell) => {
        const saveData = {
          id: cell.id,
          amount: cell.amount,
          currencyRef: currencies.find(c => c.code === cell.currencyCode)?.id,
          activeFrom: cell.activeFrom,
          activeTo: cell.activeTo,
          travelRegionRef: cell.travelRegionId,
          allowanceRegionRuleRef: cell.allowanceRegionRuleId
        };

        return expenseSettingsClient.saveAllowanceRegionRuleDetail(saveData);
      });

      await Promise.all(savePromises);
      
      toast('All changes saved successfully', 'success');
      setHasUnsavedChanges(false);
      loadData(); // Refresh data
      
    } catch (err) {
      console.error('Error saving changes:', err);
      toast('Failed to save changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Removed unused getCell and getCellIndex functions

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-96">
        <div className="gba:text-gray-500">Loading enhanced matrix data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="gba:max-w-md gba:mx-auto">
        <AlertDescription>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <div className="gba:font-medium gba:mb-1">Error Loading Matrix Data</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button size="sm" variant="outline" onClick={loadData}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div 
      data-testid={`${prefixDataTestId}-travel-region-matrix-view`}
      className="gba:p-6"
    >
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <Button
            variant="ghost"
            onClick={onBack}
            data-testid={`${prefixDataTestId}-back-button`}
          >
            <PiArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
            Back to Travel Region Sets
          </Button>
        </div>

        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
              Travel Region Matrix: {travelRegionSetName}
            </h2>
            <p className="gba:text-gray-600">
                              Excel-like editing - {editableTravelRegions.length} regions × {allowanceRegionRules.length} rules
            </p>
          </div>
          <div className="gba:flex gba:gap-3">
            {hasUnsavedChanges && (
              <Button 
                onClick={handleSaveAll} 
                disabled={isSaving}
                className="gba:bg-green-600 hover:gba:bg-green-700"
              >
                <PiFloppyDisk className="gba:w-4 gba:h-4 gba:mr-2" />
                {isSaving ? 'Saving...' : 'Save All Changes'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Excel-like Matrix Table */}
      {editableTravelRegions.length > 0 && allowanceRegionRules.length > 0 ? (
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <div className="gba:overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table className="gba:min-w-full">
                <TableHeader>
                  {/* Main Header Row */}
                  <TableRow>
                    <TableHead className="gba:w-48 gba:min-w-48 gba:sticky gba:left-0 gba:bg-white gba:z-10 gba:border-r">
                      <span className="gba:font-semibold">Travel Regions</span>
                    </TableHead>
                    <SortableContext 
                      items={allowanceRegionRules.map(r => r.id)} 
                      strategy={horizontalListSortingStrategy}
                    >
                      {allowanceRegionRules.map((rule) => (
                        <SortableColumnHeader
                          key={rule.id}
                          rule={rule}
                          onAddRule={handleAddRule}
                        >
                          <div className="gba:text-center">
                            <div className="gba:font-medium gba:text-sm">{rule.name}</div>
                            <div className="gba:text-xs gba:text-gray-500 gba:mb-1">{rule.code}</div>
                            <div className="gba:text-xs gba:text-gray-500">
                              {formatDate(rule.activeFrom)} - {rule.activeTo ? formatDate(rule.activeTo) : '∞'}
                            </div>
                          </div>
                        </SortableColumnHeader>
                      ))}
                    </SortableContext>
                    {/* Simple Add Column Header */}
                    <TableHead className="gba:w-16 gba:text-center gba:bg-gray-50">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const name = prompt('Enter rule name:');
                          if (name?.trim()) {
                            setNewRuleName(name.trim());
                            handleAddRule();
                          }
                        }}
                        className="gba:h-8 gba:w-8 gba:p-0"
                        title="Add Column"
                      >
                        <PiPlus className="gba:w-4 gba:h-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Add Row - Simple plus button row */}
                  <TableRow className="gba:bg-gray-50 gba:border-b-2">
                    <TableCell className="gba:sticky gba:left-0 gba:bg-gray-50 gba:z-10 gba:border-r gba:text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const name = prompt('Enter region name:');
                          if (name?.trim()) {
                            setNewRegionName(name.trim());
                            handleAddRegion();
                          }
                        }}
                        className="gba:h-8 gba:w-8 gba:p-0"
                        title="Add Region"
                      >
                        <PiPlus className="gba:w-4 gba:h-4" />
                      </Button>
                    </TableCell>
                    {allowanceRegionRules.map((rule) => (
                      <TableCell key={`add-row-${rule.id}`} className="gba:bg-gray-50 gba:text-center gba:text-gray-400">
                        —
                      </TableCell>
                    ))}
                    {/* Empty cell for add column */}
                    <TableCell className="gba:bg-gray-50">
                    </TableCell>
                  </TableRow>
                  
                  {/* Data Rows - Now supporting multiple validity periods per region */}
                  {editableTravelRegions.flatMap((region) => {
                    // Create rows for each validity period + at least one row per region
                    const validityPeriods = region.validityPeriods.length > 0 ? region.validityPeriods : [
                      { id: 'new', activeFrom: dayjs().format('YYYY-MM-DD'), activeTo: undefined, currencyCode: 'EUR', hasConflict: false }
                    ];
                    
                    return validityPeriods.map((period, periodIndex) => (
                    <TableRow key={`${region.id}-${period.id}`}>
                      <TableCell className="gba:sticky gba:left-0 gba:bg-white gba:z-10 gba:border-r gba:w-64">
                        <div className="gba:p-2 gba:space-y-2">
                          {/* Region Info - Only show on first row of each region */}
                          {periodIndex === 0 && (
                            <div className="gba:border-b gba:pb-2 gba:mb-2">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                                <PiMapPin className="gba:text-blue-600" />
                                <div className="gba:flex-1">
                                  {/* Editable Code */}
                                  <div className="gba:mb-1">
                                    {region.isEditing && editingCell?.field === 'code' && editingCell?.regionId === region.id ? (
                                      <Input
                                        value={region.editingCode}
                                        onChange={(e) => handleRegionChange(region.id, 'code', e.target.value)}
                                        onBlur={() => handleRegionBlur(region.id)}
                                        className="gba:h-6 gba:text-xs gba:font-medium"
                                        autoFocus
                                      />
                                    ) : (
                                      <div 
                                        className="gba:text-xs gba:text-gray-500 gba:cursor-pointer gba:hover:bg-gray-100 gba:px-1 gba:py-0.5 gba:rounded"
                                        onClick={() => handleRegionEdit(region.id, 'code')}
                                        title="Click to edit code"
                                      >
                                        {region.code}
                                      </div>
                                    )}
                                  </div>
                                  {/* Editable Name */}
                                  <div>
                                    {region.isEditing && editingCell?.field === 'value' && editingCell?.regionId === region.id ? (
                                      <Input
                                        value={region.editingValue}
                                        onChange={(e) => handleRegionChange(region.id, 'value', e.target.value)}
                                        onBlur={() => handleRegionBlur(region.id)}
                                        className="gba:h-6 gba:text-xs gba:font-medium"
                                        autoFocus
                                      />
                                    ) : (
                                      <div 
                                        className="gba:font-medium gba:text-sm gba:cursor-pointer gba:hover:bg-gray-100 gba:px-1 gba:py-0.5 gba:rounded"
                                        onClick={() => handleRegionEdit(region.id, 'value')}
                                        title="Click to edit name"
                                      >
                                        {region.value}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Validity Period & Currency - Editable for this specific row */}
                          <div className="gba:space-y-2 gba:bg-gray-50 gba:p-2 gba:rounded">
                            {/* Currency Selection */}
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:text-xs gba:text-gray-600 gba:w-16">Currency:</span>
                              {editingCell?.regionId === region.id && editingCell?.field === 'currency' ? (
                                <Select
                                  value={period.currencyCode}
                                  onValueChange={(value) => handlePeriodChange(region.id, period.id, 'currencyCode', value)}
                                >
                                  <SelectTrigger className="gba:h-6 gba:text-xs gba:flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {currencies.map((currency) => (
                                      <SelectItem key={currency.id} value={currency.code}>
                                        {currency.code}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div 
                                  className="gba:text-sm gba:font-medium gba:cursor-pointer gba:hover:bg-gray-100 gba:px-2 gba:py-1 gba:rounded gba:flex-1"
                                  onClick={() => handlePeriodEdit(region.id, period.id, 'currency')}
                                  title="Click to edit currency"
                                >
                                  {period.currencyCode}
                                  {period.hasConflict && <PiWarning className="gba:w-3 gba:h-3 gba:text-red-500 gba:ml-1" />}
                                </div>
                              )}
                            </div>

                            {/* Valid From */}
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:text-xs gba:text-gray-600 gba:w-16">From:</span>
                              {editingCell?.regionId === region.id && editingCell?.field === 'activeFrom' ? (
                                <Input
                                  type="date"
                                  value={period.activeFrom}
                                  onChange={(e) => handlePeriodChange(region.id, period.id, 'activeFrom', e.target.value)}
                                  onBlur={() => handleRegionBlur(region.id)}
                                  className="gba:h-6 gba:text-xs gba:flex-1"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="gba:text-sm gba:cursor-pointer gba:hover:bg-gray-100 gba:px-2 gba:py-1 gba:rounded gba:flex-1"
                                  onClick={() => handlePeriodEdit(region.id, period.id, 'activeFrom')}
                                  title="Click to edit start date"
                                >
                                  {period.activeFrom}
                                </div>
                              )}
                            </div>

                            {/* Valid To */}
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:text-xs gba:text-gray-600 gba:w-16">To:</span>
                              {editingCell?.regionId === region.id && editingCell?.field === 'activeTo' ? (
                                <Input
                                  type="date"
                                  value={period.activeTo || ''}
                                  onChange={(e) => handlePeriodChange(region.id, period.id, 'activeTo', e.target.value)}
                                  onBlur={() => handleRegionBlur(region.id)}
                                  className="gba:h-6 gba:text-xs gba:flex-1"
                                  placeholder="Leave empty for unlimited"
                                />
                              ) : (
                                <div 
                                  className="gba:text-sm gba:cursor-pointer gba:hover:bg-gray-100 gba:px-2 gba:py-1 gba:rounded gba:flex-1"
                                  onClick={() => handlePeriodEdit(region.id, period.id, 'activeTo')}
                                  title="Click to edit end date"
                                >
                                  {period.activeTo || '∞'}
                                </div>
                              )}
                            </div>
                            
                            {/* Add new validity period button */}
                            <div className="gba:mt-2 gba:pt-2 gba:border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddValidityPeriod(region.id)}
                                className="gba:w-full gba:h-6 gba:text-xs"
                              >
                                <PiPlus className="gba:w-3 gba:h-3 gba:mr-1" />
                                Add Period
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {allowanceRegionRules.map((rule) => {
                        // Find or create cell for this specific region row + rule combination
                        let cell = editableCells.find(c => 
                          c.allowanceRegionRuleId === rule.id && 
                          c.travelRegionId === region.id &&
                          c.activeFrom === period.activeFrom &&
                          (c.activeTo || undefined) === period.activeTo
                        );
                        
                        // If no cell exists for this row/rule combination, create a placeholder
                        if (!cell) {
                          cell = {
                            id: undefined,
                            allowanceRegionRuleId: rule.id,
                            travelRegionId: region.id,
                            amount: 0,
                            currencyCode: period.currencyCode,
                            activeFrom: period.activeFrom,
                            activeTo: period.activeTo,
                            isNew: true,
                            isModified: false,
                            hasError: false,
                            validityPeriodId: period.id
                          };
                        }
                        
                        const isEditing = editingCell?.ruleId === rule.id && 
                                        editingCell?.regionId === region.id &&
                                        editingCell?.field === undefined && // Only for amount editing
                                        cell?.validityPeriodId === period.id;
                        
                        return (
                          <TableCell 
                            key={`${rule.id}-${region.id}-${period.id}`}
                            className={`gba:text-center gba:relative gba:cursor-pointer gba:hover:bg-gray-50 gba:h-16 ${
                              cell?.hasError ? 'gba:bg-red-50' : 
                              cell?.isModified ? 'gba:bg-blue-50' : 
                              cell?.isNew ? 'gba:bg-green-50' : ''
                            }`}
                            onClick={() => handleCellClick(rule.id, region.id, period.id)}
                          >
                            {cell ? (
                              <div className="gba:text-center gba:p-2">
                                {isEditing ? (
                                  /* Simple Amount Editing */
                                  <div className="gba:space-y-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={cell.amount || ''}
                                      onChange={(e) => handleCellChange(rule.id, region.id, 'amount', parseFloat(e.target.value) || 0)}
                                      onBlur={handleCellBlur}
                                      className="gba:w-20 gba:h-8 gba:text-center gba:mx-auto"
                                      placeholder="0.00"
                                      autoFocus
                                    />
                                    <div className="gba:text-xs gba:text-gray-500">
                                      {period.currencyCode}
                                    </div>
                                  </div>
                                ) : (
                                  /* Display Mode - Amount Only */
                                  <div>
                                    <div className="gba:text-lg gba:font-medium">
                                      {cell.amount > 0 ? (
                                        cell.amount.toFixed(2)
                                      ) : (
                                        <span className="gba:text-gray-400">—</span>
                                      )}
                                    </div>
                                    <div className="gba:text-xs gba:text-gray-500">
                                      {period.currencyCode}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Modification Indicator */}
                                {cell.isModified && (
                                  <div className="gba:absolute gba:top-1 gba:right-1">
                                    <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Empty Cell */
                              <div className="gba:text-center gba:py-4 gba:text-gray-400 gba:cursor-pointer" 
                                   onClick={() => handleCellClick(rule.id, region.id, period.id)}>
                                <div className="gba:text-2xl">+</div>
                                <div className="gba:text-xs">Add</div>
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      {/* Empty add column cell */}
                      <TableCell className="gba:w-16 gba:text-center gba:text-gray-300 gba:h-16">
                      </TableCell>
                    </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </div>
      ) : (
        <div className="gba:text-center gba:py-12 gba:bg-gray-50 gba:rounded-lg">
          <PiMapPin className="gba:w-12 gba:h-12 gba:text-gray-400 gba:mx-auto gba:mb-4" />
          <h4 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-2">
            No Matrix Data Available
          </h4>
          <p className="gba:text-gray-500 gba:mb-4">
            Create travel regions and allowance rules to build your matrix.
          </p>
          <div className="gba:flex gba:justify-center gba:gap-3">
            <Input
              value={newRegionName}
              onChange={(e) => setNewRegionName(e.target.value)}
              placeholder="Enter region name..."
              className="gba:w-48"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newRegionName.trim()) {
                  handleAddRegion();
                }
              }}
            />
            <Button variant="default" onClick={handleAddRegion} disabled={!newRegionName.trim()}>
              <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Travel Region
            </Button>
            <Input
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              placeholder="Enter rule name..."
              className="gba:w-48"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newRuleName.trim()) {
                  handleAddRule();
                }
              }}
            />
            <Button variant="outline" onClick={handleAddRule} disabled={!newRuleName.trim()}>
              <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Rule
            </Button>
          </div>
        </div>
      )}

      {/* All forms removed - using inline editing */}
    </div>
  );
};

export default TravelRegionMatrixView;
