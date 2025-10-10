# IRM Investments Dashboard - Requirements Document

## Introduction/Overview

The IRM (Investment Risk Management) Investments Dashboard is a comprehensive overview screen designed to help managers and analysts manage and monitor investments across different asset classes. The application provides a centralized view of all investments with filtering, sorting, and key metrics display capabilities to support investment decision-making and portfolio management.

## Goals

1. **Centralized Investment Management**: Provide a single dashboard for viewing all investments across different asset classes and types
2. **Enhanced Decision Making**: Enable quick assessment of investment performance through key metrics and filtering capabilities
3. **Portfolio Oversight**: Allow managers to monitor capital allocation across investment types and sub-types
4. **Efficient Data Access**: Streamline access to investment data through intuitive search and filter functionality
5. **Investment Type Categorization**: Clearly organize investments by strategic categories for better portfolio analysis

## User Stories

### Primary Users: Managers

- **As a manager**, I want to view all investments in a centralized dashboard so that I can get a complete overview of our investment portfolio
- **As a manager**, I want to filter investments by type, shareholding percentage, and performance metrics so that I can focus on specific investment categories
- **As a manager**, I want to see key metrics like Expected ROI and book value at a glance so that I can quickly assess investment performance
- **As a manager**, I want to monitor capital allocation across investment types so that I can ensure proper portfolio diversification

### Primary Users: Analysts

- **As an analyst**, I want to sort and order investments by customizable attributes so that I can analyze investment patterns and trends
- **As an analyst**, I want to search for specific investments so that I can quickly locate and review investment details
- **As an analyst**, I want to view investment phases and their relevance to different investment types so that I can understand the investment lifecycle
- **As an analyst**, I want to access detailed investment data through GraphQL queries so that I can perform comprehensive analysis

## Functional Requirements

### 1. Investment Types Overview Display

1.1. The system must display investments organized by investment type and sub-type in a list view
1.2. The system must show capital allocation for each investment type and sub-type
1.3. The system must categorize investments into the following types:

- **Strategic Investments**
  - Majority Stake
  - Minority Stake
  - Venture Capital
  - Co-Investments
- **Real Estate**
  - Properties
  - Project Development
  - Mezzanine Loan
  - Other
- **Private Equity**
- **Liquid Funds**
  - Bank
  - Strategic Liquidity (capital market)

### 2. Investments Overview Screen

2.1. The system must display all investments in a comprehensive list view
2.2. The system must provide filtering capabilities for:

- Investment Type
- Shareholding percentage
- Turnover
- EBITDA
- Role
- Other customizable attributes
  2.3. The system must provide sorting and ordering functionality for all displayed attributes
  2.4. The system must display key metrics including:
- Expected ROI
- Book value
- Investment phase status
- Other relevant financial indicators

### 3. Search and Filter Functionality

3.1. The system must provide a search interface for finding specific investments
3.2. The system must support multiple filter criteria simultaneously
3.3. The system must allow users to save and apply custom filter configurations
3.4. The system must provide real-time filtering results

### 4. Data Integration

4.1. The system must integrate with GraphQL API for investment data queries
4.2. The system must integrate with catalog management for investment type definitions
4.3. The system must support real-time data updates
4.4. The system must handle data pagination for large investment portfolios

### 5. Investment Phase Management

5.1. The system must display investment phases relevant to each investment type
5.2. The system must show that for liquid funds, only monitoring phase is relevant
5.3. The system must indicate current phase status for each investment

## Non-Goals (Out of Scope)

1. **Investment Creation/Editing**: This dashboard is view-only; investment creation and modification will be handled by separate forms
2. **Real Estate Exposé Processing**: Automatic read-out of exposés and offer creation is mentioned but not included in this initial dashboard scope
3. **Financial Calculations**: Complex financial modeling and calculations beyond basic metrics display
4. **User Management**: User permissions and role management (handled by platform)
5. **Mobile Optimization**: Initial focus is on desktop dashboard experience
6. **Export Functionality**: Data export features not included in initial scope

## Design Considerations

### UI/UX Requirements

- Clean, professional dashboard layout following NEWWORK design system
- Responsive grid layout for investment cards/list items
- Intuitive filter and search controls
- Clear visual hierarchy for investment types and metrics
- Loading states for data fetching operations

### Component Architecture

- Modular component structure following project conventions
- Reusable filter and search components
- Separate components for different investment type displays
- Responsive table/card components for investment listings

## Technical Considerations

### Data Requirements

- GraphQL integration for investment data queries
- Catalog management integration for investment type definitions
- Support for pagination and lazy loading
- Real-time data synchronization capabilities

### Performance Requirements

- Fast initial load time (< 3 seconds)
- Smooth filtering and sorting operations
- Efficient data caching for frequently accessed information
- Optimized GraphQL queries with proper field selection

### Integration Points

- NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK for investment data
- NEXT_PUBLIC_CATALOG_API for investment type catalogs
- BusinessAppContextProps for user context and access tokens

## Success Metrics

1. **User Adoption**: 90% of managers and analysts actively use the dashboard within 30 days
2. **Performance**: Dashboard loads within 3 seconds for portfolios up to 1000 investments
3. **User Satisfaction**: Average user rating of 4.5/5 for dashboard usability
4. **Data Accuracy**: 99.9% accuracy in displayed investment metrics
5. **Filter Usage**: 80% of users regularly use filtering functionality

## Open Questions

1. **Data Refresh Frequency**: How often should investment data be refreshed? Real-time vs. scheduled updates?
2. **Investment Metrics**: Are there additional key metrics beyond Expected ROI and book value that should be displayed?
3. **User Permissions**: Should different user roles (managers vs. analysts) see different data or have different capabilities?
4. **Investment Phases**: What are the complete set of investment phases that apply to different investment types?
5. **Real Estate Integration**: Should the automatic exposé read-out functionality be included in a future iteration?
6. **Customization Level**: How much should users be able to customize the dashboard layout and displayed columns?
