import { useMemo } from 'react';
import dayjs from 'dayjs';
import { EnhancedInvestmentSummary } from './useInvestmentPortfolioIntegration';

export const usePortfolioChartData = (investments: EnhancedInvestmentSummary[]) => {
  return useMemo(() => {
    // Investment type distribution data
    const investmentTypeData = investments.reduce((acc, investment) => {
      const type = investment.investmentType || 'Unknown';
      const existing = acc.find(item => item.type === type);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          type: type,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Investment group distribution data
    const investmentGroupData = investments.reduce((acc, investment) => {
      const group = investment.investmentGroup || 'Unknown';
      const existing = acc.find(item => item.type === group);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          type: group,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Investment status distribution data
    const statusData = investments.reduce((acc, investment) => {
      const status = investment.investmentStatus || 'Unknown';
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
    const phaseData = investments.reduce((acc, investment) => {
      const phase = investment.investmentPhase || 'Unknown';
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
    const riskLevelData = investments.reduce((acc, investment) => {
      const risk = investment.investmentRiskLevel || 'Unknown';
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
    const currencyData = investments.reduce((acc, investment) => {
      const currency = investment.currencyCode || 'EUR';
      const existing = acc.find(item => item.type === currency);
      if (existing) {
        existing.value += investment.marketValue || investment.bookValue || 0;
      } else {
        acc.push({
          type: currency,
          value: investment.marketValue || investment.bookValue || 0
        });
      }
      return acc;
    }, [] as any[]);

    // ROI distribution data - grouped by investment group
    const roiData = investments.reduce((acc, investment) => {
      const group = investment.investmentGroup || 'Unknown';
      const roi = investment.roi || 0;
      const existing = acc.find(item => item.name === group);
      if (existing) {
        existing.roi += roi;
        existing.count += 1;
      } else {
        acc.push({
          name: group,
          roi: roi,
          count: 1,
          color: group === 'Equity' ? '#1890ff' : 
                 group === 'Real Estate' ? '#52c41a' :
                 group === 'Liquid Fund' ? '#fa8c16' :
                 group === 'Private Equity' ? '#722ed1' : '#595959'
        });
      }
      return acc;
    }, [] as any[]);

    // Value over time trend data
    const valueOverTimeData = investments
      .filter(investment => investment.acquisitionDate && (investment.marketValue || investment.bookValue))
      .map(investment => ({
        date: dayjs(investment.acquisitionDate).format('YYYY-MM'),
        value: investment.marketValue || investment.bookValue || 0,
        name: investment.displayName || 'Unknown'
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // NEW: Investment Performance Timeline - showing investment counts and values over time
    const performanceTimelineData = investments
      .filter(investment => investment.acquisitionDate)
      .sort((a, b) => dayjs(a.acquisitionDate).unix() - dayjs(b.acquisitionDate).unix())
      .reduce((acc, investment) => {
        const date = dayjs(investment.acquisitionDate).format('YYYY-MM');
        const existing = acc.find(item => item.month === date);
        if (existing) {
          existing.investmentCount += 1;
          existing.totalValue += investment.marketValue || investment.bookValue || 0;
        } else {
          acc.push({
            month: date,
            investmentCount: 1,
            totalValue: investment.marketValue || investment.bookValue || 0
          });
        }
        return acc;
      }, [] as any[])
      .sort((a, b) => a.month.localeCompare(b.month)) // Ensure chronological order
      .map((item, index, array) => {
        // Calculate cumulative investments as running total
        let cumulativeCount = 0;
        for (let i = 0; i <= index; i++) {
          cumulativeCount += array[i].investmentCount;
        }
        
        // Calculate average ROI for all investments up to this month (as percentage)
        const investmentsUpToThisMonth = investments
          .filter(inv => inv.acquisitionDate && dayjs(inv.acquisitionDate).format('YYYY-MM') <= item.month)
          .filter(inv => inv.roi !== undefined && inv.roi !== null && !isNaN(inv.roi));
        
        const averageROI = investmentsUpToThisMonth.length > 0 
          ? investmentsUpToThisMonth.reduce((sum, inv) => sum + inv.roi, 0) / investmentsUpToThisMonth.length
          : 0;
        
        return {
          ...item,
          cumulativeInvestments: cumulativeCount,
          averageROI: averageROI // This is already a percentage from the ROI calculation
        };
      });

    // NEW: Investment Size vs ROI Correlation (Scatter Plot)
    const sizeVsRoiData = investments
      .filter(investment => {
        // Use totalInvestmentAmount, or fall back to initialInvestmentAmount, or marketValue
        const size = investment.totalInvestmentAmount || investment.initialInvestmentAmount || investment.marketValue || investment.bookValue;
        const hasValidROI = investment.roi !== undefined && investment.roi !== null && !isNaN(investment.roi);
        return size && size > 0 && hasValidROI;
      })
      .map(investment => {
        // Use the best available size measure
        const size = investment.totalInvestmentAmount || investment.initialInvestmentAmount || investment.marketValue || investment.bookValue || 0;
        
        return {
          size: size,
          roi: investment.roi,
          name: investment.displayName || 'Unknown',
          type: investment.investmentType || 'Unknown',
          color: investment.investmentType === 'Equity' ? '#1890ff' : 
                 investment.investmentType === 'Real Estate' ? '#52c41a' :
                 investment.investmentType === 'Liquid Funds' ? '#fa8c16' :
                 investment.investmentType === 'Private Equity' ? '#722ed1' : '#595959'
        };
      });

    // NEW: Leverage vs Performance Analysis (Composed Chart)
    const leverageAnalysisData = investments
      .filter(investment => investment.leverageRatio !== undefined && investment.leverageRatio !== null && investment.roi !== undefined)
      .reduce((acc, investment) => {
        const leverageRange = (investment.leverageRatio ?? 0) <= 0.3 ? 'Low (0-30%)' :
                              (investment.leverageRatio ?? 0) <= 0.6 ? 'Medium (30-60%)' :
                              'High (60%+)';
        const existing = acc.find(item => item.leverageRange === leverageRange);
        if (existing) {
          existing.averageROI = (existing.averageROI * existing.count + (investment.roi ?? 0)) / (existing.count + 1);
          existing.count += 1;
          existing.totalValue += investment.marketValue || investment.bookValue || 0;
        } else {
          acc.push({
            leverageRange,
            averageROI: investment.roi ?? 0,
            count: 1,
            totalValue: investment.marketValue || investment.bookValue || 0
          });
        }
        return acc;
      }, [] as any[]);

    // NEW: Risk vs Return Analysis (Scatter Plot)
    const riskReturnData = investments
      .filter(investment => {
        const hasRiskLevel = investment.investmentRiskLevel;
        const hasValidROI = investment.roi !== undefined && investment.roi !== null && !isNaN(investment.roi);
        return hasRiskLevel && hasValidROI;
      })
      .map(investment => {
        const riskScore = investment.investmentRiskLevel === 'Low' ? 1 :
                         investment.investmentRiskLevel === 'Medium' ? 2 :
                         investment.investmentRiskLevel === 'High' ? 3 : 2;
        
        // Use the best available size measure
        const size = investment.totalInvestmentAmount || investment.initialInvestmentAmount || investment.marketValue || investment.bookValue || 0;
        
        return {
          risk: riskScore,
          return: investment.roi,
          name: investment.displayName || 'Unknown',
          size: size,
          type: investment.investmentType || 'Unknown'
        };
      });

    // NEW: Portfolio Concentration by Investment Group (Bar Chart)
    const concentrationByGroupData = investments.reduce((acc, investment) => {
      const group = investment.investmentGroup || 'Unknown';
      console.log('Processing investment:', investment.displayName, 'Group:', group);
      const existing = acc.find(item => item.group === group);
      const value = investment.marketValue || investment.bookValue || 0;
      if (existing) {
        existing.totalValue += value;
        existing.count += 1;
        existing.averageValue = existing.totalValue / existing.count;
      } else {
        acc.push({
          group,
          totalValue: value,
          count: 1,
          averageValue: value
        });
      }
      return acc;
    }, [] as any[]);

    console.log('Final concentrationByGroupData:', concentrationByGroupData);

    // NEW: Active Period Analysis - investments by duration
    const activePeriodData = investments
      .filter(investment => investment.activeFrom)
      .map(investment => {
        const startDate = dayjs(investment.activeFrom);
        const endDate = investment.activeTo ? dayjs(investment.activeTo) : dayjs();
        const durationMonths = endDate.diff(startDate, 'month');
        const durationCategory = durationMonths <= 6 ? 'Short-term (≤6 months)' :
                                durationMonths <= 24 ? 'Medium-term (6-24 months)' :
                                'Long-term (>24 months)';
        return {
          name: investment.displayName || 'Unknown',
          duration: durationMonths,
          category: durationCategory,
          value: investment.marketValue || investment.bookValue || 0,
          roi: investment.roi || 0
        };
      })
      .reduce((acc, item) => {
        const existing = acc.find(group => group.category === item.category);
        if (existing) {
          existing.count += 1;
          existing.totalValue += item.value;
          existing.averageROI = (existing.averageROI * (existing.count - 1) + item.roi) / existing.count;
        } else {
          acc.push({
            category: item.category,
            count: 1,
            totalValue: item.value,
            averageROI: item.roi
          });
        }
        return acc;
      }, [] as any[]);

    // NEW: Investment Value by Account (Bar Chart)
    const valueByAccountData = investments.reduce((acc, investment) => {
      const accountName = investment.displayName || 'Unknown Account';
      const existing = acc.find(item => item.account === accountName);
      const value = investment.marketValue || investment.bookValue || 0;
      const group = investment.investmentGroup || 'Unknown';
      const type = investment.investmentType || 'Unknown';
      
      if (existing) {
        existing.totalValue += value;
        existing.count += 1;
        // Add unique investment groups and types
        if (!existing.investmentGroups.includes(group)) {
          existing.investmentGroups.push(group);
        }
        if (!existing.investmentTypes.includes(type)) {
          existing.investmentTypes.push(type);
        }
      } else {
        acc.push({
          account: accountName,
          totalValue: value,
          count: 1,
          investmentGroups: [group],
          investmentTypes: [type]
        });
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10); // Top 10 accounts

    // NEW: Enhanced Performance Distribution with ROI ranges
    const roiDistributionData = investments.reduce((acc, investment) => {
      const roi = investment.roi || 0;
      const range = roi < -10 ? 'Loss (< -10%)' :
                   roi < 0 ? 'Minor Loss (-10% to 0%)' :
                   roi < 5 ? 'Low Return (0% to 5%)' :
                   roi < 15 ? 'Good Return (5% to 15%)' :
                   roi < 25 ? 'High Return (15% to 25%)' :
                   'Excellent Return (> 25%)';
      const existing = acc.find(item => item.range === range);
      if (existing) {
        existing.count += 1;
        existing.totalValue += investment.marketValue || investment.bookValue || 0;
      } else {
        acc.push({
          range,
          count: 1,
          totalValue: investment.marketValue || investment.bookValue || 0
        });
      }
      return acc;
    }, [] as any[]);

    return {
      investmentTypeData,
      investmentGroupData,
      statusData,
      phaseData,
      riskLevelData,
      currencyData,
      roiData,
      valueOverTimeData,
      // New enhanced chart data
      performanceTimelineData,
      sizeVsRoiData,
      leverageAnalysisData,
      riskReturnData,
      concentrationByGroupData,
      activePeriodData,
      valueByAccountData,
      roiDistributionData
    };
  }, [investments]);
}; 