# Debug: Missing Team Member Expense Requests

## Issue

Razvan is part of your team, but his expense requests are not showing in the Manager Expenses view.

## Root Cause Checklist

### 1. **Supervisor Relationship**

The query filters by `supervisorEmployeeId`:

```graphql
where: {
  employee: {
    employeePosition: {
      supervisorEmployeeId: {_eq: $managerId}
    }
  }
}
```

**✅ Check**: Is Razvan's `employeePosition.supervisorEmployeeId` set to your employee ID?

### 2. **isDeleted Flag**

All queries include:

```graphql
isDeleted: {_eq: false}
```

**✅ Check**: Are Razvan's expense requests marked as `isDeleted: false`?

### 3. **Status Filter**

If you have a status filter active, it might be hiding his requests.

**✅ Check**: What status are Razvan's requests? Do they match your current filter?

### 4. **Currency Filter**

If you have a currency filter active, it might be hiding his requests.

**✅ Check**: What currency are Razvan's requests? Do they match your current filter?

## Diagnostic Queries

### Test 1: Check Razvan's Supervisor Relationship

```graphql
query CheckRazvanSupervisor {
  Employee(
    where: {
      _or: [
        { firstName: { _ilike: "%Razvan%" } }
        { lastName: { _ilike: "%Razvan%" } }
        { fullName: { _ilike: "%Razvan%" } }
      ]
    }
  ) {
    id
    fullName
    employeePosition {
      id
      supervisorEmployeeId
      supervisor {
        id
        fullName
      }
    }
  }
}
```

**Expected**: `supervisorEmployeeId` should match YOUR employee ID.

### Test 2: Check Your Employee ID

```graphql
query CheckMyEmployeeId {
  Employee(
    where: {
      # Use your email or name
      email: { _ilike: "%mihaela%" }
    }
  ) {
    id
    fullName
    email
  }
}
```

### Test 3: Check Razvan's Expense Requests

```graphql
query CheckRazvanExpenseRequests {
  ExpenseRequest(
    where: {
      employee: {
        _or: [
          { firstName: { _ilike: "%Razvan%" } }
          { lastName: { _ilike: "%Razvan%" } }
          { fullName: { _ilike: "%Razvan%" } }
        ]
      }
    }
  ) {
    id
    code
    title
    status
    isDeleted
    currencyRef
    employee {
      id
      fullName
      employeePosition {
        supervisorEmployeeId
        supervisor {
          id
          fullName
        }
      }
    }
  }
}
```

**Check**:

- Is `isDeleted: false`?
- Does `supervisorEmployeeId` match your ID?
- What is the `status`?
- What is the `currencyRef`?

### Test 4: Check All Team Members Under You

```graphql
query CheckMyTeam($myEmployeeId: uuid!) {
  Employee(where: { employeePosition: { supervisorEmployeeId: { _eq: $myEmployeeId } }, isActive: { _eq: true } }) {
    id
    fullName
    email
    isActive
    employeePosition {
      id
      title
      supervisorEmployeeId
    }
  }
}
```

**Check**: Is Razvan in this list?

### Test 5: Check Expense Requests for Your Team

```graphql
query CheckTeamExpenseRequests($myEmployeeId: uuid!) {
  ExpenseRequest(
    where: {
      employee: { employeePosition: { supervisorEmployeeId: { _eq: $myEmployeeId } } }
      isDeleted: { _eq: false }
    }
  ) {
    id
    code
    title
    status
    currencyRef
    requestDate
    employee {
      id
      fullName
    }
  }
}
```

**Check**: Are Razvan's requests in this list?

## Common Issues

### Issue 1: Supervisor Not Set

**Symptom**: Razvan's `employeePosition.supervisorEmployeeId` is `null` or points to someone else.

**Solution**: Update Razvan's employee position:

```graphql
mutation UpdateRazvanSupervisor($razvanEmployeeId: uuid!, $yourEmployeeId: uuid!) {
  updateEmployeePosition(
    where: { employeeId: { _eq: $razvanEmployeeId } }
    _set: { supervisorEmployeeId: $yourEmployeeId }
  ) {
    affected_rows
    returning {
      employeeId
      supervisorEmployeeId
    }
  }
}
```

### Issue 2: Requests Marked as Deleted

**Symptom**: Razvan's requests have `isDeleted: true`.

**Solution**: This is likely intentional. Check with backend team why requests are marked as deleted.

### Issue 3: Status Filter Active

**Symptom**: Razvan's requests have a status that's filtered out.

**Solution**: Clear the status filter or adjust it to include all statuses.

### Issue 4: Currency Filter Active

**Symptom**: Razvan's requests use a currency that's filtered out.

**Solution**: Clear the currency filter or select "All Currencies".

### Issue 5: Wrong Manager ID

**Symptom**: The application is using the wrong employee ID for you.

**Solution**: Check `userInfo.employeeDetails.employeeId` in the browser console:

```javascript
// In browser console
console.log(window.__BUSINESS_APP_CONTEXT__?.userInfo?.employeeDetails?.employeeId)
```

## Testing Steps

1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Filter by**: `graphql` or `newwork`
4. **Refresh the Expense Requests tab**
5. **Find the GraphQL request** for `GetExpenseRequestsByManager`
6. **Check the variables** sent:
   ```json
   {
     "where": {
       "employee": {
         "employeePosition": {
           "supervisorEmployeeId": { "_eq": "YOUR-EMPLOYEE-ID" }
         }
       },
       "isDeleted": { "_eq": false }
       // ... other filters
     }
   }
   ```
7. **Check the response**: Are Razvan's requests in the result?

## Quick Browser Console Test

Run this in your browser console while on the Manager Expenses page:

```javascript
// Get your employee ID
const myId = window.__BUSINESS_APP_CONTEXT__?.userInfo?.employeeDetails?.employeeId
console.log('My Employee ID:', myId)

// Check current filters
console.log('Current Status Filter:' /* check React DevTools */)
console.log('Current Currency Filter:' /* check React DevTools */)
```

## Next Steps

1. Run the diagnostic queries above
2. Verify Razvan's supervisor relationship
3. Check if any filters are active
4. Verify `isDeleted` flag on his requests
5. Check the browser network tab for the actual GraphQL request/response

Once you identify which check fails, you'll know the root cause!
