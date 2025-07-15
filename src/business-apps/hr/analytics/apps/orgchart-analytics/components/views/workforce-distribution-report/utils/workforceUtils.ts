import dayjs from 'dayjs';
import type {
  WorkforceEmployee,
  WorkforceEmployeeWithOrganization,
  EmployeeWorkingCondition,
  WorkforceDistribution,
  WorkforceStatistics,
  WorkforceTableData,
  GeographicDistribution,
  OrganizationalDistribution,
  DemographicDistribution,
  EmploymentDistribution,
  DistributionSegment,
  GeographicTableRow,
  OrganizationalTableRow,
  DemographicTableRow,
  EmploymentTableRow,
  ChartData,
  TreemapData
} from '../types/workforceTypes';

// Color palettes for visualizations
export const chartColors = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d3', '#c7c7c7', '#dbdb8d', '#9edae5'
];

// Helper function to get age from birth date
export const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const birth = dayjs(birthDate);
  const now = dayjs();
  return now.diff(birth, 'year');
};

// Helper function to get tenure from start date
export const calculateTenure = (startDate: string): number => {
  if (!startDate) return 0;
  const start = dayjs(startDate);
  const now = dayjs();
  return now.diff(start, 'year', true);
};

// Helper function to categorize age
export const getAgeGroup = (age: number): string => {
  if (age < 25) return 'Under 25';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
};

// Helper function to categorize tenure
export const getTenureGroup = (tenure: number): string => {
  if (tenure < 1) return 'Less than 1 year';
  if (tenure < 3) return '1-3 years';
  if (tenure < 5) return '3-5 years';
  if (tenure < 10) return '5-10 years';
  return '10+ years';
};

// Create distribution segment with color
export const createDistributionSegment = (
  name: string,
  count: number,
  total: number,
  colorIndex: number
): DistributionSegment => ({
  name,
  count,
  percentage: total > 0 ? (count / total) * 100 : 0,
  color: chartColors[colorIndex % chartColors.length]
});

// Process geographic distribution
export const processGeographicDistribution = (employees: WorkforceEmployeeWithOrganization[]): GeographicDistribution => {
  const countryMap = new Map<string, number>();
  const regionMap = new Map<string, number>();
  const siteLocationMap = new Map<string, number>();

  employees.forEach(employee => {
    if (employee.siteLocation) {
      const siteLocation = employee.siteLocation;
      
      // Count by site location
      const siteName = siteLocation.name;
      siteLocationMap.set(siteName, (siteLocationMap.get(siteName) || 0) + 1);
      
      // Count by country
      if (siteLocation.country) {
        const countryName = siteLocation.country.value;
        countryMap.set(countryName, (countryMap.get(countryName) || 0) + 1);
      }
      
      // Count by region
      if (siteLocation.region) {
        const regionName = siteLocation.region.value;
        regionMap.set(regionName, (regionMap.get(regionName) || 0) + 1);
      }
    }
  });

  const total = employees.length;

  return {
    byCountry: Array.from(countryMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count),
    byRegion: Array.from(regionMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count),
    bySiteLocation: Array.from(siteLocationMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count)
  };
};

// Process organizational distribution
export const processOrganizationalDistribution = (employees: WorkforceEmployeeWithOrganization[]): OrganizationalDistribution => {
  const departmentMap = new Map<string, number>();
  const jobLevelMap = new Map<string, number>();
  const costCenterMap = new Map<string, number>();
  const companyMap = new Map<string, number>();

  employees.forEach(employee => {
    // Count by department (from job function)
    if (employee.jobPosition?.jobFunction?.department) {
      const dept = employee.jobPosition.jobFunction.department;
      departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
    }
    
    // Count by job level
    if (employee.jobPosition?.jobLevel?.name) {
      const level = employee.jobPosition.jobLevel.name;
      jobLevelMap.set(level, (jobLevelMap.get(level) || 0) + 1);
    }
    
    // Count by cost center
    if (employee.costCenter) {
      const ccName = employee.costCenter.name;
      costCenterMap.set(ccName, (costCenterMap.get(ccName) || 0) + 1);
    }
    
    // Count by company
    if (employee.organizationalUnit?.company) {
      const companyName = employee.organizationalUnit.company.name;
      companyMap.set(companyName, (companyMap.get(companyName) || 0) + 1);
    }
  });

  const total = employees.length;

  return {
    byDepartment: Array.from(departmentMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count),
    byJobLevel: Array.from(jobLevelMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count),
    byCostCenter: Array.from(costCenterMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count),
    byCompany: Array.from(companyMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count)
  };
};

