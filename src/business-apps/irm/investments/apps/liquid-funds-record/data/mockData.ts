import { LiquidFundInvestmentRecord } from '../types';

export const liquidFundMockData: LiquidFundInvestmentRecord = {
  liquid_fund_investment: {
    id: "lf-001",
    investment_id: "inv-001",
    account_number: "LF-ACC-789456123",
    early_termination_allowed: true,
    interest_rate: 3.75,
    interest_payment_frequency_ref: "Catalog:InterestPaymentFrequency:v1:QUARTERLY",
    maturity_date: "2027-12-31"
  },
  investment: {
    id: "inv-001",
    account_id: "acc-001",
    name: "Premium Money Market Fund",
    investment_group_ref: "Catalog:InvestmentGroup:v1:LIQUID_FUNDS",
    investment_type_ref: "Catalog:InvestmentType:v1:MONEY_MARKET",
    investment_phase_ref: "Catalog:InvestmentPhase:v1:MONITORING",
    investment_status_ref: "Catalog:InvestmentStatus:v1:ACTIVE",
    investment_risk_level_ref: "Catalog:RiskLevel:v1:LOW",
    currency_ref: "Currency:v1:EUR",
    opportunity_id: "opp-001",
    owner_employee_id: "emp-001",
    acquisition_date: "2023-01-15",
    planned_exit_date: "2027-12-31",
    notes_summary: "High-yield money market fund with excellent liquidity and capital preservation focus.",
    book_value: 2500000,
    market_value: 2593750,
    initial_investment_amount: 2500000,
    total_investment_amount: 2500000,
    stake_percent: 100.0,
    debt_financing: 0,
    leverage_ratio: 0.0
  },
  company_details: {
    name: "Global Asset Management Ltd.",
    address: {
      street: "456 Financial District",
      city: "Frankfurt",
      state: "Hessen",
      country: "Germany",
      postal_code: "60311"
    },
    revenue: 1200000000,
    employees: 850,
    industry: "Asset Management & Financial Services",
    website: "https://www.global-asset-management.de",
    phone: "+49 69 1234 5678",
    email: "investors@global-asset-management.de",
    founded_year: 1995,
    ceo: "Michael Weber",
    description: "Leading European asset management company specializing in liquid funds and money market instruments with focus on capital preservation and liquidity."
  },
  metrics: {
    roi_percentage: 3.75,
    multiple_of_invested_capital: 1.0375,
    valuation_change_percentage: 3.75,
    annual_return_percentage: 3.75,
    years_held: 1.9,
    debt_to_equity_ratio: 0.0,
    ebitda_multiple: 12.5,
    revenue_multiple: 2.1,
    ownership_value: 2593750
  }
}; 