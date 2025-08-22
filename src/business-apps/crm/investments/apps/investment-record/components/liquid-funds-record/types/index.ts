import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext';
import type { Investment, LiquidFundInvestment } from '@/common/data/investment';

// Re-export the centralized types for convenience
export type { Investment, LiquidFundInvestment } from '@/common/data/investment';

export interface LiquidFundInvestmentData {
  // Core investment data
  investment: Investment;
  // Liquid fund-specific data if available
  liquidFundInvestment?: LiquidFundInvestment;
}

export interface LiquidFundRecordProps extends BusinessAppContextProps {
  investmentId?: string;
} 