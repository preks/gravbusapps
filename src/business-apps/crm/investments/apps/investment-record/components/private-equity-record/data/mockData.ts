import { PrivateEquityInvestmentRecord } from '../types';

export const privateEquityMockData: PrivateEquityInvestmentRecord = {
  private_equity_investment: {
    id: "pe-001",
    investment_id: "inv-003",
    investment_role_ref: "Catalog:InvestmentRole:v1:LIMITED_PARTNER",
    fund_name: "European Growth Fund IV",
    fund_vintage_year: 2021,
    fund_size: 750000000,
    committed_capital: 15000000,
    called_capital: 9500000,
    distributed_capital: 3200000,
    current_nav: 11800000,
    irr_percentage: 18.5,
    multiple_tvpi: 1.58,
    fund_manager: "Capital Partners Europe",
    investment_strategy: "Growth Capital",
    geographic_focus: "Europe",
    sector_focus: "Technology & Healthcare"
  },
  investment: {
    id: "inv-003",
    account_id: "acc-001",
    name: "European Growth Fund IV",
    investment_group_ref: "Catalog:InvestmentGroup:v1:PRIVATE_EQUITY",
    investment_type_ref: "Catalog:InvestmentType:v1:FUND_INVESTMENT",
    investment_phase_ref: "Catalog:InvestmentPhase:v1:MONITORING",
    investment_status_ref: "Catalog:InvestmentStatus:v1:ACTIVE",
    investment_risk_level_ref: "Catalog:RiskLevel:v1:MEDIUM",
    currency_ref: "Currency:v1:EUR",
    opportunity_id: "opp-003",
    owner_employee_id: "emp-003",
    acquisition_date: "2021-06-30",
    planned_exit_date: "2026-12-31",
    notes_summary: "Limited partner investment in a leading European growth capital fund focusing on technology and healthcare sectors.",
    book_value: 11800000,
    market_value: 11800000,
    initial_investment_amount: 15000000,
    total_investment_amount: 15000000,
    stake_percent: 2.0,
    debt_financing: 0,
    leverage_ratio: 0.0
  },
  company_details: {
    name: "Capital Partners Europe Ltd",
    address: {
      street: "1 Canary Wharf",
      city: "London",
      state: "England",
      country: "United Kingdom",
      postal_code: "E14 5AB"
    },
    revenue: 95000000,
    employees: 120,
    industry: "Private Equity & Investment Management",
    website: "https://www.capitalpartners-europe.com",
    phone: "+44 20 7946 0958",
    email: "info@capitalpartners-europe.com",
    founded_year: 2008,
    ceo: "James Richardson",
    description: "Leading European private equity firm specializing in growth capital investments with over €2.5B assets under management across technology and healthcare sectors."
  },
  metrics: {
    roi_percentage: 24.8,
    multiple_of_invested_capital: 1.58,
    valuation_change_percentage: 24.2,
    annual_return_percentage: 18.5,
    years_held: 3.5,
    debt_to_equity_ratio: 0.0,
    ebitda_multiple: 0.0, // Not applicable for fund investment
    revenue_multiple: 0.0, // Not applicable for fund investment
    ownership_value: 11800000
  }
}; 