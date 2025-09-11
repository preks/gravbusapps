import React from 'react';
import { Card, CardContent, Badge } from '@newwork/nw-design-system';
import { 
  Building2,
  User,
  DollarSign,
  Percent,
  Calendar,
  Target,
  TrendingUp,
  Banknote
} from 'lucide-react';
import type { RealEstateInvestmentData } from '../hooks/useRealEstateRecordData';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { getStatusColor } from '@/common/data/investment';
import PlannedExitFlag from '../../shared/PlannedExitFlag';
import { AiSummaryButton } from '../../shared/AiSummaryButton';

export interface MezzanineLoansDetailsHeaderProps {
  realEstateData?: RealEstateInvestmentData | null;
  isLoading?: boolean;
  error?: string | null;
  context?: BusinessAppContextProps;
  investmentId?: string;
}

const MezzanineLoansDetailsHeader: React.FC<MezzanineLoansDetailsHeaderProps> = ({ 
  realEstateData, 
  isLoading, 
  error,
  context,
  investmentId
}) => {
  // Early return if loading or no data yet
  if (isLoading || !realEstateData) {
    return (
      <Card className="gba:mb-6">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-center">
              <p className="gba:text-gray-500">Loading investment details...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  // Helper function to format currency with GraphQL data
  const formatCurrencyValue = (amount: number | null, currency?: { code: string } | null): string => {
    if (!amount && amount !== 0) return 'N/A';
    const currencyCode = currency?.code || 'EUR';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format percentage
  const formatPercentageValue = (value: number | null): string => {
    if (!value && value !== 0) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  // Helper function to format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch {
      return 'N/A';
    }
  };

  // Use real data from GraphQL
  const investment = realEstateData?.investment;
  const companyName = investment?.investmentAccount?.name || '';
  
  // Core Details as specified in requirements for Mezzanine Loans
  const investmentType = investment?.investmentType?.value || '';
  
  // Loan Recipient - combine loan_recipient_investment_account_id and loan_recipient_name
  // Use loan_recipient_name if available, otherwise try to get name from investment account
  const loanRecipient = investment?.loanRecipientName || 
                       investment?.loanRecipientInvestmentAccount?.name || 
                       '';
  
  const loanAmount = investment ? formatCurrencyValue(investment.loanAmount ?? null, investment.currency) : 'N/A';
  const loanOpenCommitmentAmount = investment ? formatCurrencyValue(investment.loanOpenCommitmentAmount ?? null, investment.currency) : 'N/A';
  const loanInterestRate = investment ? formatPercentageValue(investment.loanInterestRate ?? null) : 'N/A';
  const loanStartDate = investment ? formatDate(investment.loanStartDate ?? null) : 'N/A';
  const loanEndDate = investment ? formatDate(investment.loanEndDate ?? null) : 'N/A';
  const loanInterestClaim = investment ? formatCurrencyValue(investment.loanInterestClaim ?? null, investment.currency) : 'N/A';
  const status = investment?.investmentStatus?.value || '';



  // Always render the header - no error handling

  return (
    <div className="gba:px-6 gba:pt-6 gba:pb-4">
      <Card className="gba:bg-white gba:border gba:shadow-sm">
        <CardContent className="gba:p-6">
          {/* Company Name and Investment Type */}
          <div className="gba:mb-6">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <div className="gba:flex gba:items-center gba:gap-3">
                <Building2 className="gba:h-6 gba:w-6 gba:text-indigo-600" />
                <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {companyName || investment?.name || 'Mezzanine Loans Investment Details'}
                </h1>
              </div>
              {/* AI Summary Button */}
              {context && investmentId && (
                <AiSummaryButton 
                  investmentId={investmentId} 
                  accessToken={context.accessToken} 
                />
              )}
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant="secondary" className="gba:text-sm">
                {investmentType || 'Mezzanine Loans'}
              </Badge>
              <Badge variant="outline" className="gba:text-sm">
                {status || 'Unknown'}
              </Badge>
              <PlannedExitFlag 
                plannedExit={investment?.planedExit} 
                plannedExitDate={investment?.plannedExitDate}
                variant="default"
                data-testid="mezzanine-record-planned-exit-flag"
              />
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
            {/* Loan Recipient - Combined from loan_recipient_investment_account_id and loan_recipient_name */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Loan Recipient</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {loanRecipient || '-'}
              </p>
            </div>

            {/* Loan Amount - nw_investment_relations.investment.loan_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Loan Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {loanAmount !== 'N/A' ? loanAmount : '-'}
              </p>
            </div>

            {/* Loan Open Commitment Amount - nw_investment_relations.investment.loan_open_commitment_amount */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Target className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Loan Open Commitment Amount</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {loanOpenCommitmentAmount !== 'N/A' ? loanOpenCommitmentAmount : '-'}
              </p>
            </div>

            {/* Loan Interest Rate - nw_investment_relations.investment.loan_interest_rate */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Percent className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Loan Interest Rate</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {loanInterestRate !== 'N/A' ? loanInterestRate : '-'}
              </p>
            </div>

            {/* Loan Start Date - nw_investment_relations.investment.loan_start_date */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Loan Start Date</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {loanStartDate !== 'N/A' ? loanStartDate : '-'}
              </p>
            </div>

            {/* Loan End Date - nw_investment_relations.investment.loan_end_date */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Loan End Date</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {loanEndDate !== 'N/A' ? loanEndDate : '-'}
              </p>
            </div>

            {/* Loan Interest Claim - nw_investment_relations.investment.loan_interest_claim */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Banknote className="gba:h-4 gba:w-4 gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Loan Interest Claim</span>
              </div>
              <p className="gba:text-lg gba:font-semibold gba:text-gray-900">
                {loanInterestClaim !== 'N/A' ? loanInterestClaim : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MezzanineLoansDetailsHeader;
