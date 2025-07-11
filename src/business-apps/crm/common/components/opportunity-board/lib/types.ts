
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
  name: string;
  description?: string;
  estimatedAmount?: number;
  winningChance?: number;
  stageId?: string;
  stage?: string;
  closeDate?: string;
  status?: string;
  account?: {
    id?: string;
    name: string;
  };
  ownerEmployee?: {
    id?: string;
    fullName: string;
  };
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  lastActivityAt?: string;
  tags?: string[];
  version: number;
  sourceApp?: string;
} 