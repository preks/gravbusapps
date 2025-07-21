/**
 * Actual vs Planned Expense Card Component
 * Displays full year expense plan and request totals in EUR with comparison
 */

import React from 'react';
import { SectionKpiCards, KpiCardData, Spinner, Alert } from '@newwork/nw-design-system';
import { getExpenseIconColor } from '../../utils/colorConstants';
import { ExpensePlanYearly, YTDStats } from '../../types';

export interface ActualVsPlannedCardProps {
  loading: boolean;
  error: Error | null;
  ytdStats: YTDStats;
  expensePlanYearly: ExpensePlanYearly;
}

const ActualVsPlannedCard: React.FC<ActualVsPlannedCardProps> = ({ loading, error, ytdStats, expensePlanYearly }) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const currentYear = new Date().getFullYear();

  const calculateDifference = () => {
    const actualAmount = ytdStats.totalAmount;
    const plannedAmount = expensePlanYearly.totalAmount;
    const difference = actualAmount - plannedAmount;

    let percentDifference = 0;
    if (plannedAmount > 0) {
      percentDifference = (difference / plannedAmount) * 100;
    } else if (actualAmount > 0) {
      percentDifference = 100;
    }

    return { difference, percentDifference, isOverBudget: difference > 0 };
  };

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-32" data-testid="actual-vs-planned-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid="actual-vs-planned-error">
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">Actual vs Planned</h4>
            <p className="gba:text-sm gba:mt-1">Error: {error.message}</p>
          </div>
        </Alert>
      </div>
    );
  }

  const { percentDifference, isOverBudget } = calculateDifference();
  const actualAmount = Number(ytdStats.totalAmount) || 0;
  const plannedAmount = Number(expensePlanYearly.totalAmount) || 0;

  // Create KPI card data
  const kpiCardData: KpiCardData = {
    id: 'actual-vs-planned',
    title: `Actual vs Planned ${currentYear}`,
    value: Math.abs(percentDifference).toFixed(1),
    suffix: '%',
    decimalPlaces: 1,
    footer: `Planned: ${formatCurrency(plannedAmount)} (${expensePlanYearly.count} plans) | Actual: ${formatCurrency(actualAmount)} (${ytdStats.count} expenses)`,
    trend: {
      value: Math.abs(percentDifference).toFixed(1),
      positive: !isOverBudget,
      description: isOverBudget ? 'over budget' : 'under budget'
    },
    icon: 'target',
          iconColor: getExpenseIconColor.actualVsPlanned(isOverBudget)
  };

  return (
    <div data-testid="actual-vs-planned-card">
      <SectionKpiCards 
        cards={[kpiCardData]} 
        data-testid="actual-vs-planned-kpi-cards"
      />
    </div>
  );
};

export default ActualVsPlannedCard;
