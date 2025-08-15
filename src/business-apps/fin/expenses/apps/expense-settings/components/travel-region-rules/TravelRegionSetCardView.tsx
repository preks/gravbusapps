import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Spin, Alert, Button, Space, Typography } from 'antd';
import { PiPlus, PiMapPin, PiTable } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Title, Text } = Typography;

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
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Travel Region Sets"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadTravelRegionSets}>
            Retry
          </Button>
        }
      />
    );
  }

  const handleSetSelect = (set: TravelRegionSet) => {
    onSelectSet(set.id, set.value);
  };

  return (
    <div 
      data-testid={`${prefixDataTestId}-travel-region-sets-view`}
      className="gba:p-6"
    >
      <div className="gba:mb-6">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <Title level={3} className="gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('expense-settings:travel_region_sets', 'Travel Region Sets')}
            </Title>
            <Text type="secondary">
              {getTranslationFromI18nKeyAndLabel('expense-settings:travel_region_sets_description', 'Manage travel regions and their allowance rules')}
            </Text>
          </div>
          <Space>
            <Button
              type="default"
              icon={<PiTable />}
              onClick={onViewUnassigned}
              data-testid={`${prefixDataTestId}-view-unassigned-button`}
            >
              View Unassigned Rules
            </Button>
            <Button
              type="primary"
              icon={<PiPlus />}
              data-testid={`${prefixDataTestId}-add-travel-region-set-button`}
            >
              Add Travel Region Set
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {travelRegionSets.map((set) => (
          <Col key={set.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              className="gba:h-full"
              data-testid={`${prefixDataTestId}-travel-region-set-card-${set.id}`}
              onClick={() => handleSetSelect(set)}
              actions={[
                <div key="action" className="gba:flex gba:justify-center">
                  <Button
                    type="link"
                    icon={<PiMapPin />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetSelect(set);
                    }}
                  >
                    View Matrix
                  </Button>
                </div>
              ]}
            >
              <Card.Meta
                avatar={
                  <div className="gba:w-12 gba:h-12 gba:bg-blue-100 gba:rounded-full gba:flex gba:items-center gba:justify-center">
                    <PiMapPin className="gba:text-blue-600 gba:text-xl" />
                  </div>
                }
                title={
                  <div>
                    <Text strong>{set.value}</Text>
                    <br />
                    <Text type="secondary" className="gba:text-sm">
                      {set.code}
                    </Text>
                  </div>
                }
                description={
                  <div className="gba:mt-2">
                    {set.description && (
                      <Text className="gba:text-sm gba:mb-2 gba:block">
                        {set.description}
                      </Text>
                    )}
                    <Text type="secondary" className="gba:text-xs">
                      {set.childCount || 0} travel regions
                    </Text>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {travelRegionSets.length === 0 && (
        <div className="gba:text-center gba:py-12">
          <PiMapPin className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
          <Title level={4} type="secondary">
            No Travel Region Sets Found
          </Title>
          <Text type="secondary">
            Create your first travel region set to start organizing your travel allowance rules.
          </Text>
          <div className="gba:mt-4">
            <Button type="primary" icon={<PiPlus />}>
              Create Travel Region Set
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelRegionSetCardView;
