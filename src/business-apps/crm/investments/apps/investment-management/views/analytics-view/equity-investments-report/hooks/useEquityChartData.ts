import { useMemo } from 'react';
import dayjs from 'dayjs';
import { EnhancedEquityInvestmentSummary } from './useEquityInvestmentIntegration';

export const useEquityChartData = (equityInvestments: EnhancedEquityInvestmentSummary[]) => {
  return useMemo(() => {
    // Investment role distribution data (using default role since it's not in centralized structure)
    const roleData = equityInvestments.reduce((acc, equity) => {
      const role = 'Lead Investor'; // Default role since it's not in centralized structure
      const existing = acc.find(item => item.type === role);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          type: role,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Company valuation vs EBITDA scatter plot data
    const valuationEbitdaData = equityInvestments
      .filter(equity => equity.investment.investmentMarketValue && equity.equityInvestment?.ebitdaAmount)
      .map(equity => ({
        valuation: equity.investment.investmentMarketValue || 0,
        ebitda: equity.equityInvestment?.ebitdaAmount || 0,
        name: equity.displayName || 'Unknown Company',
        currency: equity.currencyCode || 'EUR'
      }));

    // EBITDA margin distribution data
    const ebitdaMarginData = equityInvestments
      .filter(equity => equity.ebitdaMargin)
      .map(equity => ({
        name: equity.displayName || 'Unknown Company',
        margin: equity.ebitdaMargin || 0,
        color: equity.ebitdaMargin >= 0 ? '#52c41a' : '#ff4d4f'
      }));

    // Investment status distribution data
    const statusData = equityInvestments.reduce((acc, equity) => {
      const status = equity.investment.investmentStatus?.value || 'Unknown';
      const existing = acc.find(item => item.type === status);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          type: status,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Investment phase distribution data
    const phaseData = equityInvestments.reduce((acc, equity) => {
      const phase = equity.investment.investmentPhase?.value || 'Unknown';
      const existing = acc.find(item => item.type === phase);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          type: phase,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Risk level distribution data
    const riskLevelData = equityInvestments.reduce((acc, equity) => {
      const risk = equity.investment.investmentRiskLevel?.value || 'Unknown';
      const existing = acc.find(item => item.type === risk);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          type: risk,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Currency distribution data
    const currencyData = equityInvestments.reduce((acc, equity) => {
      const currency = equity.currencyCode || 'EUR';
      const existing = acc.find(item => item.type === currency);
      if (existing) {
        existing.value += equity.investment.investmentMarketValue || 0;
      } else {
        acc.push({
          type: currency,
          value: equity.investment.investmentMarketValue || 0
        });
      }
      return acc;
    }, [] as any[]);

    // ROI distribution data
    const roiData = equityInvestments.map(equity => ({
      name: equity.displayName || 'Unknown Company',
      roi: equity.roi || 0,
      color: equity.roi >= 0 ? '#52c41a' : '#ff4d4f'
    }));

    // NEW: Equity Investment Performance Timeline - showing valuations and EBITDA over time
    const equityTimelineData = equityInvestments
      .filter(equity => equity.investment.acquisitionDate)
      .sort((a, b) => dayjs(a.investment.acquisitionDate).unix() - dayjs(b.investment.acquisitionDate).unix())
      .reduce((acc, equity, index) => {
        const date = dayjs(equity.investment.acquisitionDate).format('YYYY-MM');
        const existing = acc.find(item => item.month === date);
        if (existing) {
          existing.investmentCount += 1;
          existing.totalValuation += equity.investment.investmentMarketValue || 0;
          existing.totalEbitda += equity.equityInvestment?.ebitdaAmount || 0;
          existing.cumulativeInvestments += 1;
        } else {
          acc.push({
            month: date,
            investmentCount: 1,
            totalValuation: equity.investment.investmentMarketValue || 0,
            totalEbitda: equity.equityInvestment?.ebitdaAmount || 0,
            cumulativeInvestments: index + 1
          });
        }
        return acc;
      }, [] as any[]);

    // NEW: Stake vs Valuation Correlation (Scatter Plot)
    const stakeVsValuationData = equityInvestments
      .filter(equity => equity.investment.stakePercentage && equity.investment.investmentMarketValue)
      .map(equity => ({
        stake: equity.investment.stakePercentage,
        valuation: equity.investment.investmentMarketValue,
        name: equity.displayName || 'Unknown',
        role: 'Lead Investor', // Default role since it's not in centralized structure
        ebitda: equity.equityInvestment?.ebitdaAmount || 0,
        color: '#1890ff' // Default color for lead investor
      }));

    // NEW: EBITDA vs Company Valuation Analysis (Composed Chart) - using same ranges as valuation distribution
    const ebitdaValuationAnalysisData = (() => {
      // Get all valuation values for equity investments
      const valuations = equityInvestments
        .map(equity => equity.investment.investmentMarketValue || 0)
        .filter(val => val > 0);
      
      console.log('Equity investments count:', equityInvestments.length);
      console.log('Valuations:', valuations);
      
      if (valuations.length === 0) {
        console.log('No valuations found, returning empty array');
        return [];
      }
      
      // Find min and max values (same logic as valuationDistributionData)
      const minValuation = Math.min(...valuations);
      const maxValuation = Math.max(...valuations);
      
      console.log('Min valuation:', minValuation, 'Max valuation:', maxValuation);
      
      // Create 5 equal-sized ranges (same as valuationDistributionData)
      const rangeSize = (maxValuation - minValuation) / 5;
      const ranges: {
        range: string;
        min: number;
        max: number;
        count: number;
        totalValuation: number;
        averageEbitda: number;
        totalEbitda: number;
      }[] = [];
      
      for (let i = 0; i < 5; i++) {
        const rangeStart = minValuation + (i * rangeSize);
        const rangeEnd = i === 4 ? maxValuation : minValuation + ((i + 1) * rangeSize);
        
        // Format range labels (same formatting as valuationDistributionData)
        const formatValue = (value: number) => {
          if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
          return value.toFixed(0);
        };
        
        const rangeLabel = `${formatValue(rangeStart)} - ${formatValue(rangeEnd)}`;
        
        ranges.push({
          range: rangeLabel,
          min: rangeStart,
          max: rangeEnd,
          count: 0,
          totalValuation: 0,
          averageEbitda: 0,
          totalEbitda: 0
        });
      }
      
      // Categorize investments into ranges and calculate EBITDA metrics
      equityInvestments.forEach(equity => {
        const valuation = equity.investment.investmentMarketValue || 0;
        const ebitda = equity.equityInvestment?.ebitdaAmount || 0;
        if (valuation > 0) {
          const rangeIndex = Math.min(
            Math.floor((valuation - minValuation) / rangeSize),
            4 // Ensure we don't exceed index 4
          );
          
          ranges[rangeIndex].count += 1;
          ranges[rangeIndex].totalValuation += valuation;
          ranges[rangeIndex].totalEbitda += ebitda;
        }
      });
      
      // Calculate average EBITDA for each range
      ranges.forEach(range => {
        range.averageEbitda = range.count > 0 ? range.totalEbitda / range.count : 0;
      });
      
      console.log('Generated ebitdaValuationAnalysisData:', ranges);
      return ranges;
    })();

    // NEW: Investment Role vs Performance Analysis (Scatter Plot)
    const rolePerformanceData = equityInvestments
      .filter(equity => equity.roi !== undefined)
      .map(equity => {
        const roleScore = 3; // Default to Lead Investor score
        return {
          role: roleScore,
          performance: equity.roi,
          name: equity.displayName || 'Unknown',
          valuation: equity.investment.investmentMarketValue || 0,
          stake: equity.investment.stakePercentage || 0
        };
      });

    // NEW: Portfolio Concentration by Investment Role (Bar Chart)
    const concentrationByRoleData = equityInvestments.reduce((acc, equity) => {
      const role = 'Lead Investor'; // Default role since it's not in centralized structure
      const existing = acc.find(item => item.role === role);
      const value = equity.investment.investmentMarketValue || 0;
      if (existing) {
        existing.totalValuation += value;
        existing.count += 1;
        existing.averageValuation = existing.totalValuation / existing.count;
        existing.totalEbitda += equity.equityInvestment?.ebitdaAmount || 0;
      } else {
        acc.push({
          role,
          totalValuation: value,
          count: 1,
          averageValuation: value,
          totalEbitda: equity.equityInvestment?.ebitdaAmount || 0
        });
      }
      return acc;
    }, [] as any[]);

    // NEW: Top Companies by Valuation (Bar Chart)
    const topCompaniesByValuationData = equityInvestments
      .filter(equity => equity.investment.investmentMarketValue)
      .map(equity => ({
        company: equity.displayName || 'Unknown Company',
        valuation: equity.investment.investmentMarketValue,
        ebitda: equity.equityInvestment?.ebitdaAmount || 0,
        stake: equity.investment.stakePercentage || 0,
        role: 'Lead Investor' // Default role since it's not in centralized structure
      }))
      .sort((a, b) => (b.valuation || 0) - (a.valuation || 0))
      .slice(0, 10); // Top 10 companies

    // NEW: Enhanced Performance Distribution with Dynamic Valuation ranges
    const valuationDistributionData = (() => {
      // Get all valuation values
      const valuations = equityInvestments
        .map(equity => equity.investment.investmentMarketValue || 0)
        .filter(val => val > 0);
      
      if (valuations.length === 0) {
        return [];
      }
      
      // Find min and max values
      const minValuation = Math.min(...valuations);
      const maxValuation = Math.max(...valuations);
      
      // Create 5 equal-sized ranges
      const rangeSize = (maxValuation - minValuation) / 5;
      const ranges: {
        range: string;
        min: number;
        max: number;
        count: number;
        totalValuation: number;
        totalEbitda: number;
      }[] = [];
      
      for (let i = 0; i < 5; i++) {
        const rangeStart = minValuation + (i * rangeSize);
        const rangeEnd = i === 4 ? maxValuation : minValuation + ((i + 1) * rangeSize);
        
        // Format range labels
        const formatValue = (value: number) => {
          if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
          return value.toFixed(0);
        };
        
        const rangeLabel = `${formatValue(rangeStart)} - ${formatValue(rangeEnd)}`;
        
        ranges.push({
          range: rangeLabel,
          min: rangeStart,
          max: rangeEnd,
          count: 0,
          totalValuation: 0,
          totalEbitda: 0
        });
      }
      
      // Categorize investments into ranges
      equityInvestments.forEach(equity => {
        const valuation = equity.investment.investmentMarketValue || 0;
        if (valuation > 0) {
          const rangeIndex = Math.min(
            Math.floor((valuation - minValuation) / rangeSize),
            4 // Ensure we don't exceed index 4
          );
          
          ranges[rangeIndex].count += 1;
          ranges[rangeIndex].totalValuation += valuation;
          ranges[rangeIndex].totalEbitda += equity.equityInvestment?.ebitdaAmount || 0;
        }
      });
      
      return ranges;
    })();

    return {
      roleData,
      valuationEbitdaData,
      ebitdaMarginData,
      statusData,
      phaseData,
      riskLevelData,
      currencyData,
      roiData,
      // New enhanced chart data
      equityTimelineData,
      stakeVsValuationData,
      ebitdaValuationAnalysisData,
      rolePerformanceData,
      concentrationByRoleData,
      topCompaniesByValuationData,
      valuationDistributionData
    };
  }, [equityInvestments]);
}; 