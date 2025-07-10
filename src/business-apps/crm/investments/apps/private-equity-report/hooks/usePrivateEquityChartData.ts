import { useMemo } from 'react';
import dayjs from 'dayjs';
import { EnhancedPrivateEquityInvestmentSummary } from './usePrivateEquityInvestmentIntegration';

export const usePrivateEquityChartData = (privateEquityInvestments: EnhancedPrivateEquityInvestmentSummary[]) => {
  return useMemo(() => {
    // Role distribution data
    const roleData = privateEquityInvestments.reduce((acc, pe) => {
      const role = pe.investmentRole?.value || 'Unknown';
      const existing = acc.find(item => item.name === role);
      if (existing) {
        existing.value += 1;
        existing.totalValue += pe.investment.marketValue || pe.investment.bookValue || 0;
      } else {
        acc.push({
          name: role,
          value: 1,
          totalValue: pe.investment.marketValue || pe.investment.bookValue || 0
        });
      }
      return acc;
    }, [] as any[]);

    // Status distribution data
    const statusData = privateEquityInvestments.reduce((acc, pe) => {
      const status = pe.investment.investmentStatus?.value || 'Unknown';
      const existing = acc.find(item => item.name === status);
      if (existing) {
        existing.value += 1;
        existing.totalValue += pe.investment.marketValue || pe.investment.bookValue || 0;
      } else {
        acc.push({
          name: status,
          value: 1,
          totalValue: pe.investment.marketValue || pe.investment.bookValue || 0
        });
      }
      return acc;
    }, [] as any[]);

    // Investment Timeline Data (acquisitions over time)
    const timelineData = privateEquityInvestments
      .filter(pe => pe.investment.acquisitionDate)
      .reduce((acc, pe) => {
        const date = dayjs(pe.investment.acquisitionDate).format('YYYY-MM');
        const existing = acc.find(item => item.month === date);
        if (existing) {
          existing.count += 1;
          existing.value += pe.investment.initialInvestmentAmount || 0;
          existing.currentValue += pe.investment.marketValue || pe.investment.bookValue || 0;
        } else {
          acc.push({
            month: date,
            count: 1,
            value: pe.investment.initialInvestmentAmount || 0,
            currentValue: pe.investment.marketValue || pe.investment.bookValue || 0,
            year: dayjs(pe.investment.acquisitionDate).year()
          });
        }
        return acc;
      }, [] as any[])
      .sort((a, b) => a.month.localeCompare(b.month));

    // Stake vs Value Analysis
    const stakeValueData = privateEquityInvestments
      .filter(pe => pe.investment.stakePercent && pe.investment.marketValue)
      .map(pe => ({
        name: pe.displayName,
        stake: pe.investment.stakePercent || 0,
        value: pe.investment.marketValue || 0,
        roi: pe.roi || 0,
        role: pe.investmentRole?.value || 'Unknown',
        status: pe.investment.investmentStatus?.value || 'Unknown'
      }));

    // Leverage Analysis Data
    const leverageData = privateEquityInvestments
      .filter(pe => 
        pe.investment.leverageRatio !== null && 
        pe.investment.leverageRatio !== undefined &&
        pe.investment.marketValue !== null &&
        pe.investment.marketValue !== undefined
      )
      .map(pe => ({
        name: pe.displayName,
        leverageRatio: pe.investment.leverageRatio || 0,
        marketValue: pe.investment.marketValue || 0,
        debtFinancing: pe.investment.debtFinancing || 0,
        roi: pe.roi || 0
      }));

    // Performance vs Risk Analysis
    const riskReturnData = privateEquityInvestments
      .filter(pe => pe.investment.investmentRiskLevel?.value && pe.roi !== undefined)
      .map(pe => ({
        name: pe.displayName,
        risk: pe.investment.investmentRiskLevel?.value || 'Unknown',
        roi: pe.roi || 0,
        value: pe.investment.marketValue || pe.investment.bookValue || 0,
        stake: pe.investment.stakePercent || 0
      }));

    // Phase progression analysis
    const phaseValueData = privateEquityInvestments.reduce((acc, pe) => {
      const phase = pe.investment.investmentPhase?.value || 'Unknown';
      const existing = acc.find(item => item.name === phase);
      if (existing) {
        existing.count += 1;
        existing.totalValue += pe.investment.marketValue || pe.investment.bookValue || 0;
        existing.avgROI = (existing.avgROI * (existing.count - 1) + (pe.roi || 0)) / existing.count;
        existing.avgStake = (existing.avgStake * (existing.count - 1) + (pe.investment.stakePercent || 0)) / existing.count;
      } else {
        acc.push({
          name: phase,
          count: 1,
          totalValue: pe.investment.marketValue || pe.investment.bookValue || 0,
          avgROI: pe.roi || 0,
          avgStake: pe.investment.stakePercent || 0
        });
      }
      return acc;
    }, [] as any[]);

    // Active period analysis
    const activePeriodData = privateEquityInvestments
      .filter(pe => pe.activeFrom && pe.investment.acquisitionDate)
      .map(pe => {
        const acquisitionDate = dayjs(pe.investment.acquisitionDate);
        const activeFromDate = dayjs(pe.activeFrom);
        const activeDays = activeFromDate.diff(acquisitionDate, 'days');
        
        return {
          name: pe.displayName,
          activeDays: Math.max(0, activeDays),
          value: pe.investment.marketValue || pe.investment.bookValue || 0,
          roi: pe.roi || 0,
          stake: pe.investment.stakePercent || 0
        };
      })
      .filter(item => item.activeDays > 0);

    // Investment concentration by account
    const accountConcentrationData = privateEquityInvestments.reduce((acc, pe) => {
      const accountName = pe.investment.account?.name || 'Unknown Account';
      const existing = acc.find(item => item.name === accountName);
      if (existing) {
        existing.count += 1;
        existing.totalValue += pe.investment.marketValue || pe.investment.bookValue || 0;
        existing.avgStake = (existing.avgStake * (existing.count - 1) + (pe.investment.stakePercent || 0)) / existing.count;
      } else {
        acc.push({
          name: accountName,
          count: 1,
          totalValue: pe.investment.marketValue || pe.investment.bookValue || 0,
          avgStake: pe.investment.stakePercent || 0
        });
      }
      return acc;
    }, [] as any[]);

    // Currency distribution data (enhanced)
    const currencyData = privateEquityInvestments.reduce((acc, pe) => {
      const currency = pe.currencyCode || 'EUR';
      const existing = acc.find(item => item.name === currency);
      if (existing) {
        existing.value += pe.investment.marketValue || pe.investment.bookValue || 0;
        existing.count += 1;
        existing.avgROI = (existing.avgROI * (existing.count - 1) + (pe.roi || 0)) / existing.count;
      } else {
        acc.push({
          name: currency,
          value: pe.investment.marketValue || pe.investment.bookValue || 0,
          count: 1,
          avgROI: pe.roi || 0
        });
      }
      return acc;
    }, [] as any[]);

    // ROI performance distribution
    const roiDistributionData = privateEquityInvestments
      .map(pe => ({
        name: pe.displayName,
        roi: pe.roi || 0,
        value: pe.investment.marketValue || pe.investment.bookValue || 0,
        stake: pe.investment.stakePercent || 0,
        risk: pe.investment.investmentRiskLevel?.value || 'Unknown',
        phase: pe.investment.investmentPhase?.value || 'Unknown'
      }))
      .sort((a, b) => b.roi - a.roi);

    // Legacy simplified data for backwards compatibility
    const phaseData = phaseValueData.map(item => ({ name: item.name, value: item.count }));
    const riskLevelData = riskReturnData.reduce((acc, pe) => {
      const existing = acc.find(item => item.name === pe.risk);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: pe.risk, value: 1 });
      }
      return acc;
    }, [] as any[]);
    const valueOverTimeData = timelineData.map(item => ({ 
      date: item.month, 
      value: item.currentValue, 
      name: `${item.count} investments` 
    }));
    const roiData = roiDistributionData.slice(0, 10);
    const stakeData = stakeValueData.map(item => ({ 
      name: item.name, 
      stake: item.stake, 
      color: item.roi >= 0 ? '#52c41a' : '#ff4d4f' 
    }));

    // Convert activePeriodData to simple name/value format for pie chart
    const activePeriodsData = privateEquityInvestments.reduce((acc, pe) => {
      const hasActivePeriod = pe.activeFrom && pe.activeTo ? 'Has Active Period' : 'No Active Period';
      const existing = acc.find(item => item.name === hasActivePeriod);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: hasActivePeriod, value: 1 });
      }
      return acc;
    }, [] as any[]);

    return {
      // Enhanced data
      timelineData,
      stakeValueData,
      leverageData,
      riskReturnData,
      phaseValueData,
      activePeriodData,
      accountConcentrationData,
      roiDistributionData,
      activePeriodsData,
      // Legacy data for backwards compatibility
      roleData,
      statusData,
      phaseData,
      riskLevelData,
      currencyData,
      valueOverTimeData,
      roiData,
      stakeData
    };
  }, [privateEquityInvestments]);
}; 