# Investment Report Seeds

This directory contains seed data for investment reports based on **real existing investments** from the GraphQL database.

## Structure Overview

Investment reports follow a **catalog-driven form field pattern**:
- `InvestmentGroup` defines base form fields
- `InvestmentType` can override group fields (or inherit them)
- `LiquidFundInvestmentType` defines additional fields in `additionalProperties`

All reports **must include**:
- `investmentGroupRef` - Reference to InvestmentGroup catalog
- `investmentTypeRef` - Reference to InvestmentType catalog
- `investmentLiquidFundTypeRef` - Reference to LiquidFundInvestmentType (liquid fund reports only)

## Files

### 1. `liquidFundInvestmentReports.json`
- **Investment Count**: 3 real investments
- **Report Frequency**: Monthly (MONTHLY scope)
- **Time Period**: 6 months (May 2024 - October 2024)
- **Total Reports**: 17 payloads
- **Investment Group**: `InvestmentGroup:v1:LIQUID_FUND`
- **Investment Type**: `InvestmentType:v1:CAPTIAL_MARKET` (Strategic Liquidity)
- **Liquid Fund Types**:
  - `InvestmentLiquidFundType:v1:PENSION_FUNDS`
  - `InvestmentLiquidFundType:v1:BONDS`
- **Currencies**: EUR, USD

**Key Structure**:
- Static fields in `liquidFundInvestmentReport` (date, scope, investmentLiquidFundTypeRef, liquidFundInvestment)
- Dynamic form fields in `liquidFundInvestmentReport.additionalProperties` based on catalog form fields
- Form fields include: name, proprietor, bank, quantity, openingBalance, incoming, outgoing, netIncome, realizedGainsLossesCurrency, unrealizedGainsLossesCurrency, closingBalance, timeWeightedPerformance

**Real Investments Used**:
- `60000000-0000-0000-0000-000000000009` - Ionis AI Seed (EUR, Pension Fund)
- `60000000-0000-0000-0000-000000000007` - GammaTech PE (USD, Bonds)
- `60000000-0000-0000-0000-000000000005` - EpsilonBio Venture (EUR, Pension Fund)

### 2. `equityInvestmentReports.json`
- **Investment Count**: 4 real investments
- **Report Frequency**: Quarterly (QUARTERLY scope)
- **Time Period**: 2 years (Q1 2023 - Q4 2024)
- **Total Reports**: 32 payloads
- **Investment Group**: `InvestmentGroup:v1:EQUITY`
- **Investment Types**:
  - `InvestmentType:v1:DISRUPTIVE_TECHNOLOGY` (Technology)
  - `InvestmentType:v1:CO_INVESTMENTS` (Co-Investments)
- **Currencies**: EUR, CHF

**Key Structure**:
- Form fields from EQUITY group define structure (foundationDate, acquisitionDate, totalInvestmentAmount, stakeType, stakePercentage, turnoverAmount, ebitdaAmount, marketValue, investmentMarketValue)
- Equity-specific fields: marketValue, turnoverAmount, ebitdaAmount

**Real Investments Used**:
- `5e4bcd54-2395-4c2d-868f-9cb2fbb0ec1e` - Minority @ Seagull Fishing (EUR, Technology)
- `6bfedaa0-dc38-4825-9a6a-927516599a78` - Majority @ Centauri (EUR, Co-Investments)
- `90e298a0-e19f-4244-84b6-3b8dfb83c746` - Germanico & Co (CHF, Co-Investments)
- `60000000-0000-0000-0000-000000000009` - Ionis AI Seed (EUR, Technology, Seed stage)

### 3. `realEstateInvestmentReports.json`
- **Investment Count**: 3 real investments
- **Report Frequency**: Quarterly (QUARTERLY scope)
- **Time Period**: 2 years (Q1 2023 - Q4 2024)
- **Total Reports**: 24 payloads
- **Investment Group**: `InvestmentGroup:v1:REAL_ESTATE`
- **Investment Types**:
  - `InvestmentType:v1:EXISTING_PROPERTY` (Existing Properties)
  - `InvestmentType:v1:OTHER_REAL_ESTATE` (Others)
- **Currencies**: USD, EUR, HUF

**Key Structure**:
- Form fields from EXISTING_PROPERTY type: buildingYear, size, sizeMeasurementUnit, occupancyPercent, totalInvestmentAmount, annualNetColdRent, funding, stakePercentage, acquisitionDate
- Real estate-specific fields: size, sizeMeasurementUnit, numberOfUnits, occupancyPercent, annualNetColdRent, funding, actualAnnualExpenses, targetAnnualExpenses

**Real Investments Used**:
- `3e53c387-264d-424a-b3fd-d5cd4617530e` - Sengoku Complex (USD, Existing Property)
- `3c43720d-857c-48ae-9dcc-e019280342e0` - Solomon Tower (EUR, Existing Property)
- `b5e76b33-9779-44be-98c6-e82df44c488f` - Opera Center (HUF, Other Real Estate)

## Total Summary
- **Total Investment Report Payloads**: 73
- **Real Investments**: 10 unique investments from production database
- **Date Range**: January 2023 - October 2024
- **Scopes**: MONTHLY (liquid funds), QUARTERLY (equity & real estate)

## Data Structure

