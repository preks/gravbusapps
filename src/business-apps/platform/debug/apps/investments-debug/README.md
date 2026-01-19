# Investment Data Foundation Debug App

A comprehensive testing interface for the newly created investment data foundation system.

## Purpose

This debug app allows developers to test all aspects of the investment data system including:

- Core investment entity queries
- Specific investment type queries (Equity, Real Estate, Liquid Fund)
- Search functionality
- Data integration hooks
- Analytics and performance metrics
- By-ID entity fetching

## Features

### 🧪 **Comprehensive Testing Interface**

- **Core Investment Tests**: Test all core investment entities (Investment, Account, Contact, Lead, Opportunity)
- **Specific Type Tests**: Test investment-specific types (Equity, Real Estate, Liquid Fund)
- **By-ID Tests**: Test individual entity fetching by ID
- **Analytics Tests**: Test performance metrics and cross-type analytics

### 📊 **Real-time Results Display**

- Success/Error status indicators
- Response time measurement
- Full JSON response display
- Error message details
- Test execution timestamps

### 🔧 **Interactive Controls**

- Search term input for testing search functionality
- Test ID input for by-ID tests
- Bulk test execution (Run All Core, Run All Specific)
- Result clearing and refresh

### 📈 **Integration Status**

- Live status of data integration hooks
- Analytics hook status and summary
- Real-time data counts
- Error reporting

## Usage

### Basic Testing

1. **Enter Search Term**: Add a search term to test search functionality across all entities
2. **Run Individual Tests**: Click any test button to execute that specific query
3. **View Results**: Results appear below each test button with status indicators
4. **Check Integration Status**: Monitor the integration hooks status cards

### Bulk Testing

- **Run All Core**: Executes all core investment entity tests
- **Run All Specific**: Executes all investment-specific type tests
- **Clear Results**: Clears all test results to start fresh

### Analytics Testing

- **Performance Metrics**: Test cross-type analytics and portfolio metrics
- **Integration Data**: View live data from integration hooks
- **Analytics Summary**: See real-time investment distribution and totals

## Test Categories

### Core Investment Entity Tests

```typescript
// Tests these hooks:
useGetInvestments()
useGetInvestmentsLight()
useGetInvestmentById()
useSearchInvestments()
useGetInvestmentAccounts()
useGetInvestmentContacts()
useGetInvestmentLeads()
useGetInvestmentOpportunities()
```

### Specific Investment Type Tests

```typescript
// Tests these hooks:
useGetEquityInvestments()
useGetRealEstateInvestments()
useGetLiquidFundInvestments()
useGetEquityInvestmentReports()
useGetEquityInvestmentRounds()
useGetRealEstateInvestmentRentalUnits()
useGetLiquidFundInvestmentReports()
```

### Integration & Analytics Tests

```typescript
// Tests these hooks:
useInvestmentDataIntegration()
useInvestmentSummaryAnalytics()
useGetInvestmentPerformanceMetrics()
```

## Result Interpretation

### Status Indicators

- **🔵 Processing**: Test is currently running
- **🟢 Success**: Test completed successfully with response time
- **🔴 Error**: Test failed with error details

### Data Display

- **JSON Response**: Full GraphQL response data
- **Response Time**: Execution time in milliseconds
- **Timestamp**: When the test was executed
- **Error Details**: Specific error messages if test fails

## Development Notes

### Mock Data Testing

If no real data is available, the app will:

- Show empty result sets
- Display "No data found" messages
- Still validate that hooks execute without errors
- Test the complete query/response pipeline

### Error Scenarios

The app tests various error scenarios:

- Invalid UUIDs for by-ID tests
- Network connectivity issues
- GraphQL query errors
- Hook integration failures

## Publishing

To publish this debug app to the NEWWORK platform:

```bash
npm run publish:screen -- /crm/investments/apps/investments-debug
```

This debug app is essential for validating the investment data foundation before rolling out to production components! 🚀
