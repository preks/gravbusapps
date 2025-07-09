import { useMemo } from 'react';
import dayjs from 'dayjs';
import { EnhancedRealEstateInvestmentSummary } from './useRealEstateInvestmentIntegration';

export const useRealEstateChartData = (realEstateInvestments: EnhancedRealEstateInvestmentSummary[]) => {
  const chartData = useMemo(() => {
    // Property Type Distribution
    const propertyTypeData = realEstateInvestments.reduce((acc, property) => {
      const type = property.realEstateType?.value || 'Unknown';
      const existing = acc.find(item => item.name === type);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          name: type,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Country Distribution
    const countryData = realEstateInvestments.reduce((acc, property) => {
      const country = property.country?.value || 'Unknown';
      const existing = acc.find(item => item.name === country);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          name: country,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Occupancy Data
    const occupancyData = realEstateInvestments.map(property => ({
      name: property.displayName || 'Unknown Property',
      occupancy: property.occupancyPercent || 0,
      color: property.occupancyColor
    }));

    // Expenses vs Value Data
    const expensesValueData = realEstateInvestments
      .filter(property => 
        property.annualExpenses !== null && 
        property.annualExpenses !== undefined && 
        !isNaN(Number(property.annualExpenses)) &&
        Number(property.annualExpenses) >= 0 &&
        property.investment?.marketValue !== null && 
        property.investment?.marketValue !== undefined && 
        !isNaN(Number(property.investment?.marketValue)) &&
        Number(property.investment?.marketValue) >= 0
      )
      .map(property => ({
        expenses: Number(property.annualExpenses) || 0,
        value: Number(property.investment.marketValue) || 0,
        name: property.displayName || 'Unknown Property',
        currency: property.currencyCode || 'EUR'
      }));

    // Building Year Distribution
    const buildingYearData = realEstateInvestments
      .filter(property => property.buildingYear)
      .reduce((acc, property) => {
        const year = property.buildingYear || 'Unknown';
        const existing = acc.find(item => item.year === year);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({
            year: year,
            count: 1
          });
        }
        return acc;
      }, [] as any[]);

    // Investment Status Distribution
    const statusData = realEstateInvestments.reduce((acc, property) => {
      const status = property.investment.investmentStatus?.value || 'Unknown';
      const existing = acc.find(item => item.name === status);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          name: status,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Investment Phase Distribution
    const phaseData = realEstateInvestments.reduce((acc, property) => {
      const phase = property.investment.investmentPhase?.value || 'Unknown';
      const existing = acc.find(item => item.name === phase);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          name: phase,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Risk Level Distribution
    const riskLevelData = realEstateInvestments.reduce((acc, property) => {
      const risk = property.investment.investmentRiskLevel?.value || 'Unknown';
      const existing = acc.find(item => item.name === risk);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          name: risk,
          value: 1
        });
      }
      return acc;
    }, [] as any[]);

    // Currency Distribution
    const currencyData = realEstateInvestments.reduce((acc, property) => {
      const currency = property.currencyCode || 'EUR';
      const existing = acc.find(item => item.name === currency);
      if (existing) {
        existing.value += property.investment.marketValue || property.investment.bookValue || 0;
      } else {
        acc.push({
          name: currency,
          value: property.investment.marketValue || property.investment.bookValue || 0
        });
      }
      return acc;
    }, [] as any[]);

    // Property Size Distribution
    const propertySizeData = realEstateInvestments
      .filter(property => property.size && property.size > 0)
      .map(property => ({
        name: property.displayName || 'Unknown Property',
        size: property.size || 0,
        value: property.investment.marketValue || property.investment.bookValue || 0,
        color: property.propertyTypeColor
      }));

    // Region Distribution
    const regionData = realEstateInvestments.reduce((acc, property) => {
      const region = property.region?.value || 'Unknown';
      const existing = acc.find(item => item.name === region);
      if (existing) {
        existing.value += 1;
        existing.totalValue += property.investment.marketValue || property.investment.bookValue || 0;
      } else {
        acc.push({
          name: region,
          value: 1,
          totalValue: property.investment.marketValue || property.investment.bookValue || 0
        });
      }
      return acc;
    }, [] as any[]);

    // Investment Timeline Data (acquisitions over time)
    const timelineData = realEstateInvestments
      .filter(property => property.investment.acquisitionDate)
      .reduce((acc, property) => {
        const date = dayjs(property.investment.acquisitionDate).format('YYYY-MM');
        const existing = acc.find(item => item.month === date);
        if (existing) {
          existing.count += 1;
          existing.value += property.investment.initialInvestmentAmount || 0;
        } else {
          acc.push({
            month: date,
            count: 1,
            value: property.investment.initialInvestmentAmount || 0,
            year: dayjs(property.investment.acquisitionDate).year()
          });
        }
        return acc;
      }, [] as any[])
      .sort((a, b) => a.month.localeCompare(b.month));

    // Leverage Analysis Data
    const leverageData = realEstateInvestments
      .filter(property => 
        property.investment.leverageRatio !== null && 
        property.investment.leverageRatio !== undefined &&
        property.investment.marketValue !== null &&
        property.investment.marketValue !== undefined
      )
      .map(property => ({
        name: property.displayName || 'Unknown Property',
        leverageRatio: property.investment.leverageRatio || 0,
        marketValue: property.investment.marketValue || 0,
        debtFinancing: property.investment.debtFinancing || 0,
        color: property.propertyTypeColor
      }));

    // ROI vs Size Analysis
    const roiSizeData = realEstateInvestments
      .filter(property => 
        property.size && 
        property.investment.marketValue && 
        property.investment.initialInvestmentAmount
      )
      .map(property => {
        const marketValue = property.investment.marketValue || 0;
        const initialInvestment = property.investment.initialInvestmentAmount || 0;
        const calculatedROI = initialInvestment > 0 ? ((marketValue - initialInvestment) / initialInvestment) * 100 : 0;
        
        return {
          name: property.displayName || 'Unknown Property',
          size: property.size || 0,
          roi: calculatedROI,
          propertyType: property.realEstateType?.value || 'Unknown'
        };
      });

    // Ownership Structure Data
    const ownershipStructureData = realEstateInvestments.reduce((acc, property) => {
      const structure = property.investmentOwnershipStructure?.value || 'Unknown';
      const existing = acc.find(item => item.name === structure);
      if (existing) {
        existing.value += 1;
        existing.totalValue += property.investment.marketValue || property.investment.bookValue || 0;
      } else {
        acc.push({
          name: structure,
          value: 1,
          totalValue: property.investment.marketValue || property.investment.bookValue || 0
        });
      }
      return acc;
    }, [] as any[]);

    // Investment Performance Metrics (multi-dimensional radar chart data)
    const performanceData = realEstateInvestments
      .filter(property => 
        property.occupancyPercent !== null &&
        property.investment.marketValue &&
        property.investment.initialInvestmentAmount &&
        property.investment.leverageRatio !== null
      )
      .map(property => {
        const marketValue = property.investment.marketValue || 0;
        const initialInvestment = property.investment.initialInvestmentAmount || 0;
        const calculatedROI = initialInvestment > 0 ? ((marketValue - initialInvestment) / initialInvestment) * 100 : 0;
        
        return {
          property: property.displayName || 'Unknown',
          occupancy: property.occupancyPercent || 0,
          roi: Math.max(-100, Math.min(100, calculatedROI)), // Normalize ROI
          leverage: property.investment.leverageRatio || 0,
          value: property.investment.marketValue || property.investment.bookValue || 0,
          country: property.country?.value || 'Unknown'
        };
      });

    // Geographic Value Density (for heat map visualization)
    const geoValueData = realEstateInvestments.reduce((acc, property) => {
      const location = `${property.city || 'Unknown'}, ${property.country?.value || 'Unknown'}`;
      const existing = acc.find(item => item.location === location);
      if (existing) {
        existing.count += 1;
        existing.totalValue += property.investment.marketValue || property.investment.bookValue || 0;
        existing.avgOccupancy = (existing.avgOccupancy * (existing.count - 1) + (property.occupancyPercent || 0)) / existing.count;
      } else {
        acc.push({
          location: location,
          city: property.city || 'Unknown',
          country: property.country?.value || 'Unknown',
          count: 1,
          totalValue: property.investment.marketValue || property.investment.bookValue || 0,
          avgOccupancy: property.occupancyPercent || 0
        });
      }
      return acc;
    }, [] as any[]);

    return {
      propertyTypeData,
      countryData,
      regionData,
      occupancyData,
      expensesValueData,
      buildingYearData,
      statusData,
      phaseData,
      riskLevelData,
      currencyData,
      propertySizeData,
      timelineData,
      leverageData,
      roiSizeData,
      ownershipStructureData,
      performanceData,
      geoValueData
    };
  }, [realEstateInvestments]);

  return chartData;
}; 