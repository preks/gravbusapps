import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext';

// Private Equity Investment specific data
export interface PrivateEquityInvestment {
  id: string;
  investment_id: string;
  investment_role_ref: string;
  fund_name: string;
  fund_vintage_year: number;
  fund_size: number;
  committed_capital: number;
  called_capital: number;
  distributed_capital: number;
  current_nav: number;
  irr_percentage: number;
  multiple_tvpi: number;
  fund_manager: string;
  investment_strategy: string;
  geographic_focus: string;
  sector_focus: string;
}

// Base Investment data (same as equity)
export interface Investment {
  id: string;
  account_id: string;
  name: string;
  investment_group_ref: string;
  investment_type_ref: string;
  investment_phase_ref: string;
  investment_status_ref: string;
  investment_risk_level_ref: string;
  currency_ref: string;
  opportunity_id: string;
  owner_employee_id: string;
  acquisition_date: string;
  planned_exit_date?: string;
  notes_summary: string;
  book_value: number;
  market_value: number;
  initial_investment_amount: number;
  total_investment_amount: number;
  stake_percent: number;
  debt_financing: number;
  leverage_ratio: number;
}

// Company Details (same as equity)
export interface CompanyDetails {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
  revenue: number;
  employees: number;
  industry: string;
  website: string;
  phone: string;
  email: string;
  founded_year: number;
  ceo: string;
  description: string;
}

// Investment Metrics (same as equity)
export interface InvestmentMetrics {
  roi_percentage: number;
  multiple_of_invested_capital: number;
  valuation_change_percentage: number;
  annual_return_percentage: number;
  years_held: number;
  debt_to_equity_ratio: number;
  ebitda_multiple: number;
  revenue_multiple: number;
  ownership_value: number;
}

// Complete Private Equity Investment Record
export interface PrivateEquityInvestmentRecord {
  private_equity_investment: PrivateEquityInvestment;
  investment: Investment;
  company_details: CompanyDetails;
  metrics: InvestmentMetrics;
}

// Props for the Private Equity Record component
export interface PrivateEquityRecordProps extends BusinessAppContextProps {
  // Add any additional props specific to private equity record
} 