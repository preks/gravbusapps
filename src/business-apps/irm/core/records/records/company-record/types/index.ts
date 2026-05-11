import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentCompany } from '@/common/data/investment/types/investmentCompanyTypes'

export interface CompanyRecordProps extends BusinessAppContextProps {
  investmentCompanyId?: string
  onBack?: () => void
}

export interface CompanyRecordContentProps extends BusinessAppContextProps {
  investmentCompanyId: string
  onBack: () => void
}

export interface DetailsViewProps extends BusinessAppContextProps {
  investmentCompany: InvestmentCompany
}

export interface DocumentViewProps {
  investmentCompanyId: string
  context: BusinessAppContextProps
}
