// GraphQL Response Types
export interface WorkforceEmployee {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  gender?: {
    code: string;
    value: string;
  };
  workingCondition: EmployeeWorkingCondition[];
}

export interface EmployeeWorkingCondition {
  id: string;
  activeFrom?: string;
  activeTo?: string;
  employmentType?: {
    code: string;
    value: string;
  };
  contractType?: {
    code: string;
    value: string;
  };
}

export interface WorkforceJobPosition {
  id: string;
  name: string;
  businessKey?: string;
  employmentType?: {
    code: string;
    value: string;
  };
  jobLevel?: {
    id: string;
    name: string;
    level?: string;
  };
  jobFunction?: {
    id: string;
    name: string;
    department?: string;
  };
}

export interface WorkforceEmployeeWithOrganization extends WorkforceEmployee {
  organizationalUnit: OrganizationalUnit;
  jobPosition?: WorkforceJobPosition;
  siteLocation?: SiteLocation;
  costCenter?: CostCenter;
}

export interface EmployeeOrganizationalUnit {
  organizationalUnitId: string;
  organizationalUnit: OrganizationalUnit;
}

export interface EmployeeSiteLocation {
  siteLocationId: string;
  siteLocation: SiteLocation;
}

export interface EmployeeCostCenter {
  costCenterId: string;
  costCenter: CostCenter;
}

export interface OrganizationalUnit {
  id: string;
  name: string;
  type?: string;
  company?: Company;
}

export interface SiteLocation {
  id: string;
  name: string;
  country?: Country;
  region?: Region;
}

export interface CostCenter {
  id: string;
  name: string;
  code?: string;
}

export interface JobPosition {
  id: string;
  name: string;
  jobLevel?: string;
  department?: string;
}

export interface Company {
  id: string;
  name: string;
  code?: string;
}

export interface Country {
  id: string;
  code: string;
  value: string;
}

export interface Region {
  id: string;
  code: string;
  value: string;
}

// Processed Data Types
export interface WorkforceDistribution {
  geographic: GeographicDistribution;
  organizational: OrganizationalDistribution;
  demographic: DemographicDistribution;
  employment: EmploymentDistribution;
}

export interface GeographicDistribution {
  byCountry: DistributionSegment[];
  byRegion: DistributionSegment[];
  bySiteLocation: DistributionSegment[];
}

export interface OrganizationalDistribution {
  byDepartment: DistributionSegment[];
  byJobLevel: DistributionSegment[];
  byCostCenter: DistributionSegment[];
  byCompany: DistributionSegment[];
}

export interface DemographicDistribution {
  byGender: DistributionSegment[];
  byAgeGroup: DistributionSegment[];
  byTenure: DistributionSegment[];
}

export interface EmploymentDistribution {
  byEmploymentType: DistributionSegment[];
  byStartYear: DistributionSegment[];
}

export interface DistributionSegment {
  name: string;
  count: number;
  percentage: number;
  color: string;
  subSegments?: DistributionSegment[];
}

// Visualization Types
export interface ChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  fill: string;
}

export interface TreemapData {
  name: string;
  size: number;
  children?: TreemapData[];
  color?: string;
}

export interface StackedBarData {
  category: string;
  total: number;
  segments: { [key: string]: number };
}

// Statistics Types
export interface WorkforceStatistics {
  totalEmployees: number;
  countries: number;
  regions: number;
  siteLocations: number;
  departments: number;
  jobLevels: number;
  companies: number;
  costCenters: number;
  averageAge: number;
  averageTenure: number;
  genderDiversityIndex: number;
  geographicSpread: number;
}

// Table Data Types
export interface WorkforceTableData {
  geographic: GeographicTableRow[];
  organizational: OrganizationalTableRow[];
  demographic: DemographicTableRow[];
  employment: EmploymentTableRow[];
}

export interface GeographicTableRow {
  location: string;
  type: 'Country' | 'Region' | 'Site';
  employees: number;
  percentage: number;
  companies: string[];
  departments: string[];
}

export interface OrganizationalTableRow {
  unit: string;
  type: 'Department' | 'Job Level' | 'Cost Center' | 'Company';
  employees: number;
  percentage: number;
  countries: string[];
  avgTenure: number;
}

export interface DemographicTableRow {
  category: string;
  type: 'Gender' | 'Age Group' | 'Tenure Group';
  employees: number;
  percentage: number;
  avgAge?: number;
  avgTenure?: number;
}

export interface EmploymentTableRow {
  type: string;
  category: 'Employment Type' | 'Start Year';
  employees: number;
  percentage: number;
  retention: number;
}

// Filter Types
export interface WorkforceFilters {
  countries?: string[];
  regions?: string[];
  departments?: string[];
  jobLevels?: string[];
  companies?: string[];
  employmentTypes?: string[];
  genders?: string[];
  ageGroups?: string[];
  tenureGroups?: string[];
}

// Hook Response Type
export interface UseWorkforceDistributionResponse {
  employees: WorkforceEmployee[];
  distribution: WorkforceDistribution;
  statistics: WorkforceStatistics;
  tableData: WorkforceTableData;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} 