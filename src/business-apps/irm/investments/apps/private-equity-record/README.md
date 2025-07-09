# Private Equity Record Component

## Overview

The PrivateEquityRecord component displays comprehensive details for private equity fund investments, including fund-specific metrics, investment performance, and fund manager information.

## Features

- **Investment Overview**: Shows key investment details including book value, market value, stake percentage, and investment status
- **Key Investment Metrics**: Displays IRR, TVPI multiple, annual return, and current NAV
- **Private Equity Details**: Fund-specific information including fund name, vintage year, committed/called/distributed capital, and investment strategy
- **Fund Manager Information**: Company details of the fund management firm
- **Contact Information**: Key contact person at the fund management company

## Private Equity Specific Features

- **Fund Metrics**: IRR (Internal Rate of Return), TVPI (Total Value to Paid-In) multiple
- **Capital Management**: Shows committed capital, called capital, and distributed capital amounts
- **Investment Strategy**: Displays investment strategy, geographic focus, and sector focus
- **Vintage Year**: Fund vintage year for performance benchmarking

## Data Structure

The component uses the following main interfaces:

- `PrivateEquityInvestment`: Fund-specific data (fund name, size, capital amounts, IRR, etc.)
- `Investment`: Base investment data shared across all investment types
- `CompanyDetails`: Fund manager company information
- `InvestmentMetrics`: Performance metrics and calculated values

## Component Structure

1. **Investment Details Header**: Purple-themed card with investment overview and status
2. **Key Investment Metrics**: 4-card grid showing IRR, Multiple (TVPI), Annual Return, and Current NAV
3. **Private Equity Details**: Fund-specific information in a structured grid layout
4. **Company Information**: Fund manager details
5. **Contact Information**: Key contact person information

## Usage

```tsx
import { PrivateEquityRecord } from '@/business-apps/irm/investments/apps/private-equity-record';

<PrivateEquityRecord 
  accessToken={accessToken}
  userInfo={userInfo}
  locale={locale}
  // ... other BusinessAppContextProps
/>
```

## Sample Data

The component currently uses hardcoded data for a European Growth Fund IV with:
- €750M fund size
- €15M committed capital
- 18.5% IRR
- 1.58x TVPI multiple
- Technology & Healthcare sector focus 