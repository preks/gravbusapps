import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Typography, Card, Descriptions, Tag, Alert, Spin, Button } from 'antd';
import { PiClock, PiCurrencyDollar, PiMapPin, PiUsers, PiArrowUpRight } from 'react-icons/pi';
import { EnhancedMileageRule } from '../../hooks/useMileageRulesIntegration';
import { 
  useGetCalculationRuleUsage,
  CalculationRuleUsage
} from '../../queries/MileageRuleQueries';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface MileageRuleDetailsProps extends BusinessAppContextProps {
  mileageRule: EnhancedMileageRule;
  onNavigateToCalculationRule?: (ruleId: string, page?: string) => void;
}

const MileageRuleDetails: React.FC<MileageRuleDetailsProps> = ({
  mileageRule,
  onNavigateToCalculationRule,
  ...context
}) => {
  const [calculationRules, setCalculationRules] = useState<CalculationRuleUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { fetchCalculationRulesUsingMileageRule } = useGetCalculationRuleUsage(context);

  // Load calculation rules that use this mileage rule
  const loadCalculationRules = useCallback(async (pageNumber = 0, append = false) => {
    if (!mileageRule.code) return;

    if (pageNumber === 0) {
      setIsLoading(true);
      setCalculationRules([]);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const result = await fetchCalculationRulesUsingMileageRule(mileageRule.code);
      const newRules = result?.ExpenseRule || [];
      
      // For now, simulate pagination since the API doesn't support it yet
      const pageSize = 10;
      const start = pageNumber * pageSize;
      const end = start + pageSize;
      const paginatedRules = newRules.slice(start, end);
      
      if (append) {
        setCalculationRules(prev => [...prev, ...paginatedRules]);
      } else {
        setCalculationRules(paginatedRules);
      }
      
      setHasMore(end < newRules.length);
      setPage(pageNumber);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calculation rules';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [mileageRule.code, fetchCalculationRulesUsingMileageRule]);

  // Load more calculation rules
  const loadMoreCalculationRules = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadCalculationRules(page + 1, true);
    }
  }, [isLoadingMore, hasMore, page, loadCalculationRules]);

  // Scroll event handler for infinite scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadMoreCalculationRules();
    }
  }, [isLoadingMore, hasMore, loadMoreCalculationRules]);

  useEffect(() => {
    loadCalculationRules(0, false);
  }, [loadCalculationRules]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div 
      className="gba:space-y-6"
      data-testid="mileage-rule-details"
    >
      {/* Basic Information Card */}
      <Card>
        <Title level={4} className="gba:mb-4 gba:flex gba:items-center gba:gap-2">
          <PiCurrencyDollar className="gba:text-blue-600" />
          {getTranslationFromI18nKeyAndLabel('expense-settings:mileage_rule_information', 'Mileage Rule Information')}
        </Title>
        
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item 
            label={getTranslationFromI18nKeyAndLabel('expense-settings:rule_code', 'Rule Code')}
          >
            <Text code className="gba:font-mono">{mileageRule.code}</Text>
          </Descriptions.Item>
          
          <Descriptions.Item 
            label={getTranslationFromI18nKeyAndLabel('expense-settings:rule_name', 'Rule Name')}
          >
            <Text strong>{mileageRule.name}</Text>
          </Descriptions.Item>
          

          
          <Descriptions.Item 
            label={getTranslationFromI18nKeyAndLabel('expense-settings:status', 'Status')}
          >
            <Tag color={mileageRule.isActive ? 'green' : 'red'}>
              {mileageRule.isActive 
                ? getTranslationFromI18nKeyAndLabel('expense-settings:active', 'Active')
                : getTranslationFromI18nKeyAndLabel('expense-settings:inactive', 'Inactive')
              }
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item 
            label={getTranslationFromI18nKeyAndLabel('expense-settings:valid_period', 'Valid Period')}
            span={2}
          >
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiClock className="gba:text-gray-500" />
              <span>{mileageRule.validityPeriod}</span>
            </div>
          </Descriptions.Item>
          
          {mileageRule.rulePeriodLabel && (
            <Descriptions.Item 
              label={getTranslationFromI18nKeyAndLabel('expense-settings:rule_period', 'Rule Period')}
              span={2}
            >
              <Tag color="purple">{mileageRule.rulePeriodLabel}</Tag>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Rate Details Card */}
      {mileageRule.details && mileageRule.details.length > 0 && (
        <Card>
          <Title level={5} className="gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('expense-settings:rate_details', 'Rate Details')}
          </Title>
          
          <div className="gba:space-y-3">
            {[...mileageRule.details]
              .sort((a, b) => {
                // Sort by limitFrom, with undefined values at the end
                if (a.limitFrom === undefined && b.limitFrom === undefined) return 0;
                if (a.limitFrom === undefined) return 1;
                if (b.limitFrom === undefined) return -1;
                return a.limitFrom - b.limitFrom;
              })
              .map((detail, index) => (
              <div 
                key={detail.id}
                className="gba:p-3 gba:border gba:border-gray-200 gba:rounded-md gba:bg-gray-50"
              >
                <div className="gba:flex gba:justify-between gba:items-center">
                  <div>
                    {(detail.limitFrom !== undefined || detail.limitTo !== undefined) && (
                      <div className="gba:text-sm gba:text-gray-600 gba:font-medium">
                        {detail.limitFrom !== undefined && detail.limitTo !== undefined ? (
                          `${detail.limitFrom} - ${detail.limitTo} km`
                        ) : detail.limitFrom !== undefined ? (
                          `From ${detail.limitFrom} km`
                        ) : (
                          `Up to ${detail.limitTo} km`
                        )}
                      </div>
                    )}
                  </div>
                  <div className="gba:text-right">
                    <Text className="gba:text-lg gba:font-semibold gba:text-green-600">
                      {formatAmount(detail.amount)}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Used in Calculation Rules Card */}
      <Card>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <Title level={5} className="gba:mb-0 gba:flex gba:items-center gba:gap-2">
            <PiUsers className="gba:text-blue-600" />
            {getTranslationFromI18nKeyAndLabel('expense-settings:used_in_calculation_rules', 'Used in Calculation Rules')}
            <Tag color="blue">{calculationRules.length}</Tag>
          </Title>
          
          <Button 
            size="small" 
            onClick={() => loadCalculationRules(0, false)}
            loading={isLoading}
          >
            {getTranslationFromI18nKeyAndLabel('expense-settings:refresh', 'Refresh')}
          </Button>
        </div>

        {error && (
          <Alert
            message={getTranslationFromI18nKeyAndLabel('expense-settings:error_loading_calculation_rules', 'Error Loading Calculation Rules')}
            description={error}
            type="error"
            className="gba:mb-4"
            showIcon
          />
        )}

        {calculationRules.length === 0 && !isLoading ? (
          <Alert
            message={getTranslationFromI18nKeyAndLabel('expense-settings:no_calculation_rules_found', 'No Calculation Rules Found')}
            description={getTranslationFromI18nKeyAndLabel('expense-settings:mileage_rule_not_used', 'This mileage rule is not currently used in any calculation rules.')}
            type="info"
            showIcon
          />
        ) : (
          <div
            ref={scrollContainerRef}
            className="gba:max-h-96 gba:overflow-y-auto gba:space-y-3"
            data-testid="calculation-rules-container"
          >
            {isLoading && calculationRules.length === 0 ? (
              <div className="gba:flex gba:justify-center gba:py-8">
                <Spin size="large" />
              </div>
            ) : (
              <>
                {calculationRules.map((rule) => (
                  <Card
                    key={rule.id}
                    size="small"
                    className="gba:border gba:border-gray-200 gba:hover:border-blue-300 gba:transition-colors gba:cursor-pointer"
                    onClick={() => onNavigateToCalculationRule?.(rule.id, 'Mileage Rules')}
                    hoverable
                  >
                    <div className="gba:flex gba:justify-between gba:items-start">
                      <div className="gba:flex-1">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                          <Text code className="gba:font-mono gba:text-sm gba:bg-blue-50 gba:px-2 gba:py-1 gba:rounded">
                            {rule.code}
                          </Text>
                          <Tag color="blue" className="gba:text-xs">
                            {rule.calculationType?.value || 'N/A'}
                          </Tag>
                        </div>
                        
                        <div className="gba:mb-2">
                          <Text strong className="gba:text-base">
                            {rule.name || '-'}
                          </Text>
                        </div>
                        
                        <div className="gba:flex gba:flex-wrap gba:gap-4 gba:text-sm gba:text-gray-600">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <PiMapPin size={14} />
                            <span>{rule.country?.code || '-'}</span>
                          </div>
                          
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <PiCurrencyDollar size={14} />
                            <span>{rule.currency?.code || '-'}</span>
                          </div>
                          
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <PiClock size={14} />
                            <span>
                              {dayjs(rule.activeFrom).format('DD.MM.YYYY')} - 
                              {rule.activeTo ? dayjs(rule.activeTo).format('DD.MM.YYYY') : 'No end'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        type="text"
                        size="small"
                        icon={<PiArrowUpRight />}
                        className="gba:opacity-70 hover:gba:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToCalculationRule?.(rule.id, 'Mileage Rules');
                        }}
                        title={getTranslationFromI18nKeyAndLabel('expense-settings:view_calculation_rule', 'View Calculation Rule')}
                      />
                    </div>
                  </Card>
                ))}
                
                {isLoadingMore && (
                  <div className="gba:flex gba:justify-center gba:py-4">
                    <Spin />
                  </div>
                )}
                
                {!hasMore && calculationRules.length > 0 && (
                  <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel('expense-settings:no_more_calculation_rules', 'No more calculation rules to load')}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MileageRuleDetails; 