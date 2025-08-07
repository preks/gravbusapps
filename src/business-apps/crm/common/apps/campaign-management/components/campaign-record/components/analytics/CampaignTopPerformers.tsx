import React from 'react';
import { TrophyOutlined, UserOutlined, DollarOutlined, StarOutlined } from '@ant-design/icons';
import { Alert } from '@newwork/nw-design-system';

interface TopPerformer {
  employeeId: string;
  employeeName: string;
  entitiesCount: number;
  revenue: number;
}

interface CampaignTopPerformersProps {
  performers: TopPerformer[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const CampaignTopPerformers: React.FC<CampaignTopPerformersProps> = ({
  performers,
  isLoading = false,
  error = null,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className="gba:p-8 gba:text-center" data-testid="top-performers-loading">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:mx-auto gba:mb-4" 
             style={{ borderColor: 'var(--color-primary-500)' }}>
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading top performers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        title="Error Loading Top Performers"
        description={error}
        action={
          onRetry && (
            <button 
              onClick={onRetry}
              className="gba:px-3 gba:py-1 gba:text-sm gba:rounded"
              style={{ 
                backgroundColor: 'var(--color-primary-500)', 
                color: 'var(--color-on-primary)' 
              }}
              data-testid="top-performers-retry-button"
            >
              Retry
            </button>
          )
        }
        data-testid="top-performers-error-alert"
      />
    );
  }

  // Format currency values
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Get rank colors
  const getRankColor = (index: number): string => {
    switch (index) {
      case 0: return 'var(--color-warning-500)'; // Gold
      case 1: return '#C0C0C0'; // Silver
      case 2: return '#CD7F32'; // Bronze
      default: return 'var(--color-primary-500)';
    }
  };

  // Get rank icon
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <TrophyOutlined style={{ color: getRankColor(index) }} />;
      case 1: return <TrophyOutlined style={{ color: getRankColor(index) }} />;
      case 2: return <TrophyOutlined style={{ color: getRankColor(index) }} />;
      default: return <StarOutlined style={{ color: getRankColor(index) }} />;
    }
  };

  if (!performers || performers.length === 0) {
    return (
      <div className="gba:space-y-6" data-testid="campaign-top-performers-container">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Top Performers
          </h3>
          <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Team members contributing to this campaign
          </p>
        </div>
        
        <div 
          className="gba:p-8 gba:text-center" 
          style={{ backgroundColor: 'var(--color-surface-secondary)', borderRadius: 'var(--border-radius-md)' }}
        >
          <UserOutlined className="gba:text-3xl gba:mb-4" style={{ color: 'var(--color-text-secondary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No performance data available yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:space-y-6" data-testid="campaign-top-performers-container">
      {/* Header */}
      <div>
        <h3 className="gba:text-lg gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Top Performers
        </h3>
        <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Team members ranked by entities managed and revenue generated
        </p>
      </div>

      {/* Performers List */}
      <div className="gba:space-y-4">
        {performers.map((performer, index) => (
          <div
            key={performer.employeeId}
            className="gba:p-4 gba:rounded-lg gba:border gba:transition-all gba:duration-200 gba:hover:shadow-md"
            style={{ 
              backgroundColor: 'var(--color-surface-primary)',
              borderColor: index < 3 ? getRankColor(index) : 'var(--color-border-default)',
              borderWidth: index < 3 ? '2px' : '1px'
            }}
            data-testid={`top-performer-${index}`}
          >
            <div className="gba:flex gba:items-center gba:justify-between">
              {/* Left Side - Rank and Name */}
              <div className="gba:flex gba:items-center gba:gap-4">
                <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full"
                     style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                  {getRankIcon(index)}
                </div>
                
                <div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <h4 className="gba:text-md gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {performer.employeeName}
                    </h4>
                    <span 
                      className="gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:font-medium"
                      style={{ 
                        backgroundColor: index < 3 ? getRankColor(index) : 'var(--color-surface-secondary)',
                        color: index < 3 ? 'white' : 'var(--color-text-primary)'
                      }}
                    >
                      #{index + 1}
                    </span>
                  </div>
                  <p className="gba:text-sm gba:mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Employee ID: {performer.employeeId.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Right Side - Metrics */}
              <div className="gba:flex gba:items-center gba:gap-6">
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <UserOutlined />
                    <span>Entities</span>
                  </div>
                  <div className="gba:text-lg gba:font-bold gba:mt-1" style={{ color: 'var(--color-text-primary)' }}>
                    {performer.entitiesCount}
                  </div>
                </div>
                
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <DollarOutlined />
                    <span>Revenue</span>
                  </div>
                  <div className="gba:text-lg gba:font-bold gba:mt-1" style={{ color: 'var(--color-success-500)' }}>
                    {formatCurrency(performer.revenue)}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Bar */}
            <div className="gba:mt-4">
              <div className="gba:flex gba:justify-between gba:text-xs gba:mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Performance Score</span>
                <span>{((performer.entitiesCount * 10) + (performer.revenue / 1000)).toFixed(0)}</span>
              </div>
              <div 
                className="gba:w-full gba:h-2 gba:rounded-full"
                style={{ backgroundColor: 'var(--color-surface-secondary)' }}
              >
                <div
                  className="gba:h-2 gba:rounded-full gba:transition-all gba:duration-300"
                  style={{
                    backgroundColor: getRankColor(index),
                    width: `${Math.min(100, ((performer.entitiesCount * 10) + (performer.revenue / 1000)) / 100 * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
        <div 
          className="gba:p-4 gba:text-center" 
          style={{ 
            backgroundColor: 'var(--color-surface-secondary)', 
            borderRadius: 'var(--border-radius-md)' 
          }}
        >
          <div className="gba:text-2xl gba:font-bold gba:mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {performers.length}
          </div>
          <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Active Contributors
          </p>
        </div>
        
        <div 
          className="gba:p-4 gba:text-center" 
          style={{ 
            backgroundColor: 'var(--color-surface-secondary)', 
            borderRadius: 'var(--border-radius-md)' 
          }}
        >
          <div className="gba:text-2xl gba:font-bold gba:mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {performers.reduce((sum, p) => sum + p.entitiesCount, 0)}
          </div>
          <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Total Entities Managed
          </p>
        </div>
        
        <div 
          className="gba:p-4 gba:text-center" 
          style={{ 
            backgroundColor: 'var(--color-surface-secondary)', 
            borderRadius: 'var(--border-radius-md)' 
          }}
        >
          <div className="gba:text-2xl gba:font-bold gba:mb-1" style={{ color: 'var(--color-success-500)' }}>
            {formatCurrency(performers.reduce((sum, p) => sum + p.revenue, 0))}
          </div>
          <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Total Revenue Generated
          </p>
        </div>
      </div>

      {/* Insights */}
      {performers.length > 0 && (
        <div 
          className="gba:p-4" 
          style={{ 
            backgroundColor: 'var(--color-surface-secondary)', 
            borderRadius: 'var(--border-radius-md)' 
          }}
        >
          <h4 className="gba:text-sm gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Team Insights
          </h4>
          <ul className="gba:space-y-1 gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <li>• Top performer: {performers[0]?.employeeName} with {performers[0]?.entitiesCount} entities</li>
            <li>• Highest revenue generator: {
              performers.sort((a, b) => b.revenue - a.revenue)[0]?.employeeName
            } ({formatCurrency(performers.sort((a, b) => b.revenue - a.revenue)[0]?.revenue || 0)})</li>
            <li>• Average entities per person: {Math.round(performers.reduce((sum, p) => sum + p.entitiesCount, 0) / performers.length)}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CampaignTopPerformers;
