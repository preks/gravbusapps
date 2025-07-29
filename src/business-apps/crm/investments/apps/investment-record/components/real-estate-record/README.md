# Real Estate Record

A comprehensive React component for displaying real estate investment records with detailed property information, metrics, and company details.

## Overview

This component provides a detailed view of real estate investments including property-specific information, financial metrics, and management company details. It's designed to work with the IRM (Investment Relationship Management) module.

## Features

- **Investment Overview**: Displays key investment details and metrics
- **Real Estate Details**: Property-specific information including:
  - Property type and location
  - Size, purchase price, and current market value
  - Rental income and occupancy rates
  - Property condition and management details
- **Key Metrics**: ROI, returns, valuation changes, and ownership details
- **Company Information**: Management company details and contact information
- **Responsive Design**: Optimized for mobile and desktop viewing

## Props

The component extends `BusinessAppContextProps` and accepts standard business app props including:
- `accessToken`: Authentication token for API access
- Standard business context properties

## Data Structure

The component works with the following key interfaces:

### RealEstateInvestment
- Property details (type, location, size)
- Financial information (purchase price, market value, rental income)
- Performance metrics (occupancy rate, rental yield)
- Management details

### Investment
- Basic investment information
- Financial metrics and ownership details
- Status and phase tracking

### CompanyDetails
- Management company information
- Contact details and address
- Business metrics (revenue, employees)

## Usage

```typescript
import { RealEstateRecord } from '@/business-apps/irm/investments/apps/real-estate-record';

const MyComponent = (props: BusinessAppContextProps) => {
  return (
    <RealEstateRecord 
      {...props}
    />
  );
};
```

## Data Integration

Currently uses hardcoded data for demonstration. To integrate with real data:

1. Replace the hardcoded data with GraphQL or REST API calls
2. Add loading and error states
3. Implement data refresh mechanisms
4. Add CRUD operations for editing property and investment details

## Real Estate Specific Features

- **Property Information**: Type, location, size, condition
- **Rental Performance**: Annual income, occupancy rates, yield calculations
- **Valuation Tracking**: Purchase price vs current market value
- **Property Management**: Management company details and contacts

## Styling

Uses Tailwind CSS with the `gba:` prefix following the project's styling guidelines. The component features:
- Clean, professional design
- Color-coded metrics and status indicators
- Responsive grid layouts
- Consistent spacing and typography

## Testing

Test IDs are provided for all interactive elements:
- `real-estate-record-title`
- `edit-investment-button`
- `view-reports-button`
- `overview-tab`
- `overview-content`

## Future Enhancements

- Property images and virtual tours
- Historical performance charts
- Rental history and tenant information
- Maintenance and capital expenditure tracking
- Market analysis and comparison tools 