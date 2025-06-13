"use server"

export interface Company {
  id: string
  name: string
  industry?: string
  size?: string
  location?: string
  website?: string
  status?: string
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  companyId?: string
  position?: string
  status?: string
  createdAt: string
  updatedAt: string
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Stage {
  id: string
  pipelineId: string
  name: string
  description?: string
  color?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface StageRequirement {
  id: string
  stageId: string
  type: "document" | "activity" | "decision"
  description: string
  documentTypes?: string[]
  activityTypes?: string[]
  decisionStatus?: "approved" | "rejected" | "pending" | "any"
  createdAt: string
  updatedAt: string
}

export interface Opportunity {
  id: string
  name: string
  type: "incoming" | "outgoing"
  companyId?: string
  value?: string
  currency?: string
  stageId?: string
  pipelineId?: string
  probability?: string
  expectedCloseDate?: string
  ownerId?: string
  description?: string
  attributes?: Record<string, any>
  investmentId?: string 
  createdAt?: string
  updatedAt: string
}

export interface Activity {
  id: string
  opportunityId: string
  type: "call" | "email" | "meeting" | "note"
  title: string
  description?: string
  date: string
  userId?: string
  user?: {
    name: string
    avatar: string
    initials: string
  }
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  opportunityId: string
  name: string
  type?: string
  size?: string
  url?: string
  uploadedById?: string
  uploadedBy?: string
  uploadedAt: string
  createdAt: string
  updatedAt: string
}

export interface Decision {
  id: string
  opportunityId: string
  title: string
  description?: string
  status: "pending" | "approved" | "rejected"
  date: string
  decisionMaker?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  opportunityId: string
  title: string
  description?: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  dueDate?: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export interface OpportunityWithRelations extends Opportunity {
  companyName?: string
  stageName?: string
  pipelineName?: string
  investmentName?: string
  investmentId?: string
  account?: string
  contact?: string
  lastInteraction?: string
  createdAt?: string
  closeDate?: string
  owner?: string
  estimatedAmount?: number
  winningChance?: number
  stage?: string
}

export interface DetailedOpportunity extends OpportunityWithRelations {
  contacts: Array<{
    id: string | number
    name: string
    position: string
    email: string
    phone: string
  }>
  activities: Activity[]
  documents: Document[]
  decisions: Decision[]
  tasks: Task[]
  investment?: InvestmentWithRelations 
}

export interface TeamMember {
  id: string
  name: string
  position: string
  email: string
  avatar: string
  initials: string
}

export interface Team {
  id: string
  name: string
  description: string
  color: string
  members: TeamMember[]
}

// Investment types and interfaces
export type InvestmentStage = "Pipeline" | "Hold" | "Exit"

export type InvestmentType =
  | "Strategic Investment"
  | "Majority Stake"
  | "Minority Stake"
  | "Venture Capital"
  | "Co-Investment"
  | "Real Estate Property"
  | "Real Estate Project Development"
  | "Real Estate Mezzanine Loan"
  | "Real Estate Other"
  | "Private Equity"
  | "Liquid Fund Bank"
  | "Liquid Fund Strategic Liquidity"

export type InvestmentCategory =
  | "Strategic Investments"
  | "Investments"
  | "Real Estate"
  | "Private Equity"
  | "Liquid Funds"

export interface Investment {
  id: string
  name: string
  type: InvestmentType
  category: InvestmentCategory
  stage: InvestmentStage
  amount: number
  currency: string
  entryDate?: string
  expectedExitDate?: string
  actualExitDate?: string
  irr?: number 
  roi?: number 
  multiple?: number 
  holdingPeriod?: number 
  companyId?: string
  description?: string
  status: "active" | "pending" | "exited"
  riskRating?: number
  performanceRating?: number 
  geographicLocation?: string
  sector?: string
  investmentThesis?: string
  exitStrategy?: string
  keyRisks?: string[]
  keyMetrics?: Record<string, any>
  documents?: string[] 
  teamMembers?: string[] 
  opportunityIds?: string[] 
  createdAt: string
  updatedAt: string
}

export interface InvestmentWithRelations extends Investment {
  companyName?: string
  opportunities?: OpportunityWithRelations[] 
}

export interface DetailedInvestment extends InvestmentWithRelations {
  activities: Activity[]
  documentDetails: Document[]
  decisions: Decision[]
  financials: InvestmentFinancial[]
  performance: InvestmentPerformance[]
}

export interface InvestmentFinancial {
  id: string
  investmentId: string
  date: string
  type: "valuation" | "distribution" | "capital-call" | "expense" | "income"
  amount: number
  currency: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface InvestmentPerformance {
  id: string
  investmentId: string
  date: string
  metricType: "irr" | "roi" | "multiple" | "nav" | "custom"
  metricName: string
  value: number
  target?: number
  benchmark?: number
  createdAt: string
  updatedAt: string
}