// Process demographic distribution
export const processDemographicDistribution = (employees: WorkforceEmployeeWithOrganization[]): DemographicDistribution => {
  const genderMap = new Map<string, number>();
  const ageGroupMap = new Map<string, number>();
  const tenureGroupMap = new Map<string, number>();

  employees.forEach(employee => {
    // Count by gender
    const gender = employee.gender?.value || 'Not Specified';
    genderMap.set(gender, (genderMap.get(gender) || 0) + 1);
    
    // Count by age group
    if (employee.birthDate) {
      const age = calculateAge(employee.birthDate);
      const ageGroup = getAgeGroup(age);
      ageGroupMap.set(ageGroup, (ageGroupMap.get(ageGroup) || 0) + 1);
    }
    
    // Count by tenure group
    const workingCondition = employee.workingCondition?.[0];
    if (workingCondition?.activeFrom) {
      const tenure = calculateTenure(workingCondition.activeFrom);
      const tenureGroup = getTenureGroup(tenure);
      tenureGroupMap.set(tenureGroup, (tenureGroupMap.get(tenureGroup) || 0) + 1);
    }
  });

  const total = employees.length;

  return {
    byGender: Array.from(genderMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count),
    byAgeGroup: Array.from(ageGroupMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count),
    byTenure: Array.from(tenureGroupMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count)
  };
};

// Process employment distribution
export const processEmploymentDistribution = (employees: WorkforceEmployeeWithOrganization[]): EmploymentDistribution => {
  const employmentTypeMap = new Map<string, number>();
  const startYearMap = new Map<string, number>();

  employees.forEach(employee => {
    // Get working condition data
    const workingCondition = employee.workingCondition?.[0];
    
    // Count by employment type (from working conditions)
    const empType = workingCondition?.employmentType?.value || 'Not Specified';
    employmentTypeMap.set(empType, (employmentTypeMap.get(empType) || 0) + 1);
    
    // Count by start year
    if (workingCondition?.activeFrom) {
      const startYear = dayjs(workingCondition.activeFrom).year().toString();
      startYearMap.set(startYear, (startYearMap.get(startYear) || 0) + 1);
    }
  });

  const total = employees.length;

  return {
    byEmploymentType: Array.from(employmentTypeMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => b.count - a.count),
    byStartYear: Array.from(startYearMap.entries())
      .map(([name, count], index) => createDistributionSegment(name, count, total, index))
      .sort((a, b) => parseInt(b.name) - parseInt(a.name))
  };
};

// Process complete workforce distribution
export const processWorkforceDistribution = (employees: WorkforceEmployeeWithOrganization[]): WorkforceDistribution => {
  return {
    geographic: processGeographicDistribution(employees),
    organizational: processOrganizationalDistribution(employees),
    demographic: processDemographicDistribution(employees),
    employment: processEmploymentDistribution(employees)
  };
};

// Calculate workforce statistics
export const calculateWorkforceStatistics = (
  employees: WorkforceEmployeeWithOrganization[],
  distribution: WorkforceDistribution
): WorkforceStatistics => {
  const totalEmployees = employees.length;
  
  // Calculate average age
  const agesWithBirthDate = employees
    .filter(emp => emp.birthDate)
    .map(emp => calculateAge(emp.birthDate!));
  const averageAge = agesWithBirthDate.length > 0 
    ? agesWithBirthDate.reduce((sum, age) => sum + age, 0) / agesWithBirthDate.length 
    : 0;
  
  // Calculate average tenure
  const tenuresWithStartDate = employees
    .filter(emp => emp.workingCondition?.[0]?.activeFrom)
    .map(emp => calculateTenure(emp.workingCondition[0].activeFrom!));
  const averageTenure = tenuresWithStartDate.length > 0
    ? tenuresWithStartDate.reduce((sum, tenure) => sum + tenure, 0) / tenuresWithStartDate.length
    : 0;
  
  // Calculate gender diversity index (simplified)
  const genderCounts = distribution.demographic.byGender.map(g => g.count);
  const genderDiversityIndex = genderCounts.length > 1 
    ? 1 - (genderCounts.reduce((sum, count) => sum + Math.pow(count / totalEmployees, 2), 0))
    : 0;

  return {
    totalEmployees,
    countries: distribution.geographic.byCountry.length,
    regions: distribution.geographic.byRegion.length,
    siteLocations: distribution.geographic.bySiteLocation.length,
    departments: distribution.organizational.byDepartment.length,
    jobLevels: distribution.organizational.byJobLevel.length,
    companies: distribution.organizational.byCompany.length,
    costCenters: distribution.organizational.byCostCenter.length,
    averageAge: parseFloat(averageAge.toFixed(1)),
    averageTenure: parseFloat(averageTenure.toFixed(1)),
    genderDiversityIndex: parseFloat((genderDiversityIndex * 100).toFixed(1)),
    geographicSpread: distribution.geographic.byCountry.length
  };
};

