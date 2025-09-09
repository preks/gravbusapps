import React from 'react';
import { Card } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../../context/InvestmentFormContext';
import { getCatalogValue } from '@/common/utils/windowUtils';

const prefixDataTestId = 'InvestmentForm-GroupSelectSegment';

export interface GroupSelectSegmentProps {
  onGroupSelect: (group: string) => void;
  isLoading?: boolean;
}

const GroupSelectSegment: React.FC<GroupSelectSegmentProps> = ({
  onGroupSelect,
}) => {
  const {
    investmentCatalogData,
    investmentCatalogLoading,
    investmentCatalogError,
  } = useInvestmentFormContext();

  // Transform catalog data into display format
  const investmentGroups = investmentCatalogData?.investmentGroups?.map(group => {
    // Use the utility function to get the translated value
    const displayTitle = getCatalogValue(group);
    
    return {
      id: group.id,
      code: group.code,
      title: displayTitle || group.value || group.code, // Use translated value, fallback to value, then code
      value: `InvestmentGroup:v1:${group.code}`,
      description: `Investment opportunities in ${displayTitle || group.value}`,
    };
  }) || [];

  return (
    <div 
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      style={{ padding: 'var(--nw-spacing-lg)' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 'var(--nw-spacing-xl)' }}>
        <h2 style={{ 
          margin: 0, 
          marginBottom: 'var(--nw-spacing-sm)',
          color: 'var(--nw-color-text-primary)', 
          fontSize: '1.5rem', 
          fontWeight: 600 
        }}>
          Select Investment Group
        </h2>
        <p style={{ 
          margin: 0, 
          color: 'var(--nw-color-text-secondary)', 
          fontSize: '1rem' 
        }}>
          Choose the investment group you want to create
        </p>
      </div>

      {/* Loading State */}
      {investmentCatalogLoading && (
        <div style={{ textAlign: 'center', padding: 'var(--nw-spacing-xl)' }}>
          Loading investment groups...
        </div>
      )}

      {/* Error State */}
      {investmentCatalogError && (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--nw-spacing-xl)',
          color: 'var(--nw-color-danger-500)'
        }}>
          <p style={{ margin: 0, marginBottom: 'var(--nw-spacing-sm)' }}>Failed to load investment groups</p>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{investmentCatalogError}</p>
        </div>
      )}

      {!investmentCatalogLoading && !investmentCatalogError && (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--nw-spacing-lg)',
          marginBottom: 'var(--nw-spacing-lg)'
        }}>
          {investmentGroups.map((group) => (
            <Card
              key={group.id}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                border: '2px solid var(--nw-color-border-default)',
                boxShadow: 'var(--nw-shadow-sm)'
              }}
              className="hover:border-primary-500 hover:shadow-md"
              onClick={() => onGroupSelect(group.value)}
              data-testid={formatDataTestId(prefixDataTestId, `Group-${group.id}`)}
            >
              <div style={{
                padding: 'var(--nw-spacing-lg)',
                textAlign: 'left'
              }}>
                <h3 style={{
                  margin: 0,
                  marginBottom: 'var(--nw-spacing-sm)',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--nw-color-text-primary)'
                }}>
                  {group.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--nw-color-text-secondary)',
                  lineHeight: 1.5
                }}>
                  {group.description}
                </p>
              </div>
            </Card>
          ))}
          {investmentGroups.length === 0 && (
            <div style={{ 
              gridColumn: '1 / -1',
              textAlign: 'center', 
              padding: 'var(--nw-spacing-xl)',
              color: 'var(--nw-color-text-secondary)'
            }}>
              <p style={{ margin: 0 }}>No investment groups available</p>
            </div>
          )}
        </div>
      )}

      {!investmentCatalogLoading && !investmentCatalogError && investmentGroups.length > 0 && (
        <div style={{ 
          textAlign: 'center',
          padding: 'var(--nw-spacing-md)',
          backgroundColor: 'var(--nw-color-surface-secondary)',
          borderRadius: 'var(--nw-border-radius-md)',
          border: '1px solid var(--nw-color-border-default)'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            color: 'var(--nw-color-text-secondary)' 
          }}>
            You can modify investment details after selecting the group
          </p>
        </div>
      )}
    </div>
  );
};

export default GroupSelectSegment;
