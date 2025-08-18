import React from 'react';
import { TrophyOutlined, UserOutlined, DollarOutlined, ContactsOutlined, BankOutlined } from '@ant-design/icons';
import { Alert, AlertDescription, Button } from '@newwork/nw-design-system';

interface TopPerformer {
  employeeId: string;
  employeeName: string;
  leads: { total: number; converted: number };
  opportunities: { total: number; won: number };
  contacts: { total: number };
  accounts: { total: number };
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
      <div 
        className="gba:p-6 gba:rounded-lg gba:shadow-md" 
        style={{ backgroundColor: '#ffffff' }}
        data-testid="top-performers-error-container"
      >
        <Alert variant="destructive" data-testid="top-performers-error-alert">
          <AlertDescription>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:font-semibold gba:mb-1">Error Loading Top Performers</div>
                <div>{error}</div>
              </div>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  data-testid="top-performers-retry-button"
                >
                  Retry
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
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

  // Calculate percentage safely
  const getPercentage = (converted: number, total: number): number => {
    return total > 0 ? Math.round((converted / total) * 100) : 0;
  };

  if (!performers || performers.length === 0) {
    return (
      <div className="gba:space-y-6" data-testid="campaign-top-performers-container">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Top Performers
          </h3>
          <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Top 5 employees ranked by won revenue
          </p>
        </div>
        
        <div 
          className="gba:p-8 gba:text-center gba:rounded-lg" 
          style={{ backgroundColor: 'var(--color-surface-secondary)' }}
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
          Top 5 employees ranked by won revenue
        </p>
      </div>

      {/* Performers List */}
      <div className="gba:space-y-3">
        {performers.map((performer, index) => (
          <div
            key={performer.employeeId}
            className="gba:p-4 gba:rounded-lg gba:border gba:border-gray-200"
            style={{ 
              backgroundColor: '#fff',
              boxShadow: 'var(--shadow-md)',
            }}
            data-testid={`top-performer-${index}`}
          >
            <div className="gba:flex gba:items-center gba:justify-between">
              {/* Left Side - Employee Info */}
              <div className="gba:flex gba:items-center gba:gap-3">
                {index === 0 && (
                  <TrophyOutlined 
                    className="gba:text-lg" 
                    style={{ color: 'var(--color-warning-500)' }} 
                    data-testid="first-place-trophy"
                  />
                )}
                <div>
                  <h4 className="gba:text-sm gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {performer.employeeName}
                  </h4>
                  <span 
                    className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:font-medium"
                    style={{ 
                      backgroundColor: 'var(--color-surface-secondary)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    #{index + 1}
                  </span>
                </div>
              </div>

              {/* Right Side - Entity Breakdown */}
              <div className="gba:flex gba:items-center gba:gap-6">
                {/* Leads */}
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                    <UserOutlined className="gba:text-xs" style={{ color: 'var(--color-primary-500)' }} />
                    <span className="gba:text-xs gba:font-medium" style={{ color: 'var(--color-text-secondary)' }}>Leads</span>
                  </div>
                  <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {performer.leads.total}
                  </div>
                  <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {performer.leads.converted}/{performer.leads.total} ({getPercentage(performer.leads.converted, performer.leads.total)}%)
                  </div>
                </div>

                {/* Opportunities */}
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                    <DollarOutlined className="gba:text-xs" style={{ color: 'var(--color-success-500)' }} />
                    <span className="gba:text-xs gba:font-medium" style={{ color: 'var(--color-text-secondary)' }}>Opps</span>
                  </div>
                  <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {performer.opportunities.total}
                  </div>
                  <div className="gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {performer.opportunities.won}/{performer.opportunities.total} ({getPercentage(performer.opportunities.won, performer.opportunities.total)}%)
                  </div>
                </div>

                {/* Contacts */}
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                    <ContactsOutlined className="gba:text-xs" style={{ color: 'var(--color-warning-500)' }} />
                    <span className="gba:text-xs gba:font-medium" style={{ color: 'var(--color-text-secondary)' }}>Contacts</span>
                  </div>
                  <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {performer.contacts.total}
                  </div>
                </div>

                {/* Accounts */}
                <div className="gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
                    <BankOutlined className="gba:text-xs" style={{ color: 'var(--color-info-500)' }} />
                    <span className="gba:text-xs gba:font-medium" style={{ color: 'var(--color-text-secondary)' }}>Accounts</span>
                  </div>
                  <div className="gba:text-sm gba:font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {performer.accounts.total}
                  </div>
                </div>

                {/* Revenue */}
                <div className="gba:text-center gba:pl-4 gba:border-l" style={{ borderColor: 'var(--color-border-default)' }}>
                  <div className="gba:text-xs gba:mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Won Revenue
                  </div>
                  <div className="gba:text-lg gba:font-bold" style={{ color: 'var(--color-success-600)' }}>
                    {formatCurrency(performer.revenue)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignTopPerformers;
