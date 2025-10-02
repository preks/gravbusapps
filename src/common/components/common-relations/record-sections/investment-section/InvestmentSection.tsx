import React from 'react';
import { Spinner, Alert, Badge, IconAvatar, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import DynamicInvestmentFields from './DynamicInvestmentFields';
import { TrendUpIcon } from '@phosphor-icons/react';

interface InvestmentSectionProps {
  investmentData: any; // Generic prop that accepts both lead and opportunity data
  businessAppContext?: BusinessAppContextProps;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  // Optional configurable action props
  actionButtonProps?: {
    contextsArray?: FlowContextName[];
    externalContextData?: Record<string, any>;
    prefixDataTestId?: string;
  };
}

const InvestmentSection: React.FC<InvestmentSectionProps> = ({
  investmentData,
  businessAppContext,
  isLoading = false,
  error = null,
  className = '',
  actionButtonProps: _actionButtonProps
}) => {
  if (isLoading) {
    return (
      <div className={`gba:w-full ${className}`} data-testid="investment-section-loading">
        <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
          <Spinner size="sm" className="gba:mr-1" />
          <span className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('crm.common.loadingInvestment', 'Loading investment data...')}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`gba:w-full ${className}`} data-testid="investment-section-error">
        <Alert variant="destructive">
          <div>
            <strong>{getTranslationFromI18nKeyAndLabel('crm.common.error', 'Error')}</strong>
            <div>
              {getTranslationFromI18nKeyAndLabel('crm.investments.investment.loadError', 'Failed to load investment information')}: {error}
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`gba:w-full ${className}`} data-testid="investment-section">
      <div className="gba:flex gba:flex-col gba:gap-6">
        {/* Main Info Section */}
        <div className="gba:flex gba:flex-col gba:gap-3">
          <div className="gba:flex gba:gap-3 gba:items-center">
            <IconAvatar 
              icon={TrendUpIcon} 
              variant="default" 
              size="lg"
              title="Investment"
            />
            <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:gap-2.5 gba:items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 
                        className="gba:text-sm gba:font-semibold gba:text-gray-800 gba:truncate gba:flex-1"
                        data-testid="investment-name"
                      >
                        {investmentData?.investmentName || getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:max-w-xs gba:break-words">
                        {investmentData?.investmentName || getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Investment Role and Stake Type Badges */}
                {(() => {
                  const roleValue = investmentData?.investmentRole?.value || investmentData?.investmentRole?.code;
                  const stakeValue = investmentData?.investmentStakeType?.value || investmentData?.investmentStakeType?.code;
                  
                  const hasValidRole = roleValue && roleValue.trim() && !roleValue.toLowerCase().includes('not set');
                  const hasValidStake = stakeValue && stakeValue.trim() && !stakeValue.toLowerCase().includes('not set');
                  
                  if (!hasValidRole && !hasValidStake) {
                    return null;
                  }
                  
                  return (
                    <div className="gba:flex gba:gap-2">
                      {hasValidRole && (
                        <Badge variant="outline">
                          {roleValue}
                        </Badge>
                      )}
                      {hasValidStake && (
                        <Badge variant="outline">
                          {stakeValue}
                        </Badge>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Investment Group and Type - combined in single badge */}
              {(() => {
                const groupValue = investmentData?.investmentGroup?.value || investmentData?.investmentGroup?.code;
                const typeValue = investmentData?.investmentType?.value || investmentData?.investmentType?.code;
                const combinedValue = [groupValue, typeValue].filter(Boolean).join(' • ');
                
                if (combinedValue) {
                  return (
                    <Badge variant="ext1">
                      {combinedValue}
                    </Badge>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Dynamic Investment Fields */}
        <DynamicInvestmentFields investmentData={investmentData} businessAppContext={businessAppContext} />
      </div>
    </div>
  );
};

// Static properties for SectionWrapper
(InvestmentSection as any).sectionTitle = 'Investment Information';
(InvestmentSection as any).sectionActions = (props: InvestmentSectionProps) => {
  const { businessAppContext, actionButtonProps, investmentData } = props;
  
  if (!actionButtonProps) {
    return null;
  }

  return (
    <AppActionButton
      data-testid="investment-action-button"
      size="icon"
      contextsArray={actionButtonProps.contextsArray || [(() => {
        const code = (investmentData?.investmentType?.code || investmentData?.investmentGroup?.code || '').toUpperCase();
        if (code.includes('REAL_ESTATE')) return FlowContextName.realEstateInvestmentEntity;
        if (code.includes('LIQUID_FUND')) return FlowContextName.liquidFundInvestmentEntity;
        if (code.includes('EQUITY')) return FlowContextName.equityInvestmentEntity;
        return FlowContextName.investmentEntity;
      })()]}
      externalContextData={{
        investmentId: investmentData?.id || investmentData?.leadId || investmentData?.opportunityId,
        leadId: investmentData?.leadId,
        opportunityId: investmentData?.opportunityId,
        ...actionButtonProps.externalContextData
      }}
      prefixDataTestId={actionButtonProps.prefixDataTestId || "investment-section-action"}
      accessToken={businessAppContext?.accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
    />
  );
};

export default InvestmentSection;
