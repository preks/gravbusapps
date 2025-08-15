import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { 
  Button, 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
  Spinner,
  Checkbox
} from '@newwork/nw-design-system';
import { PiFloppyDisk, PiX, PiWarning, PiPlus, PiTrash, PiCheck } from 'react-icons/pi';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

// Register dayjs plugins
dayjs.extend(weekday);
dayjs.extend(localeData);
import { useGetAllowanceRegionRuleById } from '../../queries/ExpenseRuleQueries';

// Available travel regions (common categories)
const TRAVEL_REGIONS = [
  { id: 'western-europe', name: 'Western Europe' },
  { id: 'eastern-europe', name: 'Eastern Europe' },
  { id: 'north-america', name: 'North America' },
  { id: 'south-america', name: 'South America' },
  { id: 'asia-pacific', name: 'Asia Pacific' },
  { id: 'middle-east', name: 'Middle East' },
  { id: 'africa', name: 'Africa' },
  { id: 'oceania', name: 'Oceania' },
  { id: 'domestic', name: 'Domestic' },
  { id: 'international', name: 'International' }
];

export interface AllowanceRegionDetailFormData {
  id?: string;
  countryRef: string;
  travelRegion: string;
  travelRegionRef?: string;
  currencyRef: string;
  home: boolean;
  activeFrom: string;
  activeTo?: string;
  amounts: number[]; // Array of amounts for multiple columns
}

export interface TravelRegionRuleFormData {
  id?: string;
  code: string;
  name: string;
  activeFrom?: string;
  activeTo?: string;
  details: AllowanceRegionDetailFormData[];
}

interface TravelRegionRuleFormProps extends BusinessAppContextProps {
  initialData?: TravelRegionRuleFormData;
  isEditing?: boolean;
  onSave: (data: TravelRegionRuleFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface CatalogOption {
  id: string;
  value: string;
  code?: string;
}

interface SmartColumnGroup {
  key: string;
  countryRef: string;
  countryName: string;
  travelRegion: string;
  currencyRef: string;
  currencyCode: string;
  homeFlag: boolean;
  validFrom: string;
  validTo?: string;
  amounts: number[];
  detailIds: string[];
}

const TravelRegionRuleForm: React.FC<TravelRegionRuleFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  loading = false,
  accessToken,
  ...context
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [formData, setFormData] = useState<TravelRegionRuleFormData>({
    code: '',
    name: '',
    activeFrom: dayjs().format('YYYY-MM-DD'),
    activeTo: '',
    details: []
  });
  
  // ✅ Data source tracking for debugging
  const [dataSource, setDataSource] = useState<'fresh' | 'stale' | 'new'>('new');
  
  // ✅ NEW: Hook for fetching fresh travel region rule data
  const { fetchAllowanceRegionRuleById } = useGetAllowanceRegionRuleById({ accessToken, ...context } as BusinessAppContextProps);
  
  // Catalog data
  const [countries, setCountries] = useState<CatalogOption[]>([]);
  const [currencies, setCurrencies] = useState<CatalogOption[]>([]);
  const [travelRegions, setTravelRegions] = useState<CatalogOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  const catalogClient = useCatalogManagerClient(accessToken);

  // Load catalog data
  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      const [countriesRes, currenciesRes, travelRegionsRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Currency', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'TravelRegion', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
      ]);

