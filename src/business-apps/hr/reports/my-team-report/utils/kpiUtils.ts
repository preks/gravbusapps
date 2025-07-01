import { Employee } from '../hooks/useGetEmployeesReport';

export interface KpiCardData {
  key: string;
  label: string;
  subLabel: string;
  value: number | string;
  iconName: string;
  shouldShow: boolean;
}

export const generateKpiCards = (
  allEmployees: Employee[],
  averageTenureFormatted: string
): KpiCardData[] => {
  const internalEmployees = allEmployees.filter(e => e.employmentType === 'Internal');
  const externalEmployees = allEmployees.filter(e => e.employmentType === 'External');
  const contractWorkers = allEmployees.filter(e => e.employmentType === 'Contract worker');
  const demoTestUsers = allEmployees.filter(e => e.employmentType === 'Demo' || e.employmentType === 'Test');
  const activeEmployees = allEmployees.filter(e => !e.exitDate);
  const inactiveEmployees = allEmployees.filter(e => e.exitDate);
  const fullTimeEmployees = allEmployees.filter(e => e.contractType?.toLowerCase().includes('full time'));
  const partTimeEmployees = allEmployees.filter(e => e.contractType?.toLowerCase().includes('part time'));

  const cards: KpiCardData[] = [
    {
      key: 'all',
      label: 'Total',
      subLabel: 'All members',
      value: allEmployees.length,
      iconName: 'UserOutlined',
      shouldShow: true,
    },
    {
      key: 'internal',
      label: 'Internal',
      subLabel: 'Employees',
      value: internalEmployees.length,
      iconName: 'CheckOutlined',
      shouldShow: internalEmployees.length > 0,
    },
    {
      key: 'external',
      label: 'External',
      subLabel: 'Workers',
      value: externalEmployees.length,
      iconName: 'CheckOutlined',
      shouldShow: externalEmployees.length > 0,
    },
    {
      key: 'contract',
      label: 'Contract',
      subLabel: 'Contractors',
      value: contractWorkers.length,
      iconName: 'SolutionOutlined',
      shouldShow: contractWorkers.length > 0,
    },
    {
      key: 'demo',
      label: 'Demo/Test',
      subLabel: 'Test users',
      value: demoTestUsers.length,
      iconName: 'CloseOutlined',
      shouldShow: demoTestUsers.length > 0,
    },
    {
      key: 'tenure',
      label: 'Avg. Tenure',
      subLabel: 'Years & Months',
      value: averageTenureFormatted,
      iconName: 'CalendarOutlined',
      shouldShow: true,
    },
    {
      key: 'fulltime',
      label: 'Full-time',
      subLabel: 'Employees',
      value: fullTimeEmployees.length,
      iconName: 'IdcardOutlined',
      shouldShow: fullTimeEmployees.length > 0,
    },
    {
      key: 'parttime',
      label: 'Part-time',
      subLabel: 'Employees',
      value: partTimeEmployees.length,
      iconName: 'CheckOutlined',
      shouldShow: partTimeEmployees.length > 0,
    },
    // {
    //   key: 'active',
    //   label: 'Active',
    //   subLabel: 'Currently employed',
    //   value: activeEmployees.length,
    //   iconName: 'CheckOutlined',
    //   shouldShow: activeEmployees.length > 0,
    // },
    // {
    //   key: 'inactive',
    //   label: 'Inactive',
    //   subLabel: 'Former employees',
    //   value: inactiveEmployees.length,
    //   iconName: 'CloseOutlined',
    //   shouldShow: inactiveEmployees.length > 0,
    // },
  ];

  return cards.filter(card => card.shouldShow);
};

export const matchesKpi = (employee: Employee, activeKpi: string): boolean => {
  switch (activeKpi) {
    case 'all':
      return true;
    case 'tenure':
      return !!employee.startDate;
    // case 'active':
    //   return !employee.exitDate;
    // case 'inactive':
    //   return !!employee.exitDate;
    case 'internal':
      return employee.employmentType === 'Internal';
    case 'external':
      return employee.employmentType === 'External';
    case 'contract':
      return employee.employmentType === 'Contract worker';
    case 'demo':
      return employee.employmentType === 'Demo' || employee.employmentType === 'Test';
    case 'fulltime':
      return !!employee.contractType?.toLowerCase().includes('full time');
    case 'parttime':
      return !!employee.contractType?.toLowerCase().includes('part time');
    default:
      return true;
  }
};
