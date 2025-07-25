import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Card } from '@newwork/nw-design-system';
import { useAbsenceKPIData } from '../../../hooks/useAbsenceKPIData';
import { useAbsenceColors } from '../../../utils/absenceColors';
import { AbsenceDistributionChart } from '../../KPISection/AbsenceDistributionChart';
import { AbsenceFilters } from '../../../types';

export interface AbsenceDistributionSectionProps extends BusinessAppContextProps {}

export const AbsenceDistributionSection: React.FC<AbsenceDistributionSectionProps> = (props) => {
  const filters: AbsenceFilters = {
    search: '',
    statuses: [],
    types: [],
    groups: [],
    employees: [],
    startDate: undefined,
    endDate: undefined
  };

  const { data, loading: dataLoading, error: dataError } = useAbsenceKPIData(props, filters);
  const { colorMap, displayItems, loading: colorsLoading, error: colorsError, getColorForAbsence } = useAbsenceColors(props);

  const loading = dataLoading || colorsLoading;
  const error = dataError || colorsError;

  if (!props.userInfo?.employeeDetails?.employeeId) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-red-600" data-testid="absence-distribution-error-no-employee">
        Error: Employee ID not found. Please check your user profile.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-distribution-loading">
        Loading absence distribution data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-red-600" data-testid="absence-distribution-error">
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="absence-distribution-no-data">
        No absence distribution data available.
      </div>
    );
  }

  // Get unique groups for chart colors from bar chart data - maintain order
  const groupOrder = ['Vacation', 'Sick Leave', 'Special Leave', 'Work Leave'];
  const allUniqueGroups = new Set<string>();
  data.barChartData.forEach((monthData: { [key: string]: string | number }) => {
    Object.keys(monthData).forEach((key) => {
      if (key !== 'month') {
        allUniqueGroups.add(key);
      }
    });
  });

  // Sort groups according to desired order
  const uniqueGroups = Array.from(allUniqueGroups).sort((a, b) => {
    const aIndex = groupOrder.findIndex(orderGroup => 
      a.toLowerCase().includes(orderGroup.toLowerCase())
    );
    const bIndex = groupOrder.findIndex(orderGroup => 
      b.toLowerCase().includes(orderGroup.toLowerCase())
    );
    
    // If both found, sort by index; if not found, put at end
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Create group colors mapping using catalog colors
  const groupColors: { [key: string]: string } = {};
  uniqueGroups.forEach((group) => {
    const color = getColorForAbsence(group);
    if (color) {
      groupColors[group] = color;
    }
  });

  return (
    <section className="gba:mb-6" data-testid="absence-distribution-section">
      <h3 className="gba:text-lg gba:font-bold gba:mb-4" data-testid="absence-distribution-section-title">
        Absence Distribution
      </h3>
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:w-full gba:h-[510px]">
        <AbsenceDistributionChart
          pieChartData={data.pieChartData}
          totalAbsenceDays={data.totalAbsenceDays}
          vacationShare={data.vacationShare.toFixed(1)}
          groupColors={groupColors}
        />
      </Card>
    </section>
  );
}; 