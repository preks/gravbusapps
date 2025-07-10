import { EquityInvestmentRecord } from '../types';

export const equityMockData: EquityInvestmentRecord = {
  equity_investment: {
    id: "eq-001",
    investment_id: "inv-001",
    company_name: "TechCorp Solutions Inc.",
    equity_type_ref: "Catalog:EquityType:v1:COMMON_STOCK",
    number_of_shares: 250000,
    share_price_current: 42.50,
    share_price_purchase: 35.00,
    dividend_yield_percentage: 2.1,
    last_dividend_date: "2024-09-15",
    sector_ref: "Catalog:Sector:v1:TECHNOLOGY",
    market_cap: 2100000000,
    pe_ratio: 18.5,
    beta: 1.23
  },
  investment: {
    id: "inv-001",
    account_id: "acc-001",
    name: "TechCorp Acquisition",
    investment_group_ref: "Catalog:InvestmentGroup:v1:EQUITY",
    investment_type_ref: "Catalog:InvestmentType:v1:STOCKS",
    investment_phase_ref: "Catalog:InvestmentPhase:v1:MONITORING",
    investment_status_ref: "Catalog:InvestmentStatus:v1:ACTIVE",
    investment_risk_level_ref: "Catalog:RiskLevel:v1:MEDIUM",
    currency_ref: "Currency:v1:USD",
    opportunity_id: "opp-001",
    owner_employee_id: "emp-001",
    acquisition_date: "2021-06-15",
    planned_exit_date: "2026-06-15",
    notes_summary: "Strategic investment in fast-growing technology company with strong market position and innovative products.",
    book_value: 8750000,
    market_value: 10625000,
    initial_investment_amount: 8750000,
    total_investment_amount: 8750000,
    stake_percent: 12.5,
    debt_financing: 0,
    leverage_ratio: 0.0
  },
  company_details: {
    name: "TechCorp Solutions Inc.",
    address: {
      street: "1234 Tech Drive",
      city: "San Francisco",
      state: "California",
      country: "United States",
      postal_code: "94105"
    },
    revenue: 450000000,
    employees: 1250,
    industry: "Software & Technology",
    website: "https://www.techcorp-solutions.com",
    phone: "+1 415 555 0123",
    email: "investors@techcorp-solutions.com",
    founded_year: 2015,
    ceo: "Sarah Johnson",
    description: "Leading provider of enterprise software solutions with focus on AI and machine learning technologies serving Fortune 500 companies."
  },
  metrics: {
    roi_percentage: 21.4,
    multiple_of_invested_capital: 1.214,
    valuation_change_percentage: 21.4,
    annual_return_percentage: 7.8,
    years_held: 3.6,
    debt_to_equity_ratio: 0.0,
    ebitda_multiple: 15.2,
    revenue_multiple: 4.7,
    ownership_value: 10625000
  }
}; 