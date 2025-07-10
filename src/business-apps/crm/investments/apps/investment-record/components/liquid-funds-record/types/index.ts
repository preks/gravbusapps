import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext';

export interface LiquidFundInvestment {
  id: string;
  investment_id: string;
  account_number: string;
  early_termination_allowed: boolean;
  interest_rate: number;
  interest_payment_frequency_ref: string;
  maturity_date: string;
}

export interface Investment {
  id: string;
  account_id: string;
  account_name: string;
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
  exit_date?: string;
  planned_exit_date?: string;
  notes_summary?: string;
  book_value: number;
  market_value: number;
  initial_investment_amount: number;
  total_investment_amount: number;
  stake_percent: number;
  debt_financing: number;
  leverage_ratio: number;
}

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

export interface LiquidFundInvestmentMetrics {
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

export interface LiquidFundInvestmentRecord {
  liquid_fund_investment: LiquidFundInvestment;
  investment: Investment;
  company_details: CompanyDetails;
  metrics: LiquidFundInvestmentMetrics;
}

export interface LiquidFundRecordProps extends BusinessAppContextProps {
  investmentId?: string;
} 