# Backend Specification: Employee Risk Score Tracking

## Overview

Enable historical tracking of employee flight risk scores to show trends over time (improving, stable, or worsening).

## Database Schema

### Table: `employee_risk_score`

```sql
CREATE TABLE employee_risk_score (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,

  -- Risk metrics
  overall_score NUMERIC(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_level NUMERIC(5,2) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),

  -- Individual signals (JSONB for flexibility)
  signals JSONB NOT NULL,

  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by VARCHAR(50) DEFAULT 'system', -- 'system' or 'manual'

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

  -- Indexes
  CONSTRAINT unique_employee_calculation UNIQUE (employee_id, calculated_at)
);

-- Indexes for performance
CREATE INDEX idx_employee_risk_score_employee_id ON employee_risk_score(employee_id);
CREATE INDEX idx_employee_risk_score_calculated_at ON employee_risk_score(calculated_at);
CREATE INDEX idx_employee_risk_score_risk_level ON employee_risk_score(risk_level);
CREATE INDEX idx_employee_risk_score_not_deleted ON employee_risk_score(is_deleted) WHERE is_deleted = FALSE;

-- Composite index for history queries
CREATE INDEX idx_employee_risk_score_history ON employee_risk_score(employee_id, calculated_at DESC) WHERE is_deleted = FALSE;
```

### `signals` JSONB Structure Example

```json
{
  "tenure": {
    "id": "tenure",
    "category": "tenure",
    "name": "Tenure Risk",
    "normalizedScore": 75,
    "weight": 15,
    "rawValue": 13,
    "description": "First year - critical retention period",
    "dataSource": "workingCondition.hireDate"
  },
  "performance": {
    "id": "performance",
    "category": "performance",
    "name": "Performance",
    "normalizedScore": 71,
    "weight": 25,
    "rawValue": 2,
    "description": "2 goals behind target",
    "dataSource": "EmployeePerformanceGoal"
  },
  "engagement": {
    "id": "engagement",
    "category": "engagement",
    "name": "Manager Engagement",
    "normalizedScore": 50,
    "weight": 20,
    "rawValue": 0,
    "description": "Active manager engagement",
    "dataSource": "EmployeeFeedback (manager)"
  },
  "wellness": {
    "id": "wellness",
    "category": "wellness",
    "name": "Wellness",
    "normalizedScore": 15,
    "weight": 15,
    "rawValue": 0,
    "description": "Normal absence patterns",
    "dataSource": "EmployeeAbsence"
  },
  "sentiment": {
    "id": "sentiment",
    "category": "sentiment",
    "name": "Feedback Sentiment",
    "normalizedScore": 85,
    "weight": 15,
    "rawValue": 85,
    "description": "Very negative feedback highlighting multiple issues",
    "dataSource": "EmployeeFeedback + AI Analysis",
    "isAIAnalyzed": true
  },
  "compensation": {
    "id": "compensation",
    "category": "compensation",
    "name": "Compensation",
    "normalizedScore": 35,
    "weight": 10,
    "rawValue": 0,
    "description": "Recent compensation likely competitive",
    "dataSource": "EmployeeSalary"
  }
}
```

## GraphQL API Requirements

### Query: Get Risk Score History

```graphql
type Query {
  EmployeeRiskScore(
    where: EmployeeRiskScoreBoolExp
    orderBy: [EmployeeRiskScoreOrderBy!]
    limit: Int
    offset: Int
  ): [EmployeeRiskScore!]!
}

type EmployeeRiskScore {
  id: uuid!
  employeeId: uuid!
  overallScore: numeric!
  riskLevel: String!
  confidenceLevel: numeric!
  signals: jsonb!
  calculatedAt: timestamptz!
  calculatedBy: String!
  createdAt: timestamptz!
  createdBy: uuid
  isDeleted: Boolean!

  # Relationships
  employee: Employee!
}

input EmployeeRiskScoreBoolExp {
  employeeId: UuidComparisonExp
  overallScore: NumericComparisonExp
  riskLevel: StringComparisonExp
  calculatedAt: TimestamptzComparisonExp
  isDeleted: BooleanComparisonExp
  _and: [EmployeeRiskScoreBoolExp!]
  _or: [EmployeeRiskScoreBoolExp!]
}

input EmployeeRiskScoreOrderBy {
  calculatedAt: OrderBy
  overallScore: OrderBy
}

enum OrderBy {
  ASC
  DESC
  ASC_NULLS_FIRST
  ASC_NULLS_LAST
  DESC_NULLS_FIRST
  DESC_NULLS_LAST
}
```

### Mutation: Save Risk Score

