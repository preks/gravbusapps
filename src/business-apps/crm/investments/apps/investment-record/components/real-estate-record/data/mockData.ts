import { RealEstateInvestmentRecord } from '../types';

export const realEstateMockData: RealEstateInvestmentRecord = {
  real_estate_investment: {
    id: "re-001",
    investment_id: "inv-002",
    property_type_ref: "Catalog:PropertyType:v1:COMMERCIAL_OFFICE",
    property_location: "Berlin, Germany",
    property_size_sqm: 15000,
    purchase_price: 25000000,
    current_market_value: 26500000,
    rental_income_annual: 1800000,
    occupancy_rate: 95.0,
    rental_yield_percentage: 6.8,
    property_management_company: "Berlin Property Management GmbH",
    last_valuation_date: "2024-12-01",
    property_condition_ref: "Catalog:PropertyCondition:v1:EXCELLENT"
  },
  investment: {
    id: "inv-002",
    account_id: "acc-001",
    name: "Downtown Office Complex",
    investment_group_ref: "Catalog:InvestmentGroup:v1:REAL_ESTATE",
    investment_type_ref: "Catalog:InvestmentType:v1:DIRECT_PROPERTY",
    investment_phase_ref: "Catalog:InvestmentPhase:v1:MONITORING",
    investment_status_ref: "Catalog:InvestmentStatus:v1:ACTIVE",
    investment_risk_level_ref: "Catalog:RiskLevel:v1:MEDIUM",
    currency_ref: "Currency:v1:EUR",
    opportunity_id: "opp-002",
    owner_employee_id: "emp-002",
    acquisition_date: "2020-03-15",
    planned_exit_date: "2030-03-15",
    notes_summary: "Prime commercial office complex in Berlin's financial district with stable long-term tenants and strong rental yields.",
    book_value: 26500000,
    market_value: 26500000,
    initial_investment_amount: 25000000,
    total_investment_amount: 27000000,
    stake_percent: 100.0,
    debt_financing: 15000000,
    leverage_ratio: 0.56
  },
  company_details: {
    name: "Berlin Property Management GmbH",
    address: {
      street: "Potsdamer Platz 10",
      city: "Berlin",
      state: "Berlin",
      country: "Germany",
      postal_code: "10785"
    },
    revenue: 45000000,
    employees: 85,
    industry: "Real Estate Management",
    website: "https://www.berlin-property-mgmt.de",
    phone: "+49 30 2025 4800",
    email: "info@berlin-property-mgmt.de",
    founded_year: 2005,
    ceo: "Klaus Mueller",
    description: "Leading property management company in Berlin specializing in commercial real estate with over €2B assets under management."
  },
  metrics: {
    roi_percentage: 18.2,
    multiple_of_invested_capital: 1.18,
    valuation_change_percentage: 6.0,
    annual_return_percentage: 6.8,
    years_held: 4.8,
    debt_to_equity_ratio: 1.25,
    ebitda_multiple: 0.0, // Not applicable for real estate
    revenue_multiple: 0.0, // Not applicable for real estate
    ownership_value: 26500000
  }
}; 