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