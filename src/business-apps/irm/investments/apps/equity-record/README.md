# Equity Record Component

A detailed view component for displaying equity investment records with comprehensive financial information, metrics, and company details.

## Features

### 📊 Three Tab Layout
- **Overview**: Investment details, financial information, and equity-specific data
- **Key Metrics**: Calculated performance indicators and statistics
- **Company Details**: Information about the invested company

### 💰 Investment Information
- Investment name, role, and stake percentage
- Status, phase, and risk level indicators
- Acquisition and planned exit dates
- Investment notes and summary

### 📈 Financial Data
- Initial and total investment amounts
- Book value and market value
- Debt financing and leverage ratios
- Current company valuation
- Last reported turnover and EBITDA

### 🎯 Key Metrics (Calculated)
- **ROI Percentage**: Return on investment
- **Multiple of Invested Capital**: MOIC calculation
- **Valuation Change**: Percentage change in company valuation
- **Annual Return**: Annualized return rate
- **Years Held**: Duration of investment
- **Debt to Equity Ratio**: Financial leverage metric
- **EBITDA Multiple**: Company valuation multiple
- **Revenue Multiple**: Revenue-based valuation multiple
- **Ownership Value**: Current value of stake

### 🏢 Company Information
- Company name, address, and contact details
- Industry, founding year, and CEO information
- Revenue, employee count, and revenue per employee
- Website and description

## Data Structure

The component uses interfaces based on the database schema:

```typescript
interface EquityInvestment {
  id: string;
  investment_id: string;
  investment_role_ref: string;
  current_company_valuation: number;
  last_reported_turnover: number;
  last_reported_ebitda: number;
}

interface Investment {
  id: string;
  name: string;
  investment_group_ref: string;
  // ... other fields from nw_crm.investment table
}

interface CompanyDetails {
  name: string;
  address: AddressInterface;
  revenue: number;
  employees: number;
  // ... other company information
}
```

## Usage

```typescript
import { EquityRecord } from '@/business-apps/irm/investments/apps';

const MyComponent = () => {
  const context = useBusinessAppContext();
  
  return (
    <EquityRecord 
      {...context}
      investmentId="optional-investment-id"
    />
  );
};
```

## Current Implementation

- **Data**: Uses hardcoded sample data for demonstration
- **Styling**: Follows project guidelines with Ant Design components
- **Responsive**: Adapts to different screen sizes
- **Currency**: Supports multiple currencies with proper formatting

## Next Steps

1. **API Integration**: Connect to real GraphQL endpoints
2. **Form Integration**: Add editing capabilities
3. **Report Generation**: Implement view reports functionality
4. **Navigation**: Add links to related investments and opportunities
5. **Historical Data**: Show performance over time charts

## Dependencies

- React
- Ant Design (antd)
- @ant-design/icons
- BusinessAppContext for authentication and user info

## File Structure

```
equity-record/
├── index.ts                 # Main exports
├── EquityRecord.tsx         # Main component
├── types/
│   └── index.ts            # TypeScript interfaces
└── README.md               # This documentation
``` 