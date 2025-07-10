# Liquid Fund Record

This component displays detailed information about liquid fund investments, including money market funds and other liquid investment vehicles.

## Features

- **Investment Details Header**: Shows key investment information with teal/cyan gradient theme
- **Key Metrics**: Displays ROI, multiple of invested capital, annual return, and ownership value
- **Liquid Fund Details**: Shows specific liquid fund properties like interest rate, maturity date, and early termination options
- **Company Information**: Details about the fund management company
- **Contact Information**: Contact details for the fund manager

## Design Theme

- **Primary Colors**: Teal and Cyan (`teal-50`, `teal-100`, `teal-600`, `cyan-50`, `cyan-100`, `cyan-800`)
- **Icon**: Droplets (representing liquidity)
- **Layout**: Consistent with other investment record types (Private Equity, Real Estate, Equity)

## Data Structure

The component uses `LiquidFundInvestmentRecord` which includes:
- `liquid_fund_investment`: Specific liquid fund properties
- `investment`: General investment information
- `company_details`: Fund management company information
- `metrics`: Performance metrics

## Usage

```tsx
import { LiquidFundRecord } from '@/business-apps/irm/investments/apps';

<LiquidFundRecord 
  accessToken={accessToken}
  investmentId="optional-id"
/>
``` 