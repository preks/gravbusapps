# Campaign Management App

A comprehensive campaign management application for the CRM module that provides campaign tracking, statistics, and management capabilities.

## Features

### 📊 Campaign Statistics (KPIs)

- **Total Campaigns**: Count of all campaigns in the system
- **Active Campaigns**: Currently running campaigns
- **Completed Campaigns**: Successfully finished campaigns
- **Total Budget**: Combined budget across all campaigns

### 📋 Campaign List

- **Name**: Campaign name with description
- **Type**: Campaign type (e.g., Email, Social Media, Print)
- **Start Date**: Campaign start date
- **End Date**: Campaign end date
- **Status**: Campaign status with color-coded badges

### 🔧 Actions

- **AppActionButton**: Integrated action button for each campaign
- **Search**: Full-text search across campaign names and descriptions
- **Sorting**: Sortable columns for better data organization

## Technical Implementation

### GraphQL Integration

- Uses `nw.crm.sales_campaign` table
- Real-time data fetching with loading states
- Error handling with retry functionality
- Pagination and search support

### Component Structure

```
campaign-management/
├── CampaignManagement.tsx          # Main app component
├── components/
│   ├── CampaignStatistics.tsx     # KPI widgets
│   ├── CampaignsTable.tsx         # Data table
│   └── index.ts                   # Component exports
├── hooks/
│   ├── useSalesCampaignData.ts    # Data integration hook
│   └── useSalesCampaignQueries.ts # GraphQL queries
├── queries/
│   └── SalesCampaignQueries.ts    # GraphQL query definitions
├── types/
│   └── SalesCampaignTypes.ts      # TypeScript interfaces
└── index.ts                       # App exports
```

### Design System Integration

- Uses `@newwork/nw-design-system` components
- Follows established patterns from other CRM apps
- Responsive design with proper loading states
- Consistent styling with design tokens

## Usage

```typescript
import CampaignManagement from '@/business-apps/crm/common/apps/campaign-management';

// In your app
<CampaignManagement
  accessToken={accessToken}
  // ... other BusinessAppContextProps
/>
```

## Data Flow

1. **Statistics Loading**: Fetches aggregate data for KPIs
2. **Campaigns Loading**: Fetches paginated campaign list
3. **Search**: Triggers new GraphQL queries with search filters
4. **Actions**: AppActionButton integration for campaign operations

## GraphQL Schema

The app queries the `SalesCampaign` table with the following structure:

- Basic fields: `id`, `name`, `description`, `createdAt`, `updatedAt`
- Date fields: `startDate`, `endDate`
- Reference fields: `typeRef`, `customerCampaignStatusRef`, `customerCampaignSegmentRef`, `customerPersonaRef`, `countryRef`, `customerValuePackFocusRef`, `customerIndustryFocusRef`
- Related entities: `type`, `customerCampaignStatus`, `customerCampaignSegment`, `customerPersona`, `country`, `customerValuePackFocus`, `customerIndustryFocus`, `ownerEmployee`
- System fields: `isDeleted`, `recordState`, `version`
