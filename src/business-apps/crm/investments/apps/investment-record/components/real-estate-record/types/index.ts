import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext';
import type { Investment, RealEstateInvestment } from '@/common/data/investment';

// Re-export the centralized types for convenience
export type { Investment, RealEstateInvestment } from '@/common/data/investment';

export interface RealEstateInvestmentData {
  // Core investment data
  investment: Investment;
  // Real estate-specific data if available
  realEstateInvestment?: RealEstateInvestment;
}

// Props for the Real Estate Record component
export interface RealEstateRecordProps extends BusinessAppContextProps {
  investmentId?: string;
} 