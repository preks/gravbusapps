# Services+ GraphQL Integration

This document describes the integration of Services+ with MAP Orgchart data via GraphQL to provide real capability-based access control.

## Overview

The Services+ Service Desk now uses real user capabilities from the MAP Orgchart to determine which service desks a user has access to, replacing the previous mock-based approach.

## Components

### 1. GraphQL Integration Hook

**`useUserCapabilitiesGraphQL`** - Fetches user capabilities from MAP Orgchart
- Queries `EmployeePosition` table with user's `employeeId` and current `structureId`
- Retrieves user's capabilities and organizational units
- Provides comprehensive user capability data for desk access determination

### 2. Desk Access Hook

**`useDesksForUser`** - Determines available service desks based on capabilities
- Maps user capabilities to available service desks
- Supports both capability-based and organizational unit-based access
- Provides fallback access to ensure users always have at least one desk
- Integrates with workflow engine to get ticket counts

### 3. Route Guard Component

**`DeskAccessGuard`** - Protects routes based on desk access
- Validates user access to specific desks or general service desk access
- Provides appropriate fallback UI for access denied scenarios
- Supports loading and error states

## Capability to Desk Mapping

The system maps capabilities/roles to service desks using the following logic:

```typescript
const DESK_CAPABILITY_MAPPING = {
  'IT': {
    requiredCapabilities: ['IT_Manager', 'IT_Support', 'IT_Administrator'],
    organizationalUnits: ['IT', 'Information Technology'],
  },
  'HR': {
    requiredCapabilities: ['HR_Manager', 'HR_Specialist', 'HR_Business_Partner'],
    organizationalUnits: ['HR', 'Human Resources'],
  },
  // ... more mappings
};
```

### Access Logic

Users gain access to a desk if they have:
- **Required Capability**: Direct capability match (e.g., `IT_Manager` → IT desk)
- **Organizational Unit**: Belongs to relevant org unit (e.g., works in IT department)

### Capability Matching

- Flexible string matching with normalization
- Supports partial matches (e.g., `IT_Manager` matches `IT_MANAGER`)
- Case-insensitive with special character handling

## GraphQL Query

The integration uses this GraphQL query to fetch user data:

```graphql
query GetUserCapabilities($employeeId: uuid!, $structureId: uuid!) {
  EmployeePosition(
    where: {
      employeeId: { _eq: $employeeId }
      structureId: { _eq: $structureId }
      _and: [{ exitDate: { _is_null: true } }]
    }
  ) {
    id
    employeeId
    capability {
      id
      name
      description
    }
    organizationalUnit {
      id
      name
      code
      type
      tag
    }
    employeeCapabilities {
      capability {
        id
        name
        description
      }
    }
  }
}
```

## Integration Points

### 1. ServiceDesk Component

Now automatically determines user's available desks:
```typescript
const { capabilities } = useUserCapabilities({ accessToken, userInfo });
// capabilities now come from GraphQL data
```

### 2. Route Protection

Add access guards to specific desk routes:
```typescript
<DeskAccessGuard 
  requiredDesk="IT" 
  accessToken={accessToken} 
  userInfo={userInfo}
>
  <ITDeskContent />
</DeskAccessGuard>
```

### 3. Capability Checking

Check user access programmatically:
```typescript
const { hasAccessToDesk, getUserCapabilities } = useDesksForUser({ 
  accessToken, 
  userInfo 
});

if (hasAccessToDesk('IT')) {
  // User can access IT desk
}
```

## Fallback Behavior

The system provides multiple fallback layers:

1. **GraphQL Available**: Uses real MAP Orgchart data
2. **GraphQL Unavailable**: Falls back to mock data with workflow engine
3. **No Data Available**: Provides default HR desk access

This ensures the application remains functional in all environments.

## Development vs Production

### Development Mode
- Uses mock data when GraphQL endpoints aren't available
- Seeds sample tickets for demonstration
- Provides console logging for debugging

### Production Mode  
- Relies entirely on GraphQL MAP Orgchart data
- Real capability and organizational structure
- Proper access control enforcement

## Usage Examples

### Basic Hook Usage

```typescript
// Get user's available desks
const { 
  availableDesks, 
  isLoading, 
  error,
  hasAccessToDesk,
  getUserCapabilities 
} = useDesksForUser({ accessToken, userInfo });

// Check specific desk access
if (hasAccessToDesk('IT')) {
  console.log('User can access IT desk');
}

// Get raw capabilities
const capabilities = getUserCapabilities();
console.log('User capabilities:', capabilities);
```

### Route Protection

```typescript
// Protect entire service desk
<DeskAccessGuard accessToken={accessToken} userInfo={userInfo}>
  <ServiceDesk />
</DeskAccessGuard>

// Protect specific desk
<DeskAccessGuard 
  requiredDesk="Finance" 
  accessToken={accessToken} 
  userInfo={userInfo}
  fallback={<AccessDeniedMessage />}
>
  <FinanceDeskQueue />
</DeskAccessGuard>
```

## Error Handling

The system handles various error scenarios:

- **GraphQL Connection Issues**: Falls back to mock data
- **Invalid Employee ID**: Provides default access
- **Missing Capabilities**: Grants default HR access
- **Network Errors**: Displays user-friendly error messages

## Debugging

Enable detailed logging by checking browser console:

```javascript
// Look for these log prefixes:
// - useUserCapabilitiesGraphQL: GraphQL queries and responses
// - useDesksForUser: Capability processing and desk determination
// - useUserCapabilities: Integration and fallback behavior
// - DeskAccessGuard: Access control decisions
```

## Future Enhancements

1. **Caching**: Add GraphQL query caching for better performance
2. **Real-time Updates**: Subscribe to capability changes
3. **Granular Permissions**: Add action-level permissions within desks
4. **Admin Override**: Allow administrators to grant temporary access
5. **Audit Logging**: Track access grants and denials for compliance
