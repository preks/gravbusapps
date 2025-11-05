/**
 * Banking Domain Types for Bank Manager Workplace
 */

export interface BankingKPIs {
  dailyDeposits: number
  dailyWithdrawals: number
  loanApplications: {
    pending: number
    approved: number
    rejected: number
    total: number
  }
  creditPortfolio: {
    total: number
    healthy: number
    attention: number
    risk: number
  }
  customerSatisfaction: number
  branchPerformance: {
    score: number
    trend: 'up' | 'down' | 'stable'
    rank?: number
    totalBranches?: number
  }
  complianceScore: number
}

export interface LoanApplication {
  id: string
  customerName: string
  customerId?: string
  loanAmount: number
  loanType: 'personal' | 'mortgage' | 'business' | 'auto'
  applicationDate: string
  dueDate: string
  status: 'pending' | 'approved' | 'rejected' | 'info-requested'
  priority: 'high' | 'medium' | 'low'
  creditScore?: number
  riskLevel?: 'low' | 'medium' | 'high'
}

export interface BankingApproval {
  id: string
  type: 'loan' | 'credit-limit' | 'investment' | 'expense' | 'overtime' | 'personal-change'
  title: string
  description: string
  amount?: number
  currency?: string
  requestedBy: {
    id: string
    name: string
    role?: string
  }
  priority: 'high' | 'medium' | 'low'
  dueDate: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
  aiSuggestion?: {
    recommendation: 'approve' | 'reject' | 'review'
    confidence: number
    rationale: string
    riskFactors?: string[]
  }
}

export interface VIPCustomer {
  id: string
  name: string
  accountType: string
  relationshipManager?: string
  totalAssets: number
  lastContact?: string
  nextScheduledMeeting?: string
  priority: 'vip' | 'premium' | 'standard'
  status: 'active' | 'at-risk' | 'opportunity'
  recentActivity?: {
    type: string
    description: string
    date: string
  }[]
  opportunities?: {
    id: string
    type: string
    value: number
    probability: number
  }[]
}

export interface AIInsight {
  id: string
  type: 'action' | 'warning' | 'opportunity' | 'information'
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  suggestedAction?: string
  actionLabel?: string
  deepLink?: string
  timestamp: string
  context?: {
    entityId?: string
    entityType?: 'customer' | 'employee' | 'approval' | 'task'
    metadata?: Record<string, any>
  }
}

export interface ActivityItem {
  id: string
  type: 'approval' | 'customer-interaction' | 'team-activity' | 'system-notification' | 'process-completion'
  title: string
  description: string
  timestamp: string
  actor?: {
    id: string
    name: string
    avatar?: string
  }
  status?: 'completed' | 'pending' | 'failed'
  icon?: string
  actionUrl?: string
}

export interface QuickAction {
  id: string
  label: string
  icon: string
  count?: number
  route?: string
  onClick?: () => void
  color?: string
}

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  displayName: string
  email?: string
  phone?: string
  avatar?: string
  jobPosition?: string
  status: 'present' | 'vacation' | 'sick' | 'business-trip' | 'remote'
  performance?: {
    score: number
    trend: 'up' | 'down' | 'stable'
  }
}

export interface BankingDashboardStats {
  teamPresent: number
  teamTotal: number
  pendingApprovals: number
  urgentApprovals: number
  todayTasks: number
  completedTasks: number
  vipCustomersAttention: number
  opportunities: {
    count: number
    totalValue: number
  }
}

