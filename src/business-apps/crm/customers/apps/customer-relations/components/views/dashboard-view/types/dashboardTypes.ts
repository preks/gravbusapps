export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PipelineInfo {
  id: string;
  name: string;
  ref: string;
  description?: string;
  color?: string;
}

export interface OpportunityStage {
  id: string;
  name: string;
  ref: string;
  order: number;
  color?: string;
}

export interface OpportunityData {
  id: string;
  name: string;
  estimatedAmount: number;
  currency: string;
  status: string;
  stage: OpportunityStage;
  closeDate?: Date;
  createdAt: Date;
  ownerEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
  winningChance?: number;
}

export interface LeadData {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  status: string;
  source?: string;
  createdAt: Date;
  ownerEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

export interface SalesActivityData {
  id: string;
  title: string;
  type: string;
  description?: string;
  createdAt: Date;
  completedAt?: Date;
  ownerEmployeeId: string;
  leadId?: string;
  opportunityId?: string;
  accountId?: string;
}

export interface SalesRepPerformance {
  employeeId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dealsWon: number;
  dealsLost: number;
  totalValue: number;
  winRate: number;
  activitiesCount: number;
}

export interface WinRateMetrics {
  monthToDate: {
    won: number;
    lost: number;
    winRate: number;
  };
  quarterToDate: {
    won: number;
    lost: number;
    winRate: number;
  };
}

export interface ActivityVolumeMetrics {
  last7Days: {
    total: number;
    calls: number;
    emails: number;
    meetings: number;
  };
  last30Days: {
    total: number;
    calls: number;
    emails: number;
    meetings: number;
  };
}

export interface OpportunityFunnelData {
  stage: OpportunityStage;
  count: number;
  value: number;
  percentage: number;
}

export interface PipelineMetrics {
  totalOpportunities: number;
  totalValue: number;
  avgDealSize: number;
  conversionRate: number;
  avgSalesCycle: number;
}

export interface PipelineData {
  pipeline: PipelineInfo;
  metrics: PipelineMetrics;
  opportunities: OpportunityData[];
  activities: SalesActivityData[];
  winRateMetrics: WinRateMetrics;
  activityVolume: ActivityVolumeMetrics;
  funnelData: OpportunityFunnelData[];
  leaderboard: SalesRepPerformance[];
}

export interface DashboardData {
  pipelines: PipelineData[];
  lastUpdated: Date;
  isLoading: boolean;
  error?: string;
}

export interface DashboardFilters {
  dateRange: DateRange;
  selectedPipelines: string[];
  selectedOwners: string[];
}

export interface KpiTileProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  icon?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}