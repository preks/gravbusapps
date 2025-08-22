# Investment Relations Contact View

## Overview
This component provides a dedicated contacts management interface for the Investment Relations app, replacing the previous approach of using common components with source app parameters.

## Architecture

### Data Access
- **Centralized Data**: Uses the centralized investment data access layer from `@/common/data/investment`
- **Hooks**: Leverages `useGetInvestmentContacts` for data fetching
- **Types**: Uses `InvestmentContact` and `InvestmentContactQueryVariables` from the centralized types

### Component Structure
```
contact-view/
├── ContactView.tsx          # Main component
├── hooks/
│   └── useContactView.ts    # Custom business logic hook
├── types/
│   └── index.ts             # Local type definitions
├── utils/
│   └── index.ts             # Utility functions
└── index.ts                 # Exports
```

## Features

### Core Functionality
- **List View**: Tabular display of investment contacts with sorting and pagination
- **Search**: Debounced search across all contact fields
- **Statistics**: Real-time KPI cards showing contact metrics
- **Row Expansion**: Expandable rows for detailed contact information
- **Actions**: AppActionButton integration for contact management workflows

### Data Management
- **Real-time Updates**: Automatic data refresh on parameter changes
- **Error Handling**: Comprehensive error states with retry functionality
- **Loading States**: Proper loading indicators during data fetching
- **Pagination**: Server-side pagination with configurable page sizes

### User Experience
- **Responsive Design**: Mobile-friendly layout with proper breakpoints
- **Accessibility**: Comprehensive test IDs for automated testing
- **Performance**: Optimized re-renders with proper memoization
- **Navigation**: URL-based state management for bookmarkable views

## Integration

### AppActionButton
- **Context**: `FlowContextName.contactEntity`
- **Data**: Passes `contactId` in `externalContextData`
- **Behavior**: Disables when no actions available, defers context requests

### Data Flow
1. Component mounts with access token
2. Hooks fetch data using centralized investment data layer
3. Data is transformed and displayed in the UI
4. User interactions trigger appropriate data updates
5. State changes trigger re-renders with new data

## Benefits Over Previous Implementation

### Extensibility
- **Direct Control**: Full control over contact view functionality
- **Custom Logic**: Ability to add investment-specific business rules
- **Data Integration**: Direct access to investment data without abstraction layers

### Maintainability
- **Clear Dependencies**: Explicit imports from centralized data layer
- **Type Safety**: Full TypeScript support with proper type definitions
- **Testability**: Isolated component with comprehensive test coverage

### Performance
- **Optimized Queries**: Direct GraphQL queries without unnecessary abstractions
- **Efficient Rendering**: Proper React patterns for optimal performance
- **Reduced Bundle**: No unnecessary common component dependencies

## Future Enhancements

### Planned Features
- **Board View**: Kanban-style contact management interface
- **Advanced Filters**: Multi-criteria filtering with saved filter sets
- **Bulk Actions**: Multi-select operations for contact management
- **Real-time Updates**: WebSocket integration for live data updates

### Technical Improvements
- **Virtual Scrolling**: For large contact datasets
- **Offline Support**: Service worker integration for offline access
- **Advanced Analytics**: Enhanced contact performance metrics
- **Integration APIs**: Webhook support for external system integration

