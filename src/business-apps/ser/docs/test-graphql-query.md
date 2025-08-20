# Test GraphQL Integration

This document provides sample queries to test the Services+ GraphQL integration with MAP Orgchart.

## Sample Test Query

You can run this query directly against your GraphQL endpoint to test the integration:

```graphql
query TestUserCapabilities($employeeId: uuid!, $structureId: uuid!) {
  EmployeePosition(
    where: {
      employeeId: { _eq: $employeeId }
      structureId: { _eq: $structureId }
      _and: [
        { exitDate: { _is_null: true } }
      ]
    }
  ) {
    id
    employeeId
    firstName
    lastName
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
    jobPosition {
      id
      name
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

## Sample Variables

Replace these with actual values from your system:

```json
{
  "employeeId": "123e4567-e89b-12d3-a456-426614174000",
  "structureId": "987fcdeb-51a2-43d1-b123-456789abcdef"
}
```

## Expected Response Structure

A successful query should return data like this:

```json
{
  "data": {
    "EmployeePosition": [
      {
        "id": "pos-001",
        "employeeId": "123e4567-e89b-12d3-a456-426614174000",
        "firstName": "John",
        "lastName": "Doe",
        "capability": {
          "id": "cap-001",
          "name": "IT_Manager",
          "description": "Information Technology Manager"
        },
        "organizationalUnit": {
          "id": "org-001",
          "name": "Information Technology",
          "code": "IT",
          "type": "Department",
          "tag": "IT"
        },
        "jobPosition": {
          "id": "job-001",
          "name": "IT Manager"
        },
        "employeeCapabilities": [
          {
            "capability": {
              "id": "cap-002",
              "name": "IT_Support",
              "description": "IT Support Specialist"
            }
          }
        ]
      }
    ]
  }
}
```

## Testing Different Scenarios

### 1. IT Manager Access
User with IT_Manager capability should get access to IT desk:
```json
{
  "capability": {
    "name": "IT_Manager"
  }
}
```

### 2. HR Manager Access
User with HR_Manager capability should get access to HR desk:
```json
{
  "capability": {
    "name": "HR_Manager"
  }
}
```

### 3. Multi-Desk Access
User with multiple capabilities should get access to multiple desks:
```json
{
  "employeeCapabilities": [
    {
      "capability": { "name": "IT_Manager" }
    },
    {
      "capability": { "name": "HR_Manager" }
    }
  ]
}
```

### 4. Organizational Unit Access
User in IT department without explicit IT capability should still get IT desk access:
```json
{
  "capability": {
    "name": "Some_Other_Capability"
  },
  "organizationalUnit": {
    "name": "Information Technology",
    "code": "IT"
  }
}
```

## Testing the Integration

### Browser Console Testing

1. Open ServiceDesk in browser
2. Open Developer Tools Console
3. Look for these log messages:

```javascript
// GraphQL query execution
useUserCapabilitiesGraphQL: Fetching capabilities for {employeeId: "...", structureId: "..."}

// Response processing
useUserCapabilitiesGraphQL: GraphQL response {data: {...}}

// Capability mapping
useDesksForUser: Processing capabilities {userCapabilityNames: [...], userOrgUnitNames: [...]}

// Desk access decisions
useDesksForUser: Checking desk IT {hasCapability: true, hasOrgUnit: false, ...}
useDesksForUser: Access granted to desk IT {reason: "capability", ticketCount: 5}
```

### Manual Testing Steps

1. **Login** with different user accounts
2. **Verify** different users see different available desks
3. **Check** desk access matches user's role/department
4. **Test** fallback behavior when GraphQL is unavailable

### Error Testing

Test error scenarios:

1. **Invalid Employee ID**
   ```json
   {"employeeId": "non-existent-id"}
   ```

2. **No Active Positions**
   ```json
   {"exitDate": "2023-01-01T00:00:00Z"}
   ```

3. **Network Error**
   - Disconnect network and observe fallback behavior

## Debugging Tips

### Enable Detailed Logging

Add this to your browser console:
```javascript
// Enable all Services+ logging
localStorage.setItem('debug', 'ser:*');
```

### Check GraphQL Network Requests

1. Open Network tab in Developer Tools
2. Filter by "GraphQL" or look for POST requests to GraphQL endpoint
3. Inspect request/response payloads

### Verify Hook Integration

Check that hooks are working properly:
```javascript
// In React DevTools Components tab, look for:
// - useUserCapabilitiesGraphQL
// - useDesksForUser  
// - useUserCapabilities
```

## Common Issues

### 1. No Desks Showing
- Check employee ID is correct
- Verify structure ID matches current active structure
- Ensure user has active positions (exitDate is null)

### 2. Wrong Desk Access
- Verify capability mapping in `DESK_CAPABILITY_MAPPING`
- Check capability names match exactly
- Ensure organizational unit mapping is correct

### 3. GraphQL Errors
- Check endpoint URL and authentication
- Verify schema matches expected types
- Test query directly in GraphQL playground

### 4. Fallback Not Working
- Ensure mock data is being seeded
- Check workflow engine is initialized
- Verify error handling logs

## Performance Testing

Test with large datasets:
- Users with many capabilities
- Large organizational structures
- High ticket volumes

Monitor:
- Query execution time
- Network payload size
- React rendering performance
- Memory usage

---

**Ready to test your GraphQL integration!** 🧪
