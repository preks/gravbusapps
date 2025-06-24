import { Stage } from './types';

// The 5 fixed stages as shown in the UI screenshot
export const FIXED_STAGES: Stage[] = [
  {
    id: 'NEW_OPPORTUNITY',
    name: 'New Opportunity',
    order: 1,
    probability: 0,
    rotting: false,
    rottingDays: 0
  },
  {
    id: 'IN_QUALIFICATION',
    name: 'In Qualification',
    order: 2,
    probability: 25,
    rotting: false,
    rottingDays: 0
  },
  {
    id: 'PROPOSAL_IN_PROGRESS',
    name: 'Proposal In Progress',
    order: 3,
    probability: 50,
    rotting: false,
    rottingDays: 0
  },
  {
    id: 'NEGOTIATION',
    name: 'Negotiation',
    order: 4,
    probability: 75,
    rotting: false,
    rottingDays: 0
  },
  {
    id: 'CLOSED',
    name: 'Closed',
    order: 5,
    probability: 100,
    rotting: false,
    rottingDays: 0
  }
];
