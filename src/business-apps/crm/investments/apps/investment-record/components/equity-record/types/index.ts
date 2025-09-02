import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext';
import type { Investment, EquityInvestment } from '@/common/data/investment';

// Re-export the centralized types for convenience
export type { Investment, EquityInvestment } from '@/common/data/investment';

export interface EquityInvestmentData {
  // Core investment data
  investment: Investment;
  // Equity-specific data if available
  equityInvestment?: EquityInvestment;
}

export interface EquityRecordProps extends BusinessAppContextProps {
  investmentId?: string;
} 