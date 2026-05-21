/**
 * Company Record Types
 * TypeScript interfaces for Company Record components
 */

import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Company } from '@/common/data/orgchart/types/companyTypes'

// Re-export CompanyDocument from types for convenience
export type { CompanyDocument } from '@/common/data/orgchart/types/companyTypes'

/**
 * Props for the main CompanyRecord component
 */
export interface CompanyRecordProps extends BusinessAppContextProps {
  companyId?: string
  onBack?: () => void
}

/**
 * Props for the internal CompanyRecordContent component
 */
export interface CompanyRecordContentProps extends BusinessAppContextProps {
  companyId: string
  onBack: () => void
}

/**
 * Props for the HomeView component
 */
export interface HomeViewProps extends BusinessAppContextProps {
  companyId: string
  company: Company | null
}

/**
 * Props for the DocumentView component
 */
export interface DocumentViewProps extends BusinessAppContextProps {
  companyId: string
}
