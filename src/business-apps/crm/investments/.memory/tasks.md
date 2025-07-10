## Relevant Files

- `src/business-apps/irm/investments/apps/investments-dashboard/InvestmentsDashboard.tsx` - Main dashboard component for investments overview
- `src/business-apps/irm/investments/apps/investments-dashboard/InvestmentsDashboard.e2e.tsx` - E2E tests for InvestmentsDashboard
- `src/business-apps/irm/investments/apps/investments-dashboard/index.ts` - Export file for the dashboard component
- `src/business-apps/irm/investments/apps/investments-dashboard/components/InvestmentTypeOverview.tsx` - Component for displaying investment types overview
- `src/business-apps/irm/investments/apps/investments-dashboard/components/InvestmentsList.tsx` - Component for displaying investments list
- `src/business-apps/irm/investments/apps/investments-dashboard/components/InvestmentFilters.tsx` - Component for filtering functionality
- `src/business-apps/irm/investments/apps/investments-dashboard/components/InvestmentMetrics.tsx` - Component for displaying key metrics
- `src/business-apps/irm/investments/apps/investments-dashboard/components/index.ts` - Export file for dashboard components
- `src/business-apps/irm/investments/apps/investments-dashboard/hooks/useInvestmentData.ts` - Hook for fetching investment data
- `src/business-apps/irm/investments/apps/investments-dashboard/hooks/useInvestmentFilters.ts` - Hook for managing filter state
- `src/business-apps/irm/investments/apps/investments-dashboard/types/investmentTypes.ts` - TypeScript types for investment data
- `src/business-apps/irm/investments/apps/investments-dashboard/queries/investmentQueries.ts` - GraphQL queries for investment data
- `src/business-apps/irm/investments/types/index.ts` - Shared types for the investments module
- `src/business-apps/irm/investments/components/InvestmentCard.tsx` - Reusable investment card component
- `src/business-apps/irm/investments/hooks/useInvestmentCatalogs.ts` - Hook for fetching investment type catalogs

### Notes

- Tests should typically be placed alongside the code / module they are testing (e.g., `InvestmentsDashboard.tsx` and `InvestmentsDashboard.e2e.tsx` in the same directory).
- Use Playwright to write tests, do not write unit tests.

## Tasks

- [x] 1.0 Setup Project Structure and Base Components
  - [x] 1.1 Create the main IRM investments module directory structure
  - [x] 1.2 Create shared TypeScript types for investment data structures
  - [x] 1.3 Create the main InvestmentsDashboard component with basic layout
  - [x] 1.4 Create index.ts export files for proper module organization
  - [x] 1.5 Set up the dashboard route and basic navigation structure

- [ ] 2.0 Implement Data Layer and API Integration
  - [ ] 2.1 Create GraphQL queries for fetching investment data
  - [ ] 2.2 Create GraphQL queries for fetching investment type catalogs
  - [ ] 2.3 Implement useInvestmentData hook for data fetching with pagination
  - [ ] 2.4 Implement useInvestmentCatalogs hook for catalog data
  - [ ] 2.5 Add error handling and loading states for all data operations

- [ ] 3.0 Create Investment Type Overview Components
  - [ ] 3.1 Create InvestmentTypeOverview component for displaying investment categories
  - [ ] 3.2 Create InvestmentCard component for individual investment display
  - [ ] 3.3 Implement capital allocation display for each investment type
  - [ ] 3.4 Add investment phase indicators for different investment types
  - [ ] 3.5 Style components according to NEWWORK design system

- [ ] 4.0 Build Investments List and Filtering System
  - [ ] 4.1 Create InvestmentsList component with table/grid layout
  - [ ] 4.2 Create InvestmentFilters component with multiple filter options
  - [ ] 4.3 Implement useInvestmentFilters hook for filter state management
  - [ ] 4.4 Add sorting functionality for all investment attributes
  - [ ] 4.5 Implement search functionality with debounced input
  - [ ] 4.6 Create InvestmentMetrics component for key performance indicators

- [ ] 5.0 Implement Dashboard Layout and Integration
  - [ ] 5.1 Integrate all components into the main dashboard layout
  - [ ] 5.2 Implement responsive design for different screen sizes
  - [ ] 5.3 Add loading states and error handling throughout the dashboard
  - [ ] 5.4 Create comprehensive E2E tests using Playwright
  - [ ] 5.5 Optimize performance with proper data caching and lazy loading