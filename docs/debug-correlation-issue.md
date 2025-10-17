# Debug Correlation ID Issue

## Problem

Workflow is being created with `correlationId` in the request payload, but when querying for workflows by that `correlationId`, we get an empty result.

## Debug Steps

### 1. Check if workflow is being created

```bash
# Check the custom-flow-engine logs when you click "Start Workflow"
# Look for:
# - "EXECUTION SERVICE: Prepared workflow input:"
# - "EXECUTION SERVICE: Workflow started successfully:"
# - Any error messages
```

### 2. Check what's in the database

```bash
# Call the debug endpoint to see all tasks
curl http://localhost:3000/api/flow/debug

# Expected: Should see tasks with input_data containing correlationId
```

### 3. Check the correlation query directly

```bash
# Test the correlation endpoint
curl http://localhost:3000/api/flow/correlation/8a8a7c88-36d1-496b-8604-420b83fe1e91

# Expected: Should return workflows if they exist
```

### 4. Check the database structure

```sql
-- Connect to PostgreSQL and run:
SELECT
  input_data,
  created_time,
  status
FROM user_tasks
ORDER BY created_time DESC
LIMIT 5;
```

## Possible Issues

### Issue 1: Workflow not being created

- **Symptoms**: No "Workflow started successfully" log
- **Cause**: Workflow execution failing
- **Solution**: Check workflow execution logs

### Issue 2: correlationId not stored correctly

- **Symptoms**: Workflow created but correlationId missing from input_data
- **Cause**: correlationId not being passed through correctly
- **Solution**: Check workflow input preparation

### Issue 3: Query looking in wrong place

- **Symptoms**: correlationId exists but query returns empty
- **Cause**: Database query structure mismatch
- **Solution**: Check query structure vs actual data structure

### Issue 4: Database schema mismatch

- **Symptoms**: Table doesn't exist or has wrong structure
- **Cause**: Database not properly initialized
- **Solution**: Check database setup

## Next Steps

1. Run the debug endpoint to see what's actually in the database
2. Check the workflow execution logs
3. Compare the actual data structure with the query expectations
4. Fix the identified issue
