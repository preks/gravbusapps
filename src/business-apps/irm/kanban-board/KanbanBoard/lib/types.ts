// Type definitions for the Kanban board

export interface Stage {
  id: string;
  name: string;
  order: number;
  probability: number;
  rotting: boolean;
  rottingDays: number;
}

export interface Opportunity {
  id: string;
  name: string;                // Opportunity name
  description?: string;
  estimatedAmount?: number;    // Amount for the opportunity
  winningChance?: number;
  stageId?: string;           // For internal use
  stage?: string;             // Stage name (e.g. NEW_OPPORTUNITY)
  closeDate?: string;
  status?: string;
  account?: {                 // Company/account information
    id?: string;
    name: string;
  };
  ownerEmployee?: {           // Owner information
    id?: string;
    fullName: string;
  };
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  lastActivityAt?: string;
  tags?: string[];
  version: number;
}
