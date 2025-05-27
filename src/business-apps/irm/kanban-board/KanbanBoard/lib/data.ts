// Types
export type Role = "sales_rep" | "sales_manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  category: string;
  isDefault?: boolean;
}

export interface Stage {
  id: string;
  name: string;
  pipelineId: string;
  probability: number;
  rotting: boolean;
  rottingDays: number;
  order: number;
}

export interface Opportunity {
  id: string;
  title: string;
  description?: string;
  value: number;
  pipelineId: string;
  stageId: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  company: string;
  contact?: string;
  tags?: string[];
  stageEnteredAt?: string; 
  rottingDays?: number;
}

// Mock data
export const currentUser: User = {
  id: "user-1",
  name: "John Doe",
  email: "john.doe@example.com",
  role: "sales_manager",
  avatar: "/placeholder.svg?height=40&width=40",
};

export const pipelines: Pipeline[] = [
  {
    id: "pipeline-1",
    name: "Default Sales Pipeline",
    category: "Sales",
    isDefault: true,
  },
  {
    id: "pipeline-2",
    name: "Nuclear Power Plants",
    category: "Energy",
  },
  {
    id: "pipeline-3",
    name: "Diapers",
    category: "Consumer Goods",
  },
];

export const stages: Stage[] = [
  {
    id: "stage-1",
    name: "Qualified",
    pipelineId: "pipeline-1",
    probability: 10,
    rotting: true,
    rottingDays: 7,
    order: 0,
  },
  {
    id: "stage-2",
    name: "Contact Made",
    pipelineId: "pipeline-1",
    probability: 25,
    rotting: true,
    rottingDays: 5,
    order: 1,
  },
  {
    id: "stage-3",
    name: "Meeting Scheduled",
    pipelineId: "pipeline-1",
    probability: 50,
    rotting: true,
    rottingDays: 3,
    order: 2,
  },
  {
    id: "stage-4",
    name: "Proposal Sent",
    pipelineId: "pipeline-1",
    probability: 75,
    rotting: true,
    rottingDays: 7,
    order: 3,
  },
  {
    id: "stage-5",
    name: "Contract Sent",
    pipelineId: "pipeline-1",
    probability: 90,
    rotting: true,
    rottingDays: 5,
    order: 4,
  },
];

export const opportunities: Opportunity[] = [
  {
    id: "opp-1",
    title: "Enterprise Software Solution",
    description: "Complete software package for ABC Corp",
    value: 150000,
    pipelineId: "pipeline-1",
    stageId: "stage-1",
    assignedTo: "user-1",
    createdAt: "2023-01-15T10:00:00Z",
    updatedAt: "2023-01-20T14:30:00Z",
    lastActivityAt: "2023-01-20T14:30:00Z",
    company: "ABC Corp",
    contact: "John Smith",
    tags: ["enterprise", "software"],
  },
  {
    id: "opp-2",
    title: "Cloud Migration Project",
    description: "Migrate on-prem infrastructure to cloud",
    value: 200000,
    pipelineId: "pipeline-1",
    stageId: "stage-2",
    assignedTo: "user-1",
    createdAt: "2023-01-25T13:20:00Z",
    updatedAt: "2023-02-15T16:10:00Z",
    lastActivityAt: "2023-02-15T16:10:00Z",
    company: "TechCorp",
    contact: "Alice Brown",
    tags: ["cloud", "migration"],
  },
  {
    id: "opp-3",
    title: "CRM Implementation",
    description: "New CRM system for sales team",
    value: 75000,
    pipelineId: "pipeline-1",
    stageId: "stage-3",
    assignedTo: "user-1",
    createdAt: "2023-01-30T09:15:00Z",
    updatedAt: "2023-02-10T11:45:00Z",
    lastActivityAt: "2023-02-10T11:45:00Z",
    company: "SalesCo",
    contact: "Bob Johnson",
    tags: ["crm", "sales"],
  },
];

export function calculateColumnStats(opportunities: Opportunity[], probability: number) {
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedValue = totalValue * (probability / 100);
  const count = opportunities.length;

  return {
    totalValue,
    weightedValue,
    count,
  };
}