```graphql
type Mutation {
  insertEmployeeRiskScore(objects: [EmployeeRiskScoreInsertInput!]!): EmployeeRiskScoreMutationResponse!
}

input EmployeeRiskScoreInsertInput {
  employeeId: uuid!
  overallScore: numeric!
  riskLevel: String!
  confidenceLevel: numeric!
  signals: jsonb!
  calculatedBy: String
}

type EmployeeRiskScoreMutationResponse {
  affected_rows: Int!
  returning: [EmployeeRiskScore!]!
}
```

## Example Queries

### Get Last 6 Risk Scores for Multiple Employees

```graphql
query GetRiskTrendHistory($employeeIds: [uuid!]!, $limit: Int = 6) {
  EmployeeRiskScore(
    where: { employeeId: { _in: $employeeIds }, isDeleted: { _eq: false } }
    orderBy: [{ calculatedAt: DESC }]
    limit: $limit
  ) {
    id
    employeeId
    overallScore
    riskLevel
    confidenceLevel
    calculatedAt
    signals
  }
}
```

### Save New Risk Score

```graphql
mutation SaveRiskScore($scores: [EmployeeRiskScoreInsertInput!]!) {
  insertEmployeeRiskScore(objects: $scores) {
    affected_rows
    returning {
      id
      employeeId
      overallScore
      calculatedAt
    }
  }
}
```

## Business Rules

### 1. Calculation Frequency

- Auto-calculate when manager views dashboard (if last calculation > 1 hour ago)
- Manual recalculation available on-demand
- Store max 1 calculation per employee per hour (prevent spam)

### 2. Data Retention

- Keep all historical records (soft delete only)
- Archive records older than 2 years to separate table (optional optimization)

### 3. Trend Calculation Logic

- **Improving**: Latest score < average of previous 3 scores by >5 points
- **Worsening**: Latest score > average of previous 3 scores by >5 points
- **Stable**: Within ±5 points of average

### 4. Permissions

- **Managers**: Can view risk scores for their direct reports
- **HR Admins**: Can view all risk scores
- **System**: Can auto-save scores
- **Employees**: Cannot view their own risk scores

## Frontend Integration Points

### 1. Auto-Save Hook

Location: `src/business-apps/hr/core/apps/manager-dashboard/hooks/useSaveRiskScores.ts`

**Current Status**: Implemented, waiting for backend

**What it does**: Automatically saves risk scores after calculation with debouncing

### 2. Trend History Hook

Location: `src/business-apps/hr/core/apps/manager-dashboard/hooks/useRiskTrendHistory.ts`

**Current Status**: Implemented, waiting for backend

**What it does**: Fetches historical scores and calculates trend direction

### 3. UI Display

Location: `src/business-apps/hr/core/apps/manager-dashboard/components/FlightRiskDetailPanel.tsx`

**Current Status**: Shows mock trend, will show real trend once data available

**What it shows**: Arrow icon (↗ improving, → stable, ↘ worsening)

## Testing Requirements

### 1. Unit Tests

- [ ] Trend calculation logic (improving/stable/worsening)
- [ ] Score validation (0-100 range)
- [ ] Risk level calculation (low/medium/high/critical)

### 2. Integration Tests

- [ ] GraphQL queries return correct data
- [ ] Mutations save correctly with proper timestamps
- [ ] Filters and ordering work as expected
- [ ] Permissions enforce access control

### 3. Performance Tests

- [ ] Query performance for 1000+ employees
- [ ] Index effectiveness
- [ ] JSONB query performance

## Migration Plan

### Phase 1: Schema Creation

1. Create table in dev environment
2. Add Hasura metadata for GraphQL API
3. Test queries manually

### Phase 2: Data Seeding (Optional)

1. Backfill historical data from last month (if available)
2. Run initial calculation for all employees

### Phase 3: Deployment

1. Deploy schema to staging
2. Test frontend integration
3. Deploy to production
4. Monitor performance

## Success Criteria

- [ ] Table created with all fields and indexes
- [ ] GraphQL API accessible and working
- [ ] Frontend auto-save working without errors
- [ ] Trend arrows showing correct direction
- [ ] Query performance < 500ms for typical manager dashboard (10-20 employees)
- [ ] No permission leaks (employees can't see their own scores)

## Timeline Estimate

- **Backend Schema + API**: 2-3 days
- **Testing & Fixes**: 1-2 days
- **Total**: ~1 week

## Questions for Backend Team

1. Preferred JSONB indexing strategy for signals field?
2. Should we partition the table by year for better performance?
3. Archival strategy for old records?
4. Rate limiting on mutations to prevent abuse?

## References

- Frontend Implementation: `/src/business-apps/hr/core/apps/manager-dashboard/`
- Risk Calculation Logic: `utils/flightRiskCalculations.ts`
- Type Definitions: `types/flightRisk.types.ts`
