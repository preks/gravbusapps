import type { CommonAccountContact, CommonOpportunityContact } from '@/common/data/relations/types/relationTypes'
import type { ContactType } from './investmentEnums'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'

export interface InvestmentAccountContact extends CommonAccountContact {
  account?: InvestmentAccount // InvestmentAccount
  contact?: InvestmentContact // InvestmentContact
  contactType?: ContactType
}

export interface InvestmentOpportunityContact extends CommonOpportunityContact {
  contact?: InvestmentContact // InvestmentContact
  contactType?: ContactType
  opportunity?: InvestmentOpportunity // InvestmentOpportunity
}
