# GraphQL Integration Troubleshooting

## Error: "Error Loading Service Desk - Failed to load desk capabilities"

This error indicates an issue with the GraphQL integration. Follow these steps to diagnose and fix the problem.

### Step 1: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for log messages starting with:
   - `useUserCapabilitiesGraphQL:`
   - `useDesksForUser:`
   - `useUserCapabilities:`

### Step 2: Common Issues and Solutions

#### Issue 1: GraphQL Endpoint Not Configured

**Error**: `Network error: Could not connect to GraphQL endpoint`

**Solution**: Check if `NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK` is set in `.env`

```bash
# Check .env file
NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK=https://your-graphql-endpoint.com/graphql
```

#### Issue 2: Authentication Issues

**Error**: `Authentication error: Invalid or expired access token`

**Solutions**:
1. Check if user is properly logged in
2. Verify access token is being passed correctly
3. Check token hasn't expired

#### Issue 3: GraphQL Schema Mismatch

**Error**: `GraphQL query failed: Cannot query field "organizationalUnit"`

**Solution**: The schema might not have all expected fields. The integration should fallback gracefully.

#### Issue 4: Missing Employee ID

**Error**: `useUserCapabilitiesGraphQL: Missing employeeId`

**Solution**: Check if `userInfo.employeeDetails.employeeId` exists:

```javascript
// In browser console:
console.log('userInfo:', window.userInfo?.employeeDetails?.employeeId);
```

#### Issue 5: No Capabilities Found

**Log**: `useUserCapabilitiesGraphQL: No EmployeePosition data found`

**Expected Behavior**: Should fallback to mock data - check if mock tickets appear.

### Step 3: Testing GraphQL Connection

Run this query directly in GraphQL playground or console:

```graphql
query TestEmployeePosition {
  EmployeePosition(limit: 1) {
    id
    employeeId
    capability {
      id
      name
    }
  }
}
```

### Step 4: Enable Fallback Mode

If GraphQL continues to fail, the system should automatically fallback to mock data. Check these logs:

```
useUserCapabilities: No GraphQL capabilities, falling back to mock data
useUserCapabilities: Seeding sample data
useUserCapabilities: Final mock capabilities: [...]
```

### Step 5: Force Fallback Testing

To test the fallback behavior:

1. Temporarily disable GraphQL by commenting out the endpoint in `.env`
2. Reload the page
3. Should see mock HR/IT desks with sample tickets

### Step 6: Debug Network Requests

1. Open Network tab in Developer Tools
2. Look for GraphQL requests (usually POST to `/graphql`)
3. Check request/response details:
   - **Request Headers**: Should include Authorization
   - **Request Body**: Should contain the query and variables
   - **Response**: Check for errors or data

### Step 7: Manual Query Testing

Test the exact query being used:

```javascript
// In browser console (replace with actual values):
const query = `
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
    }
  }
`;

const variables = {
  employeeId: "your-employee-id-here",
  structureId: "your-structure-id-here"
};

// Make the request
fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token-here'
  },
  body: JSON.stringify({ query, variables })
})
.then(r => r.json())
.then(console.log);
```

## Expected Behavior

### Successful GraphQL Integration
```javascript
// Console logs you should see:
useUserCapabilitiesGraphQL: Fetching capabilities for {employeeId: "...", structureId: "..."}
useUserCapabilitiesGraphQL: GraphQL response {EmployeePosition: [...]}
useDesksForUser: Using GraphQL-based capabilities
useDesksForUser: Access granted to desk HR (reason: capability)
```

### Successful Fallback Mode
```javascript
// Console logs for fallback:
useUserCapabilitiesGraphQL: Error fetching capabilities
useUserCapabilities: No GraphQL capabilities, falling back to mock data
useUserCapabilities: Seeding sample data
useUserCapabilities: Final mock capabilities: [{desk: "HR", name: "Human Resources", ticketCount: 3}]
```

## Advanced Debugging

### Enable Detailed Logging

Add this to browser console for more verbose logging:
```javascript
localStorage.setItem('debug', 'ser:*');
// Then refresh the page
```

### Check Component State

Using React DevTools:
1. Find `ServiceDesk` component
2. Check hooks state:
   - `useUserCapabilities`: Should have capabilities array
   - `useDesksForUser`: Should have availableDesks array
   - `useUserCapabilitiesGraphQL`: Check for errors

### Verify Hook Integration

Check that all hooks are properly integrated:
```javascript
// In component:
console.log('Hook states:', {
  capabilities: capabilities,
  isLoading: isLoading,
  error: error
});
```

## Performance Issues

If the Service Desk loads slowly:

1. **Check GraphQL Query Performance**
   - Look at Network tab timing
   - Query should complete in < 1 second

2. **Check Mock Data Seeding**
   - Large mock datasets can slow initialization
   - Consider reducing seed data in development

3. **Check React Rendering**
   - Use React DevTools Profiler
   - Look for unnecessary re-renders

## Security Considerations

1. **Token Expiration**: Ensure tokens are refreshed properly
2. **CORS Issues**: Check if GraphQL endpoint allows requests from your domain
3. **Rate Limiting**: Some GraphQL endpoints have query limits

## Getting Help

If issues persist:

1. **Collect Debug Information**:
   - Browser console logs
   - Network request details
   - Component state snapshots

2. **Check Documentation**:
   - `GraphQL-Integration.md` for implementation details
   - `test-graphql-query.md` for testing procedures

3. **Environment Check**:
   - Development vs Production differences
   - Environment variable configuration
   - GraphQL endpoint availability

---

**Remember**: The Services+ integration is designed to be resilient. Even if GraphQL fails completely, users should still be able to access the Service Desk with mock data! 🛡️