// Generate table data for geographic distribution
export const generateGeographicTableData = (
  employees: WorkforceEmployeeWithOrganization[],
  distribution: GeographicDistribution
): GeographicTableRow[] => {
  const tableData: GeographicTableRow[] = [];
  
  // Add country rows
  distribution.byCountry.forEach(country => {
    const countryEmployees = employees.filter(emp =>
      emp.siteLocation?.country?.value === country.name
    );
    
    const companies = Array.from(new Set(
      countryEmployees
        .map(emp => emp.organizationalUnit?.company?.name)
        .filter((name): name is string => Boolean(name))
    ));
    
    const departments = Array.from(new Set(
      countryEmployees
        .map(emp => emp.jobPosition?.jobFunction?.department)
        .filter((dept): dept is string => Boolean(dept))
    ));
    
    tableData.push({
      location: country.name,
      type: 'Country',
      employees: country.count,
      percentage: country.percentage,
      companies,
      departments
    });
  });
  
  return tableData;
};

// Generate table data for organizational distribution
export const generateOrganizationalTableData = (
  employees: WorkforceEmployeeWithOrganization[],
  distribution: OrganizationalDistribution
): OrganizationalTableRow[] => {
  const tableData: OrganizationalTableRow[] = [];
  
  // Add department rows
  distribution.byDepartment.forEach(dept => {
    const deptEmployees = employees.filter(emp =>
      emp.jobPosition?.jobFunction?.department === dept.name
    );
    
    const countries = Array.from(new Set(
      deptEmployees
        .map(emp => emp.siteLocation?.country?.value)
        .filter((country): country is string => Boolean(country))
    ));
    
    const avgTenure = deptEmployees
      .filter(emp => emp.workingCondition?.[0]?.activeFrom)
      .reduce((sum, emp) => sum + calculateTenure(emp.workingCondition[0].activeFrom!), 0) / deptEmployees.length || 0;
    
    tableData.push({
      unit: dept.name,
      type: 'Department',
      employees: dept.count,
      percentage: dept.percentage,
      countries,
      avgTenure: parseFloat(avgTenure.toFixed(1))
    });
  });
  
  return tableData;
};

// Generate table data for demographic distribution
export const generateDemographicTableData = (
  employees: WorkforceEmployeeWithOrganization[],
  distribution: DemographicDistribution
): DemographicTableRow[] => {
  const tableData: DemographicTableRow[] = [];
  
  // Add gender rows
  distribution.byGender.forEach(gender => {
    const genderEmployees = employees.filter(emp => emp.gender?.value === gender.name);
    
    const avgAge = genderEmployees
      .filter(emp => emp.birthDate)
      .reduce((sum, emp) => sum + calculateAge(emp.birthDate!), 0) / genderEmployees.length || 0;
    
    const avgTenure = genderEmployees
      .filter(emp => emp.workingCondition?.[0]?.activeFrom)
      .reduce((sum, emp) => sum + calculateTenure(emp.workingCondition[0].activeFrom!), 0) / genderEmployees.length || 0;
    
    tableData.push({
      category: gender.name,
      type: 'Gender',
      employees: gender.count,
      percentage: gender.percentage,
      avgAge: parseFloat(avgAge.toFixed(1)),
      avgTenure: parseFloat(avgTenure.toFixed(1))
    });
  });
  
  return tableData;
};

// Generate table data for employment distribution
export const generateEmploymentTableData = (
  distribution: EmploymentDistribution
): EmploymentTableRow[] => {
  const tableData: EmploymentTableRow[] = [];
  
  // Add employment type rows
  distribution.byEmploymentType.forEach(empType => {
    tableData.push({
      type: empType.name,
      category: 'Employment Type',
      employees: empType.count,
      percentage: empType.percentage,
      retention: 100 // TODO: Calculate actual retention rate
    });
  });
  
  return tableData;
};

// Generate complete table data
export const generateWorkforceTableData = (
  employees: WorkforceEmployeeWithOrganization[],
  distribution: WorkforceDistribution
): WorkforceTableData => {
  return {
    geographic: generateGeographicTableData(employees, distribution.geographic),
    organizational: generateOrganizationalTableData(employees, distribution.organizational),
    demographic: generateDemographicTableData(employees, distribution.demographic),
    employment: generateEmploymentTableData(distribution.employment)
  };
};

// Convert distribution segments to chart data
export const convertToChartData = (segments: DistributionSegment[]): ChartData[] => {
  return segments.map(segment => ({
    name: segment.name,
    value: segment.count,
    percentage: segment.percentage,
    color: segment.color,
    fill: segment.color
  }));
};

// Convert distribution segments to treemap data
export const convertToTreemapData = (segments: DistributionSegment[], title: string): TreemapData => {
  return {
    name: title,
    size: 0,
    children: segments.map(segment => ({
      name: segment.name,
      size: segment.count,
      color: segment.color
    }))
  };
}; 