      setCountries(countriesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

      setCurrencies(currenciesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

      // Set travel regions from catalog
      if (travelRegionsRes.data && travelRegionsRes.data.length > 0) {
        setTravelRegions(travelRegionsRes.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        })));
      } else {
        // Use hardcoded travel regions as fallback
        setTravelRegions(TRAVEL_REGIONS.map(region => ({
          id: region.id,
          value: region.name,
          code: region.id
        })));
      }
    } catch (err) {
      console.error('Error loading catalog data:', err);
      setError('Failed to load catalog data');
      // Use hardcoded travel regions as fallback
      setTravelRegions(TRAVEL_REGIONS.map(region => ({
        id: region.id,
        value: region.name,
        code: region.id
      })));
    } finally {
      setCatalogsLoading(false);
    }
  }, [catalogClient]);

  useEffect(() => {
    if (accessToken) {
      loadCatalogData();
    }
  }, [accessToken, loadCatalogData]);

  // ✅ FIXED: Fetch fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        console.log('🔄 TravelRegionRuleForm: Fetching FRESH data for ID:', initialData.id);
        try {
          const freshData = await fetchAllowanceRegionRuleById(initialData.id);
          if (freshData) {
            console.log('✅ TravelRegionRuleForm: Using FRESH data from API:', freshData);
            setDataSource('fresh');
            const transformedData = {
              id: freshData.id,
              version: freshData.version,
              code: freshData.code || '',
              name: freshData.name || '',
              activeFrom: freshData.activeFrom ? dayjs(freshData.activeFrom).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
              activeTo: freshData.activeTo ? dayjs(freshData.activeTo).format('YYYY-MM-DD') : '',
              details: (freshData.allowanceRegionRuleDetail || []).map((detail: any) => ({
                id: detail.id,
                version: detail.version,
                countryRef: detail.country?.id || '',
                currencyRef: detail.currency?.id || '',
                amounts: [detail.amount || 0],
                home: false, // Default value
                activeFrom: detail.activeFrom ? dayjs(detail.activeFrom).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                activeTo: detail.activeTo ? dayjs(detail.activeTo).format('YYYY-MM-DD') : '',
                businessKey: detail.businessKey,
                additionalProperties: detail.additionalProperties
              }))
            };
            setFormData(transformedData);
            return;
          }
        } catch (error) {
          console.error('❌ TravelRegionRuleForm: Failed to load fresh travel region rule data:', error);
          console.log('⚠️ TravelRegionRuleForm: Falling back to STALE list data');
          setDataSource('stale');
          // Continue with fallback to initial data
        }
      }
      
      // ✅ Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        console.log('📝 TravelRegionRuleForm: Using initial data (could be stale list data or new item data):', initialData);
      // Transform the initial data to ensure amounts are in the correct format
      const transformedDetails = initialData.details?.map(detail => {
        const anyDetail = detail as any; // Type assertion for backward compatibility
        return {
          ...detail,
          // Ensure amounts is always an array
          amounts: Array.isArray(detail.amounts) 
            ? detail.amounts 
            : detail.amounts 
              ? [detail.amounts] 
              : [0],
          // Map field names from API to form
          home: detail.home !== undefined ? detail.home : anyDetail.homeFlag || false,
          activeFrom: detail.activeFrom || anyDetail.validFrom || dayjs().format('YYYY-MM-DD'),
          activeTo: detail.activeTo || anyDetail.validTo,
          // Set travelRegion ID for select (use travelRegionRef for ID, fallback to travelRegion if it's an ID)
          travelRegion: detail.travelRegionRef || (detail.travelRegion && detail.travelRegion.startsWith('TravelRegion:') ? detail.travelRegion : '') || ''
        };
      }) || [];

      setFormData({
        ...initialData,
        activeFrom: initialData.activeFrom ? dayjs(initialData.activeFrom).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        activeTo: initialData.activeTo ? dayjs(initialData.activeTo).format('YYYY-MM-DD') : '',
        details: transformedDetails
      });
      }
    };

    loadData();
  }, [initialData?.id, isEditing, fetchAllowanceRegionRuleById]);

  // Group details into smart columns
  const groupedDetails = useCallback((): SmartColumnGroup[] => {
    const groups: { [key: string]: SmartColumnGroup } = {};
    
    formData.details.forEach((detail, index) => {
      const groupKey = `${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`;
      
      if (!groups[groupKey]) {
        const country = countries.find(c => c.id === detail.countryRef);
        const currency = currencies.find(c => c.id === detail.currencyRef);
        const region = travelRegions.find(r => r.id === detail.travelRegion);
        
        groups[groupKey] = {
          key: groupKey,
          countryRef: detail.countryRef,
          countryName: country?.value || 'Unknown',
          travelRegion: detail.travelRegion,
          currencyRef: detail.currencyRef,
          currencyCode: currency?.code || 'USD',
          homeFlag: detail.home,
          validFrom: detail.activeFrom,
          validTo: detail.activeTo,
          amounts: [],
          detailIds: []
        };
      }
      
      // Add amounts to the group - handle both array and single amount
      if (detail.amounts && Array.isArray(detail.amounts) && detail.amounts.length > 0) {
        // If detail has multiple amounts, add them all
        detail.amounts.forEach((amount, amountIndex) => {
          if (groups[groupKey].amounts[amountIndex] === undefined) {
            groups[groupKey].amounts[amountIndex] = amount;
          }
        });
      } else if (detail.amounts && !Array.isArray(detail.amounts)) {
        // If it's a single amount, convert to array
        if (groups[groupKey].amounts.length === 0) {
          groups[groupKey].amounts.push(detail.amounts);
        }
      } else {
        // If no amounts or empty array, add a default 0
        if (groups[groupKey].amounts.length === 0) {
          groups[groupKey].amounts.push(0);
        }
      }
      
      groups[groupKey].detailIds.push(detail.id || `temp-${index}`);
    });
    
    // Ensure each group has at least one amount
    Object.values(groups).forEach(group => {
      if (group.amounts.length === 0) {
        group.amounts.push(0);
      }
    });
    
    const result = Object.values(groups);
    return result;
  }, [formData.details, countries, currencies, travelRegions]);

  // Add new column group
  const addColumnGroup = () => {
    const newDetail: AllowanceRegionDetailFormData = {
      countryRef: '',
      travelRegion: '',
      currencyRef: '',
      home: false,
      activeFrom: dayjs().format('YYYY-MM-DD'),
      activeTo: '',
      amounts: [0]
    };
    
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, newDetail]
    }));
  };

  // Add amount column to a group
  const addAmountColumn = (groupKey: string) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(detail => {
        const detailGroupKey = `${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`;
        if (detailGroupKey === groupKey) {
          return {
            ...detail,
            amounts: [...(detail.amounts || []), 0]
          };
        }
        return detail;
      })
    }));
  };

  // Update group details
  const updateGroupDetail = (groupKey: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(detail => {
        const detailGroupKey = `${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`;
        if (detailGroupKey === groupKey) {
          return { ...detail, [field]: value };
        }
        return detail;
      })
    }));
  };

  // Update amount in group
  const updateAmount = (groupKey: string, amountIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(detail => {
        const detailGroupKey = `${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`;
        if (detailGroupKey === groupKey) {
          const newAmounts = [...(detail.amounts || [])];
          // Store as number but handle empty string case
          newAmounts[amountIndex] = value === '' ? 0 : parseFloat(value) || 0;
          return { ...detail, amounts: newAmounts };
        }
        return detail;
      })
    }));
  };

  // Remove group
  const removeGroup = (groupKey: string) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter(detail => {
        const detailGroupKey = `${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`;
        return detailGroupKey !== groupKey;
      })
    }));
  };

  // Remove amount from a group
  const removeAmount = (groupKey: string, amountIndex: number) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(detail => {
        const detailGroupKey = `${detail.countryRef}-${detail.travelRegion}-${detail.currencyRef}-${detail.home}-${detail.activeFrom}-${detail.activeTo || 'ongoing'}`;
        if (detailGroupKey === groupKey) {
          const newAmounts = [...(detail.amounts || [])];
          newAmounts.splice(amountIndex, 1);
          return { ...detail, amounts: newAmounts };
        }
        return detail;
      })
    }));
  };

  // Validation
  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.code.trim()) {
      errors.push('Rule code is required');
    }
    
    if (!formData.name.trim()) {
      errors.push('Rule name is required');
    }
    
    if (formData.details.length === 0) {
      errors.push('At least one allowance detail is required');
    }
    
    formData.details.forEach((detail, index) => {
      if (!detail.countryRef) {
        errors.push(`Detail ${index + 1}: Country is required`);
      }
      if (!detail.travelRegion) {
        errors.push(`Detail ${index + 1}: Travel region is required`);
      }
      if (!detail.currencyRef) {
        errors.push(`Detail ${index + 1}: Currency is required`);
      }
      if (!detail.activeFrom) {
        errors.push(`Detail ${index + 1}: Valid from date is required`);
      }
      if (!detail.amounts || detail.amounts.length === 0 || detail.amounts.every(a => a <= 0)) {
        errors.push(`Detail ${index + 1}: At least one amount greater than 0 is required`);
      }
    });
    
    return errors;
  };

  // Handle save
  const handleSave = async () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      setShowValidation(true);
      setError(errors.join(', '));
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Transform grouped data back to individual details for API
      const expandedDetails: AllowanceRegionDetailFormData[] = [];
      
      groupedDetails().forEach(group => {
        // Create one detail record per group with all amounts
        if (group.amounts.length > 0 && group.amounts.some(amount => amount > 0)) {
          expandedDetails.push({
            id: group.detailIds[0] || undefined, // Use the first detail ID if available
            countryRef: group.countryRef,
            travelRegion: group.travelRegion, // This should be the display value
            travelRegionRef: group.travelRegion, // This should be the ID for API
            currencyRef: group.currencyRef,
            home: group.homeFlag,
            activeFrom: group.validFrom,
            activeTo: group.validTo,
            amounts: group.amounts.filter(amount => amount > 0) // Only include non-zero amounts
          });
        }
      });
      
      const submitData: TravelRegionRuleFormData = {
        ...formData,
        details: expandedDetails
      };
      
      await onSave(submitData);
      // Note: Removed message.success as it's not available in nw-design-system
      // You might want to use a toast notification or handle success in parent component
    } catch (err) {
      console.error('Error saving allowance region rule:', err);
      setError(err instanceof Error ? err.message : 'Failed to save allowance region rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (catalogsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  const groups = groupedDetails();
  const maxAmounts = Math.max(...groups.map(g => g.amounts.length), 1);

  return (
    <div className="gba:p-6 gba:space-y-6">
      <div className="gba:flex gba:items-center gba:gap-3">
        <h3 className="gba:text-2xl gba:font-semibold">
          {isEditing ? 'Edit Allowance Region Rule' : 'Create Allowance Region Rule'}
        </h3>
        {isEditing && (
          <span className={`gba:text-xs gba:px-2 gba:py-1 gba:rounded ${
            dataSource === 'fresh' ? 'gba:bg-green-100 gba:text-green-800 gba:border gba:border-green-300' : 
            dataSource === 'stale' ? 'gba:bg-yellow-100 gba:text-yellow-800 gba:border gba:border-yellow-300' : 
            'gba:bg-gray-100 gba:text-gray-800 gba:border gba:border-gray-300'
          }`}>
            {dataSource === 'fresh' ? '✅ Fresh Data' : 
             dataSource === 'stale' ? '⚠️ Stale Data' : 
             '📝 New Item'}
          </span>
        )}
      </div>

      {error && showValidation && (
        <Alert variant="destructive">
          <PiWarning className="gba:h-4 gba:w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label htmlFor="rule-code">Rule Code *</Label>
              <Input
                id="rule-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Enter rule code"
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor="rule-name">Rule Name *</Label>
              <Input
                id="rule-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter rule name"
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor="active-from">Active From</Label>
              <Input
                id="active-from"
                type="date"
                value={formData.activeFrom || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, activeFrom: e.target.value }))}
                data-testid="travel-region-rule-form-active-from"
                min="1900-01-01"
                max="2099-12-31"
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor="active-to">Active To</Label>
              <Input
                id="active-to"
                type="date"
                value={formData.activeTo || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, activeTo: e.target.value }))}
                data-testid="travel-region-rule-form-active-to"
                min="1900-01-01"
                max="2099-12-31"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allowance Region Details */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle>Allowance Region Details</CardTitle>
            <Button onClick={addColumnGroup} className="gba:flex gba:items-center gba:gap-2">
              <PiPlus className="gba:h-4 gba:w-4" />
              Add Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length > 0 ? (
            <div className="gba:space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-40">Country</TableHead>
                    <TableHead className="gba:w-40">Travel Region</TableHead>
                    <TableHead className="gba:w-32">Currency</TableHead>
                    <TableHead className="gba:w-20">Home</TableHead>
                    <TableHead className="gba:w-36">Valid From</TableHead>
                    <TableHead className="gba:w-36">Valid To</TableHead>
                    <TableHead className="gba:w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group, groupIndex) => (
                    <React.Fragment key={group.key}>
                      {/* Group Label Row */}
                      <TableRow>
                        <TableCell colSpan={7} className="gba:bg-blue-50 gba:py-2 gba:px-4 gba:border-b-0">
                          <Label className="gba:font-semibold gba:text-base gba:text-blue-800">
                            Group {groupIndex + 1}
                          </Label>
                        </TableCell>
                      </TableRow>

                      {/* Main Group Row */}
                      <TableRow>
                        <TableCell>
                          <Select value={group.countryRef} onValueChange={(value) => updateGroupDetail(group.key, 'countryRef', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map(country => (
                                <SelectItem key={country.id} value={country.id}>
                                  {country.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={group.travelRegion} onValueChange={(value) => updateGroupDetail(group.key, 'travelRegion', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                                                      <SelectContent>
                            {travelRegions.map(region => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={group.currencyRef} onValueChange={(value) => updateGroupDetail(group.key, 'currencyRef', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {currencies.map(currency => (
                                <SelectItem key={currency.id} value={currency.id}>
                                  {currency.code} - {currency.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={group.homeFlag}
                            onCheckedChange={(checked) => updateGroupDetail(group.key, 'home', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={group.validFrom}
                            onChange={(e) => updateGroupDetail(group.key, 'activeFrom', e.target.value)}
                            data-testid={`travel-region-rule-group-valid-from-${groupIndex}`}
                            min="1900-01-01"
                            max="2099-12-31"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={group.validTo || ''}
                            onChange={(e) => updateGroupDetail(group.key, 'activeTo', e.target.value || undefined)}
                            data-testid={`travel-region-rule-group-valid-to-${groupIndex}`}
                            min="1900-01-01"
                            max="2099-12-31"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="gba:flex gba:gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addAmountColumn(group.key)}
                              title="Add Amount"
                            >
                              <PiPlus className="gba:h-4 gba:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeGroup(group.key)}
                              title="Remove Group"
                              className="gba:text-red-600 hover:gba:text-red-700"
                            >
                              <PiTrash className="gba:h-4 gba:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Amounts Row - spans all columns */}
                      <TableRow>
                        <TableCell colSpan={7} className="gba:bg-gray-50 gba:p-4">
                          <div className="gba:flex gba:flex-wrap gba:gap-3 gba:items-end">
                            {group.amounts.map((amount, amountIndex) => (
                              <div key={`${group.key}-amount-${amountIndex}`} className="gba:flex gba:items-center gba:gap-2">
                                <div className="gba:space-y-1">
                                  <Label className="gba:text-xs gba:text-gray-600">
                                    Amount {amountIndex + 1}
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={amount || ''}
                                    onChange={(e) => updateAmount(group.key, amountIndex, e.target.value)}
                                    placeholder="0.00"
                                    className="gba:text-sm gba:w-24"
                                    data-testid={`travel-region-rule-amount-${group.key}-${amountIndex}`}
                                  />
                                </div>
                                {group.amounts.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAmount(group.key, amountIndex)}
                                    className="gba:text-red-600 hover:gba:text-red-700 gba:p-1 gba:h-6 gba:w-6 gba:mt-4"
                                    title="Remove this amount"
                                  >
                                    <PiTrash className="gba:h-3 gba:w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            
                            {/* Add Amount button positioned inline with amounts */}
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <div className="gba:space-y-1">
                                <Label className="gba:text-xs gba:text-transparent">
                                  Add
                                </Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addAmountColumn(group.key)}
                                  className="gba:flex gba:items-center gba:gap-2 gba:h-10"
                                  title="Add new amount"
                                >
                                  <PiPlus className="gba:h-4 gba:w-4" />
                                  Add Amount
                                </Button>
                              </div>
                            </div>
                            
                            {group.amounts.length === 0 && (
                              <div className="gba:text-center gba:py-3 gba:text-gray-500 gba:text-sm gba:italic gba:w-full">
                                No amounts added yet. Click "Add Amount" to start.
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              No allowance details added yet. Click "Add Group" to start.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="gba:flex gba:justify-end gba:gap-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSubmitting} className="gba:flex gba:items-center gba:gap-2">
          {isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            <PiFloppyDisk className="gba:h-4 gba:w-4" />
          )}
          {isEditing ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </div>
  );
};

export default TravelRegionRuleForm; 