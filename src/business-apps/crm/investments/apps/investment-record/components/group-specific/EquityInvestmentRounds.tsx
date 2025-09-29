import React, { useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button
} from '@newwork/nw-design-system';
import { TrendingUp, Calendar, DollarSign, Percent, Plus } from 'lucide-react';
import { AppAction } from '@/components/app-action/AppAction';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatCurrencyString, extractCurrencyCode, formatPercentage } from '@/common/utils/numberFormatter';
import type { BaseEquityInvestmentRound } from '@/common/data/investment';

interface EquityInvestmentRoundsProps extends BusinessAppContextProps {
  equityData?: {
    investment?: any;
    equityInvestment?: any;
    documents?: any[];
  } | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  'data-testid'?: string;
}

const EquityInvestmentRounds: React.FC<EquityInvestmentRoundsProps> = ({
  equityData,
  isLoading,
  accessToken,
  onRefresh,
  'data-testid': dataTestId = 'investment-rounds'
}) => {
  // Helper function to format currency using centralized utilities
  const formatCurrency = (amount: number | null, currency?: { value?: string; code?: string; id?: string } | null): string => {
    if (!amount && amount !== 0) return getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A');
    
    // Extract currency code using centralized utility
    const currencyCode = extractCurrencyCode(currency?.id || currency?.code || currency?.value);
    
    return formatCurrencyString(amount, {
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Helper function to format year from timestamp
  const formatYear = (yearTimestamp: string | null): string => {
    if (!yearTimestamp) return getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A');
    try {
      // Extract year from timestamp format (e.g., "2025-01-01T00:00:00.000Z" -> "2025")
      return new Date(yearTimestamp).getFullYear().toString();
    } catch (error) {
      return yearTimestamp; // Fallback to original value if parsing fails
    }
  };

  // Get equity investment ID for action button context (this is what the form needs, not the main investment ID)
  const equityInvestmentId = equityData?.equityInvestment?.id;
  const mainInvestmentId = equityData?.investment?.id;
  
  // For the form, we need to pass the equity investment ID specifically
  const actionContextId = equityInvestmentId;
  

  // Get investment rounds from equity data
  // Note: The equityInvestmentRound property exists in the GraphQL response but isn't in the TypeScript interface
  const investmentRounds = (equityData?.equityInvestment as any)?.equityInvestmentRound as BaseEquityInvestmentRound[] || [];
  
  // Investment rounds loaded

  // Listen for process completion events and refresh data when equity round processes complete
  useProcessCompletion({
    onSuccess: () => {
      // Process completed successfully, refreshing data
      if (onRefresh) {
        onRefresh();
      }
    },
    onFailure: () => {
      // Process failed, but still refreshing data to check for changes
      // Even on failure, refresh to check if the delete actually succeeded
      if (onRefresh) {
        onRefresh();
      }
    },
  });

  // Fallback: also listen for 'continue' events from AppActionForm to trigger a refresh
  useEffect(() => {
    const handleContinue = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<any>;
        const payload = customEvent?.detail?.payload;
        const round = payload?.equityInvestmentRound;
        if (!round) return;

        // If the payload contains our entity, refresh
        // This handles create, update, and delete operations
        if (!equityInvestmentId || round.equityInvestment === equityInvestmentId || round.id) {
          if (onRefresh) {
            onRefresh();
          }
        }
      } catch (err) {
        // no-op
      }
    };

    window.addEventListener('com.newwork.process.continue', handleContinue);
    return () => window.removeEventListener('com.newwork.process.continue', handleContinue);
  }, [onRefresh, equityInvestmentId]);

  if (isLoading) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrendingUp className="gba:h-5 gba:w-5" />
            Investment Rounds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            <div className="gba:space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="gba:h-12 gba:bg-gray-200 gba:rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrendingUp className="gba:h-5 gba:w-5" style={{ color: 'var(--nw-color-primary-500)' }} />
            {getTranslationFromI18nKeyAndLabel('investment.rounds.investmentRounds', 'Investment Rounds')}
            <Badge variant="outline" className="gba:ml-2">
{investmentRounds.length} {getTranslationFromI18nKeyAndLabel('investment.rounds.rounds', 'rounds')}
            </Badge>
          </CardTitle>
          {accessToken && actionContextId ? (
            <AppAction
              contextsArray={[FlowContextName.investmentEquityInvestmentRoundCreate]}
              externalContextData={{ 
                equityInvestmentId: actionContextId,
                targetEquityInvestmentId: actionContextId,
                customEquityId: actionContextId,
                investmentId: mainInvestmentId,
                mainInvestmentId: mainInvestmentId,
                // Ensure we pass the ID in multiple formats the process might expect
                entityId: actionContextId,
                parentEntityId: actionContextId,
                equityInvestment: actionContextId
              }}
              accessToken={accessToken}
              emptyStateBehavior="enable"
              prefixDataTestId="equity-round-add"
            >
              <Button
                variant="default"
                size="default"
                className="gba:flex gba:items-center gba:gap-2"
                data-testid="equity-round-add-button"
              >
                <Plus className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('investment.rounds.addRound', 'Add Round')}
              </Button>
            </AppAction>
          ) : (
            <div data-testid="equity-round-add-button-disabled" className="gba:opacity-50 gba:cursor-not-allowed">
              <Button
                disabled
                variant="outline"
                size="default"
                className="gba:flex gba:items-center gba:gap-2"
              >
                <Plus className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('investment.rounds.addRound', 'Add Round')}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto">
          <Table data-testid={`${dataTestId}-table`}>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.actions', 'ACTIONS')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-left gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.name', 'Name')}
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                      <Calendar className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.year', 'Year')}
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                      <DollarSign className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.preValue', 'Pre Value')}
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-right gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
                      <DollarSign className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.investmentVolume', 'Investment Volume')}
                    </div>
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-gray-700 gba:text-center gba:py-3 gba:px-4">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                      <Percent className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('investment.rounds.sharePercentage', 'Share Percentage')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentRounds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="gba:text-center gba:py-12 gba:text-gray-500">
                      <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                        <TrendingUp className="gba:h-12 gba:w-12 gba:text-gray-300" />
                        <p className="gba:text-lg gba:font-medium">{getTranslationFromI18nKeyAndLabel('investment.rounds.noInvestmentRounds', 'No Investment Rounds')}</p>
                        <p className="gba:text-sm">{getTranslationFromI18nKeyAndLabel('investment.rounds.noRoundsMessage', 'No investment rounds have been recorded for this equity investment.')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  investmentRounds.map((round: BaseEquityInvestmentRound, index: number) => (
                  <TableRow 
                    key={round.id || index} 
                    className="gba:border-b gba:hover:bg-gray-50"
                    data-testid={`${dataTestId}-row-${index}`}
                  >
                    <TableCell className="gba:py-4 gba:px-6">
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        {/* Combined Update & Delete Actions */}
                        <AppActionButton
                          data-testid={`equity-round-actions-button-${round.id || index}`}
                          size="icon"
                          contextsArray={[
                            FlowContextName.investmentEquityInvestmentRoundUpdate,
                            FlowContextName.investmentEquityInvestmentRoundDelete
                          ]}
                          externalContextData={{ 
                            // Primary ID for the round
                            equityInvestmentRoundId: round.id,
                            entityId: round.id,
                            // Parent context
                            equityInvestmentId: actionContextId,
                            investmentId: actionContextId,
                            // Additional context for flow system
                            targetEntityId: round.id,
                            targetEntityType: 'equityInvestmentRound',
                            // Pass round data for both update and delete
                            roundName: round.name,
                            roundYear: round.year,
                            roundData: round
                          }}
                          prefixDataTestId="equity-round-actions"
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                          onDropdownOpen={() => {
                            // Combined actions dropdown opened
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4">
                      <div className="gba:font-medium gba:text-gray-900">
{round.name || `${getTranslationFromI18nKeyAndLabel('investment.rounds.round', 'Round')} ${index + 1}`}
                      </div>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <span className="gba:font-medium gba:text-gray-900">
                        {formatYear(round.year || null)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <span className="gba:font-medium gba:text-gray-900">
                        {formatCurrency(round.preValue ?? null, round.currency || null)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-right">
                      <span className="gba:font-medium gba:text-gray-900">
                        {formatCurrency(round.investmentVolume ?? null, round.currency || null)}
                      </span>
                    </TableCell>
                    <TableCell className="gba:py-3 gba:px-4 gba:text-center">
                      <Badge variant="secondary" className="gba:font-medium">
                        {round.roundSharePercentage !== null && round.roundSharePercentage !== undefined 
                          ? formatPercentage(round.roundSharePercentage, 1)
                          : getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquityInvestmentRounds;
