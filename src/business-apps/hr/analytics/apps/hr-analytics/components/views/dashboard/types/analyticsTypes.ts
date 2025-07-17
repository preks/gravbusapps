import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface DashboardProps extends BusinessAppContextProps {}

export interface AnalyticsKpiData {
  employeeCount: {
    value: number;
    label: string;
  };
  newHires: {
    value: number;
    label: string;
  };
  turnoverRate: {
    value: number;
    change: number;
    label: string;
  };
  averageSalary: {
    value: number;
    label: string;
  };
}

export type TabKey = 'overview' | 'workforce';
