# Employment Data Management

This module provides management capabilities for employment-related master data in the HR system.

## Features

### Employment Types Management

- View, create, edit, and delete employment types
- Search and filter employment types
- Manage employment type properties (code, value, alternative code, additional values)
- Support for translations and localization

### Contract Types Management

- View, create, edit, and delete contract types
- Search and filter contract types
- Manage contract type properties (code, value, alternative code, additional values)
- Support for translations and localization

## Components

### Main Components

- `EmploymentData` - Main container component with tab navigation
- `EmploymentTypesTab` - Management interface for employment types
- `ContractTypesTab` - Management interface for contract types

### Key Features

- **Tab Navigation**: Switch between Employment Types and Contract Types
- **Search Functionality**: Real-time search across all data fields
- **CRUD Operations**: Create, read, update, delete operations for both data types
- **Modal Forms**: User-friendly forms for adding/editing entries
- **Data Validation**: Form validation for required fields
- **Responsive Design**: Works across different screen sizes
- **Internationalization**: Full i18n support with translation keys

## Data Structure

Both Employment Types and Contract Types follow the same catalog entry structure:

```typescript
interface EmploymentType | ContractType {
  id: string;
  code: string;                    // Unique identifier code
  value: string;                   // Display name/value
  alternativeCode?: string;        // Alternative reference code
  additionalValue1?: string;       // Custom field 1
  additionalValue2?: string;       // Custom field 2
  additionalValue3?: string;       // Custom field 3
  translations: Array<{           // Localization support
    localeCode: string;
    value: string;
  }>;
}
```

## Integration

### Catalog System Integration

- Uses `useCatalogManagerClient` for API communication
- Connects to catalog identifiers: `EmploymentType` and `ContractType`
- Version: `v1`
- Supports search, filtering, and pagination

### HR Settings Integration

- Accessible from HR Settings under "Employee Management"
- Navigation path: `/hr/master-data/employment-data`
- Hash-based tab navigation for direct linking

## Usage

```typescript
import { EmploymentData } from '@/business-apps/mdm/apps/employment-data';

// Basic usage
<EmploymentData
  accessToken={accessToken}
  prefixDataTestId="HrMasterData"
/>
```

## Testing

Components include comprehensive data-testid attributes for automated testing:

- `EmploymentData-Tabs` - Main tab navigation
- `EmploymentTypesTab-*` - Employment types specific elements
- `ContractTypesTab-*` - Contract types specific elements

## API Dependencies

- **Catalog Manager API**: For CRUD operations on catalog entries
- **Translation API**: For internationalization support
- **User Locale API**: For user-specific localization

## Future Enhancements

- Bulk import/export functionality
- Advanced filtering and sorting options
- Audit trail for changes
- Approval workflows for modifications
- Custom field definitions
- Integration with employee records
