import React, { useState, useEffect, useCallback } from 'react';
import { Table, Spin, Alert, Button, Tag, Tooltip, Typography, Space, Card } from 'antd';
import { PiArrowLeft, PiPlus, PiCurrencyDollar, PiMapPin } from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface TravelRegion {
  id: string;
  code: string;
  value: string;
  description?: string;
}

interface AllowanceRegionRule {
  id: string;
  code: string;
  name: string;
  activeFrom: string;
  activeTo?: string;
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

interface MatrixCell {
  travelRegionId: string;
  allowanceRegionRuleId: string;
  details: AllowanceRegionRuleDetail[];
}

interface TravelRegionMatrixViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  travelRegionSetId: string;
  travelRegionSetName: string;
  onBack: () => void;
}

const TravelRegionMatrixView: React.FC<TravelRegionMatrixViewProps> = ({
  accessToken,
  prefixDataTestId = '',
  travelRegionSetId,
  travelRegionSetName,
  onBack,
  ...context
}) => {
  const [travelRegions, setTravelRegions] = useState<TravelRegion[]>([]);
  const [allowanceRegionRules, setAllowanceRegionRules] = useState<AllowanceRegionRule[]>([]);
  const [matrixData, setMatrixData] = useState<MatrixCell[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(accessToken);
  const graphqlClient = useGraphQLClient(accessToken);

  const loadTravelRegions = useCallback(async () => {
    try {
      // Get ONLY travel regions that belong to this travel region set
      // No fallback - if no parent relationship exists, show empty matrix
      const query = `
        query GetTravelRegionsByParent($parentId: String!) {
          CatalogEntry(
            where: {
              parentEntryId: { _eq: $parentId },
              isDeleted: { _eq: false }
            }
            orderBy: { code: ASC }
          ) {
            id
            code
            value
            description
            parentEntryId
          }
        }
      `;

      const result = await graphqlClient.request<{ CatalogEntry: any[] }>(
        query,
        { parentId: travelRegionSetId }
      );
      
      const regions: TravelRegion[] = result.CatalogEntry.map((item: any) => ({
        id: item.id,
        code: item.code,
        value: item.value,
        description: item.description
      }));
      
      console.log(`Loaded ${regions.length} travel regions assigned to set ${travelRegionSetId}:`, regions);
      
      if (regions.length === 0) {
        console.info(`No travel regions are assigned to travel region set ${travelRegionSetId}. Matrix will be empty.`);
      }
      
      setTravelRegions(regions);
      return regions;
    } catch (err) {
      console.error('Error loading travel regions:', err);
      throw err;
    }
  }, [graphqlClient, travelRegionSetId]);

  const loadAllowanceRegionRules = useCallback(async () => {
    try {
      // Query for rules associated with the travel region set
      const query = `
        query GetAllowanceRegionRulesWithTravelRegionSet($travelRegionSetId: String!) {
          AllowanceRegionRule(
            where: { 
              isDeleted: { _eq: false },
              travelRegionSetRef: { _eq: $travelRegionSetId }
            }
            orderBy: { code: ASC }
          ) {
            id
            code
            name
            activeFrom
            activeTo
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
        details: rule.allowanceRegionRuleDetail.map((detail: any) => ({
          ...detail,
          // Extract travel region info from the reference string
          travelRegion: detail.travelRegionRef ? {
            id: detail.travelRegionRef,
            code: detail.travelRegionRef.split(':')[2] || '', // Extract code from "TravelRegion:v1:CODE"
            value: detail.travelRegionRef.split(':')[2] || '' // We'll enhance this with actual catalog data
          } : null
        }))
      }));
      
      setAllowanceRegionRules(rules);
      return rules;
    } catch (err) {
      console.error('Error loading allowance region rules:', err);
      throw err;
    }
  }, [graphqlClient, travelRegionSetId]);

  const calculateMatrix = useCallback((regions: TravelRegion[], rules: AllowanceRegionRule[]) => {
    const matrix: MatrixCell[][] = [];
    
    regions.forEach((region, rowIndex) => {
      matrix[rowIndex] = [];
      rules.forEach((rule, colIndex) => {
        // Match travel region by creating the expected reference format
        const expectedTravelRegionRef = `TravelRegion:v1:${region.code}`;
        const matchingDetails = rule.details.filter(
          detail => detail.travelRegionRef === expectedTravelRegionRef
        );
        
        matrix[rowIndex][colIndex] = {
          travelRegionId: region.id,
          allowanceRegionRuleId: rule.id,
          details: matchingDetails
        };
      });
    });
    
    setMatrixData(matrix);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [regions, rules] = await Promise.all([
        loadTravelRegions(),
        loadAllowanceRegionRules()
      ]);
      
      calculateMatrix(regions, rules);
    } catch (err) {
      console.error('Error loading matrix data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load matrix data');
    } finally {
      setIsLoading(false);
    }
  }, [loadTravelRegions, loadAllowanceRegionRules, calculateMatrix]);

  useEffect(() => {
    if (accessToken && travelRegionSetId) {
      loadData();
    }
  }, [accessToken, travelRegionSetId, loadData]);

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const formatCurrency = (amount: number, currencyCode?: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const renderMatrixCell = (cell: MatrixCell, travelRegion: TravelRegion, allowanceRule: AllowanceRegionRule) => {
    if (cell.details.length === 0) {
      return (
        <div className="gba:p-2 gba:text-center gba:text-gray-400">
          <Button
            type="dashed"
            size="small"
            icon={<PiPlus />}
            className="gba:text-xs"
            data-testid={`${prefixDataTestId}-add-detail-${travelRegion.id}-${allowanceRule.id}`}
          >
            Add
          </Button>
        </div>
      );
    }

    return (
      <div className="gba:p-2 gba:space-y-1">
        {cell.details.map((detail, index) => (
          <Tooltip
            key={detail.id}
            title={
              <div>
                <div><strong>Amount:</strong> {formatCurrency(detail.amount, detail.currency?.code)}</div>
                <div><strong>Valid:</strong> {formatDate(detail.activeFrom)} - {detail.activeTo ? formatDate(detail.activeTo) : '∞'}</div>
                {detail.country && <div><strong>Country:</strong> {detail.country.value}</div>}
              </div>
            }
          >
            <Tag
              color="blue"
              className="gba:cursor-pointer gba:mb-1 gba:text-xs"
              data-testid={`${prefixDataTestId}-detail-tag-${detail.id}`}
            >
              <PiCurrencyDollar className="gba:mr-1" />
              {formatCurrency(detail.amount, detail.currency?.code)}
            </Tag>
          </Tooltip>
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: 'Travel Region',
      dataIndex: 'region',
      key: 'region',
      width: 200,
      fixed: 'left' as const,
      render: (region: TravelRegion) => (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiMapPin className="gba:text-blue-600" />
          <div>
            <Text strong>{region.value}</Text>
            <br />
            <Text type="secondary" className="gba:text-xs">
              {region.code}
            </Text>
          </div>
        </div>
      )
    },
    ...allowanceRegionRules.map((rule, colIndex) => ({
      title: (
        <div className="gba:text-center">
          <Text strong className="gba:block">{rule.name}</Text>
          <Text type="secondary" className="gba:text-xs">{rule.code}</Text>
          <br />
          <Text type="secondary" className="gba:text-xs">
            {formatDate(rule.activeFrom)} - {rule.activeTo ? formatDate(rule.activeTo) : '∞'}
          </Text>
        </div>
      ),
      key: `rule-${rule.id}`,
      width: 180,
      render: (_: any, record: any, rowIndex: number) => {
        const cell = matrixData[rowIndex]?.[colIndex];
        return cell ? renderMatrixCell(cell, record.region, rule) : null;
      }
    }))
  ];

  const dataSource = travelRegions.map((region) => ({
    key: region.id,
    region
  }));

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
        message="Error Loading Matrix Data"
        description={error}
        type="error"
        showIcon
        action={<Button size="small" onClick={loadData}>Retry</Button>}
      />
    );
  }

  return (
    <div 
      data-testid={`${prefixDataTestId}-travel-region-matrix-view`}
      className="gba:p-6"
    >
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <Button
            type="text"
            icon={<PiArrowLeft />}
            onClick={onBack}
            data-testid={`${prefixDataTestId}-back-button`}
          >
            Back to Travel Region Sets
          </Button>
        </div>
        
        <Card className="gba:mb-6">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <Title level={3} className="gba:mb-2">
                {travelRegionSetName}
              </Title>
              <Text type="secondary">
                Travel Region Matrix - {travelRegions.length} regions × {allowanceRegionRules.length} rules
              </Text>
            </div>
            <Space>
              <Button type="primary" icon={<PiPlus />}>
                Add Region
              </Button>
              <Button type="primary" icon={<PiPlus />}>
                Add Rule
              </Button>
            </Space>
          </div>
        </Card>
      </div>

      <div className="gba:overflow-auto">
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 'max-content', y: 600 }}
          size="small"
          bordered
          data-testid={`${prefixDataTestId}-matrix-table`}
        />
      </div>

      {travelRegions.length === 0 && (
        <div className="gba:text-center gba:py-12">
          <PiMapPin className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
          <Title level={4} type="secondary">
            No Travel Regions Assigned to This Set
          </Title>
          <Text type="secondary">
            This travel region set has no travel regions assigned to it yet.
            <br />
            Assign travel regions to this set in the catalog management to build the matrix.
          </Text>
          <div className="gba:mt-4">
            <Text type="secondary" className="gba:text-sm gba:italic">
              Note: Travel regions must have their parentEntryId set to "{travelRegionSetId}" in the catalog.
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelRegionMatrixView;
