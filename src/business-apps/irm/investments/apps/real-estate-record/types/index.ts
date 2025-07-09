import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext';

// Real Estate Investment specific data
export interface RealEstateInvestment {
  id: string;
  investment_id: string;
  property_type_ref: string;
  property_location: string;
  property_size_sqm: number;
  purchase_price: number;
  current_market_value: number;
  rental_income_annual: number;
  occupancy_rate: number;
  property_management_company: string;
  last_valuation_date: string;
  rental_yield_percentage: number;
  property_condition_ref: string;
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

// Complete Real Estate Investment Record
export interface RealEstateInvestmentRecord {
  real_estate_investment: RealEstateInvestment;
  investment: Investment;
  company_details: CompanyDetails;
  metrics: InvestmentMetrics;
}

// Props for the Real Estate Record component
export interface RealEstateRecordProps extends BusinessAppContextProps {
  // Add any additional props specific to real estate record
} 