### Investment Report (Common Structure)
```json
{
  "investmentReportRequest": {
    "investmentReport": {
      "date": "2024-10-01T00:00:00.000Z",
      "scope": "MONTHLY|QUARTERLY",
      "investmentGroupRef": "InvestmentGroup:v1:...",
      "investmentTypeRef": "InvestmentType:v1:...",
      "investmentStakeTypeRef": "InvestmentStakeType:v1:...",
      "investmentPhaseRef": "InvestmentPhase:v1:...",
      "investmentStatusRef": "InvestmentStatus:v1:...",
      "totalInvestmentAmount": 500000,
      "investmentMarketValue": 1520000,
      "currencyRef": "Currency:v1:EUR",
      "investment": "60000000-0000-0000-0000-000000000009"
    }
  }
}
```

### Liquid Fund Report (Type-Specific)
```json
{
  "liquidFundInvestmentReport": {
    "date": "2024-10-01T00:00:00.000Z",
    "scope": "MONTHLY",
    "investmentLiquidFundTypeRef": "InvestmentLiquidFundType:v1:PENSION_FUNDS",
    "liquidFundInvestment": "80000000-0000-0000-0000-000000000009",
    "additionalProperties": {
      "name": "Ionis AI Seed",
      "proprietor": "Ionis Capital",
      "bank": "BNP Paribas",
      "quantity": 1000,
      "openingBalance": 1520000,
      "incoming": 0,
      "outgoing": 0,
      "netIncome": 4000,
      "realizedGainsLossesCurrency": 2800,
      "unrealizedGainsLossesCurrency": 1200,
      "closingBalance": 1524000,
      "timeWeightedPerformance": 4.8
    }
  }
}
```

### Equity Report (Type-Specific)
```json
{
  "equityInvestmentReport": {
    "date": "2024-10-01T00:00:00.000Z",
    "scope": "QUARTERLY",
    "marketValue": 1650000,
    "turnoverAmount": 330000,
    "ebitdaAmount": 110000,
    "equityInvestment": "90000000-0000-0000-0000-000000000002"
  }
}
```

### Real Estate Report (Type-Specific)
```json
{
  "realEstateInvestmentReport": {
    "date": "2024-10-01T00:00:00.000Z",
    "scope": "QUARTERLY",
    "size": 2000,
    "sizeMeasurementUnitRef": "MeasurementUnit:v1:M2",
    "numberOfUnits": 24,
    "occupancyPercent": 82,
    "annualNetColdRent": 110000,
    "funding": 10000,
    "actualAnnualExpenses": 28000,
    "targetAnnualExpenses": 25000,
    "realEstateInvestment": "51b815c3-a0dd-4277-a164-dc3818e01e0c"
  }
}
```

## Catalog-Driven Form Fields

### Investment Groups and Their Form Fields

**LIQUID_FUND** (Base form fields in additionalProperties):
- openingBalance, incoming, outgoing
- realizedGainsLosses, unrealizedGainsLosses, closingBalance
- timeWeightedPerformance, securityQuantity

**EQUITY** (Form fields from group):
- foundationDate, acquisitionDate, totalInvestmentAmount
- investmentStakeType, stakePercentage
- turnoverAmount, ebitdaAmount, marketValue, investmentMarketValue

**REAL_ESTATE** (No base form fields, inherited from types)

### Liquid Fund Types and Their Additional Properties

All liquid fund types store their form fields in `liquidFundInvestmentReport.additionalProperties`:

**PENSION_FUNDS / BONDS / EQUITY / MONEY_MARKET_FUNDS**:
- name, proprietor, bank, isin, quantity
- openingBalance, incoming, outgoing, netIncome
- realizedGainsLossesCurrency, unrealizedGainsLossesCurrency
- realizedGainsLossesSharePrice, unrealizedGainsLossesSharePrice
- closingBalance, timeWeightedPerformance

**BANK_DEPOSITE**:
- name, proprietor, currency
- openingBalance, incoming, outgoing
- realizedGainsLosses, unrealizedGainsLosses
- closingBalance, timeWeightedPerformance

**FIXED_TERM_DEPOSIT**:
- name, proprietor, currency, maturityDate, interestRate
- openingBalance, incoming, outgoing, incomeInterest
- realizedGainsLossesCurrency, unrealizedGainsLossesCurrency
- closingBalance, timeWeightedPerformance

## Financial Data Patterns

### Liquid Fund
- Market values show **steady growth** (4.8% - 6.8% annual rate)
- Monthly increments based on interest rates
- Values range from €1.5M to $25M
- **additionalProperties populated** with catalog-defined form fields

### Equity
- Market values show **strong growth trends** (10-20% over 2 years)
- Quarterly increases in turnover and EBITDA
- Values range from €100K to €108M
- Form fields follow **EQUITY group definition**

### Real Estate
- Occupancy percentages **increase over time** (58% → 85%)
- Annual rent increases with occupancy
- Property values appreciate steadily (5-10% per year)
- Values range from $1.85M to HUF 16.5M
- Form fields follow **investment type definitions** (EXISTING_PROPERTY, OTHER_REAL_ESTATE)

## Usage

Import in TypeScript:
```typescript
import {
  liquidFundInvestmentReports,
  equityInvestmentReports,
  realEstateInvestmentReports
} from '@/common/data/investment/seeds/investment-reports';

// Submit to API
for (const report of liquidFundInvestmentReports) {
  await api.post('/investment-reports', report);
}
```

## Important Notes

- All investment IDs and sub-investment IDs are from **real production data**
- **investmentGroupRef and investmentTypeRef are mandatory** in all investment reports
- **investmentLiquidFundTypeRef is mandatory** in liquid fund reports
- Liquid fund form fields are stored in **additionalProperties** (catalog-driven)
- Dates align with report scope (monthly for liquid, quarterly for others)
- Financial values show **realistic growth patterns**
- Catalog references use correct format (e.g., `Currency:v1:EUR`)
- Each report connects to exactly **one investment type** (not all three)