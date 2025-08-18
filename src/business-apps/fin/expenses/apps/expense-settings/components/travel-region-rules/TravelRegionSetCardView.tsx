import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Alert, 
  AlertDescription,
  Badge
} from '@newwork/nw-design-system';
import { PiPlus, PiMapPin, PiTable } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { TravelRegionSetForm, TravelRegionSetFormData } from '../../forms/travel-region-set-form';

// Custom toast function
const toast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
};

interface TravelRegionSet {
  id: string;
  code: string;
  value: string;
  description?: string;
  childCount?: number;
}

interface TravelRegionSetCardViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  onSelectSet: (setId: string, setName: string) => void;
  onViewUnassigned: () => void;
}

const TravelRegionSetCardView: React.FC<TravelRegionSetCardViewProps> = ({
  accessToken,
  prefixDataTestId = '',
  onSelectSet,
  onViewUnassigned,
  ...context
}) => {
  const [travelRegionSets, setTravelRegionSets] = useState<TravelRegionSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);

  const catalogClient = useCatalogManagerClient(accessToken);

  const loadTravelRegionSets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'TravelRegionSet', version: 'v1' },
        { 
          limit: 100, 
          offset: 0, 
          returnTotalRecords: true,
          includeChildCatalogEntries: true // Include child catalog entries
        }
      );
      
      const sets: TravelRegionSet[] = response.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        value: item.value,
        description: item.description,
        childCount: item.childCount || 0
      }));
      
      setTravelRegionSets(sets);
    } catch (err) {
      console.error('Error loading travel region sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load travel region sets');
    } finally {
      setIsLoading(false);
    }
  }, [catalogClient]);

  useEffect(() => {
    if (accessToken) {
      loadTravelRegionSets();
    }
  }, [accessToken, loadTravelRegionSets]);

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-96">
        <div className="gba:text-gray-500">Loading travel region sets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="gba:max-w-md gba:mx-auto">
        <AlertDescription>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <div className="gba:font-medium gba:mb-1">Error Loading Travel Region Sets</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button size="sm" variant="outline" onClick={loadTravelRegionSets}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const handleSetSelect = (set: TravelRegionSet) => {
    onSelectSet(set.id, set.value);
  };

  const handleCreateTravelRegionSet = () => {
    setIsCreateFormVisible(true);
  };

  const handleCreateFormClose = () => {
    setIsCreateFormVisible(false);
  };

  const handleCreateFormSave = (data: TravelRegionSetFormData) => {
    // Refresh the list to show the newly created set
    loadTravelRegionSets();
    toast('Travel Region Set created successfully', 'success');
  };

  return (
    <div 
      data-testid={`${prefixDataTestId}-travel-region-sets-view`}
      className="gba:p-6"
    >
      <div className="gba:mb-6">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h3 className="gba:text-2xl gba:font-semibold gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('expense-settings:travel_region_sets', 'Travel Region Sets')}
            </h3>
            <p className="gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('expense-settings:travel_region_sets_description', 'Manage travel regions and their allowance rules')}
            </p>
          </div>
          <div className="gba:flex gba:gap-3">
            <Button
              variant="outline"
              onClick={onViewUnassigned}
              data-testid={`${prefixDataTestId}-view-unassigned-button`}
            >
              <PiTable className="gba:w-4 gba:h-4 gba:mr-2" />
              View Unassigned Rules
            </Button>
            <Button
              variant="default"
              onClick={handleCreateTravelRegionSet}
              data-testid={`${prefixDataTestId}-add-travel-region-set-button`}
            >
              <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Travel Region Set
            </Button>
          </div>
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 sm:gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4 gba:gap-4">
        {travelRegionSets.map((set) => (
          <Card
            key={set.id}
            className="gba:cursor-pointer gba:h-full hover:gba:shadow-lg gba:transition-shadow"
            data-testid={`${prefixDataTestId}-travel-region-set-card-${set.id}`}
            onClick={() => handleSetSelect(set)}
          >
            <CardHeader className="gba:flex gba:flex-row gba:items-center gba:space-y-0 gba:pb-3">
              <div className="gba:w-12 gba:h-12 gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mr-4">
                <PiMapPin className="gba:text-blue-600 gba:text-xl" />
              </div>
              <div className="gba:flex-1">
                <CardTitle className="gba:text-lg gba:font-semibold">{set.value}</CardTitle>
                <p className="gba:text-sm gba:text-gray-500">{set.code}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {set.description && (
                  <p className="gba:text-sm gba:text-gray-600">
                    {set.description}
                  </p>
                )}
                <div className="gba:flex gba:items-center gba:justify-between">
                  <Badge variant="secondary" className="gba:text-xs">
                    {set.childCount || 0} travel regions
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetSelect(set);
                    }}
                  >
                    <PiMapPin className="gba:w-4 gba:h-4 gba:mr-1" />
                    View Matrix
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {travelRegionSets.length === 0 && (
        <div className="gba:text-center gba:py-12">
          <PiMapPin className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
          <h4 className="gba:text-lg gba:font-medium gba:text-gray-600 gba:mb-2">
            No Travel Region Sets Found
          </h4>
          <p className="gba:text-gray-500 gba:mb-4">
            Create your first travel region set to start organizing your travel allowance rules.
          </p>
          <Button variant="default" onClick={handleCreateTravelRegionSet}>
            <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
            Create Travel Region Set
          </Button>
        </div>
      )}

      {/* Travel Region Set Creation Form */}
      <TravelRegionSetForm
        accessToken={accessToken}
        open={isCreateFormVisible}
        onClose={handleCreateFormClose}
        onSave={handleCreateFormSave}
        prefixDataTestId={`${prefixDataTestId}-create-travel-region-set`}
      />
    </div>
  );
};

export default TravelRegionSetCardView;
