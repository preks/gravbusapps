---
alwaysApply: false
---
# Master Data Management (MDM) Patterns

## MDM App Structure
MDM apps typically combine data from multiple sources:
- **GraphQL APIs**: For transactional data (job levels, compensation bands)
- **Catalog APIs**: For reference data (job level groups, categories)

## Common MDM Entities

### Job Structure Data
- **Job Level Groups**: From Catalog API (`JobLevelGroup` v1)
- **Job Levels**: From GraphQL API with `jobLevelGroupRef` relationships
- **Compensation Bands**: From GraphQL API with currency handling

### Compensation Data
- **Compensation Bands**: From GraphQL with salary ranges and currency
- **Pay Grades**: Visual representation combining job levels and compensation
- **Career Bands**: Groupings of related compensation levels

## Data Integration Patterns for MDM

### Multi-Source Integration Hook
```typescript
export const useEntityDataIntegration = (context: BusinessAppContextProps) => {
  const [entities, setEntities] = useState<EnhancedEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch from multiple sources in parallel
      const [graphqlData, catalogData] = await Promise.all([
        fetchGraphQLData(),
        fetchCatalogData()
      ]);
      
      // Transform and combine data
      const enhancedEntities = combineAndTransformData(graphqlData, catalogData);
      setEntities(enhancedEntities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken]);

  return { entities, isLoading, error, refetch: loadData };
};
```

## MDM-Specific UI Patterns

### Tabbed Interface
MDM apps typically use tabs to organize different data types:
```typescript
const tabs = [
  { key: 'job-levels', label: 'Job Levels' },
  { key: 'compensation-bands', label: 'Compensation Bands' },
  { key: 'pay-grades', label: 'Pay Grades' }
];
```

### Pay Grade Matrix Visualization
Special grid layout for showing relationships between job levels and compensation:
```typescript
// Matrix structure: each row contains label + all grid cells
<div className="gba:grid gba:grid-cols-[200px_1fr_200px] gba:gap-4">
  {payGrades.map(grade => (
    <div key={grade.id} className="gba:contents">
      {/* Pay Grade Label */}
      <div className="gba:flex gba:items-center gba:pr-4">
        <span className="gba:truncate gba:text-sm" title={grade.name}>
          {grade.name}
        </span>
      </div>
      
      {/* Job Level Grid Cells */}
      <div className="gba:flex gba:gap-1">
        {jobLevelGroups.map(group => (
          <div key={group.id} className="gba:flex-1 gba:h-8 gba:bg-gray-100" />
        ))}
      </div>
      
      {/* Salary Range */}
      <div className="gba:text-right gba:text-sm">
        {formatCurrency(grade.minSalary)} - {formatCurrency(grade.maxSalary)}
      </div>
    </div>
  ))}
</div>
```

## Data Transformation for MDM

### Enhanced Interfaces
Create computed fields for better UI experience:
```typescript
export interface EnhancedJobLevel {
  id: string;
  name: string;
  code?: string;
  level: number; // from hierarchyOrder
  jobLevelGroupId: string; // from jobLevelGroupRef
  compensationBandId?: string;
  // Computed fields
  displayName: string;
  salaryGrade?: number;
  experienceYears?: number;
}

export interface EnhancedJobLevelGroup {
  id: string;
  name: string;
  code: string;
  category: string;
  // Computed fields
  jobLevels: EnhancedJobLevel[];
  jobLevelCount: number;
  color: string; // for UI display
}
```

### Color Palettes for Categories
```typescript
const GROUP_COLORS = [
  'gba:bg-blue-400',
  'gba:bg-green-400', 
  'gba:bg-purple-400',
  'gba:bg-orange-400',
  'gba:bg-pink-400',
  'gba:bg-indigo-400',
  'gba:bg-teal-400',
  'gba:bg-red-400'
];
```

## Currency Handling in MDM
MDM often deals with financial data requiring proper currency formatting:

```typescript
// Extract currency code from API format
const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR';
};

// Format currency for display
const formatCurrency = (amount: number, currencyId: string): string => {
  const currency = extractCurrencyCode(currencyId);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
```

## Common MDM Catalog Identifiers
```typescript
// Job structure catalogs
export const JOB_LEVEL_GROUP_CATALOG = 'JobLevelGroup';
export const JOB_FAMILY_CATALOG = 'JobFamily';
export const JOB_FUNCTION_CATALOG = 'JobFunction';

// Organizational catalogs
export const DEPARTMENT_CATALOG = 'Department';
export const LOCATION_CATALOG = 'Location';
export const COST_CENTER_CATALOG = 'CostCenter';

// Compensation catalogs
export const COMPENSATION_BAND_CATALOG = 'CompensationBand';
export const PAY_GRADE_CATALOG = 'PayGrade';

// All typically use version 'v1'
export const CATALOG_VERSION = 'v1';
```

## MDM Table Patterns

### Expandable Master-Detail Tables
```typescript
const expandedRowRender = (record: EnhancedEntity) => {
  return (
    <div style={{ margin: '16px 0', background: '#fafafa', padding: '16px' }}>
      <Title level={5}>Related Data for {record.name}</Title>
      {record.relatedItems.length > 0 ? (
        <Table
          columns={detailColumns}
          dataSource={record.relatedItems}
          pagination={false}
          size="small"
        />
      ) : (
        <div style={{ textAlign: 'center', color: '#999' }}>
          No related items found
        </div>
      )}
    </div>
  );
};
```

### Hierarchical Data Display
For showing parent-child relationships in MDM:
```typescript
// Use tree-like structure with indentation
{
  title: 'Name',
  dataIndex: 'name',
  render: (name: string, record: Entity) => (
    <div style={{ paddingLeft: `${record.level * 20}px` }}>
      {record.hasChildren && <FolderOutlined />}
      {name}
    </div>
  )
}
```

## CRUD Operations for MDM
MDM components prepare for future process API integration:
```typescript
const handleCreate = async () => {
  // TODO: Implement with process API integration
  message.warning('Create functionality will be implemented with process API integration');
  await refetch(); // Refresh data
};

const handleUpdate = async (entity: Entity) => {
  // TODO: Implement with process API integration
  message.warning('Update functionality will be implemented with process API integration');
  await refetch(); // Refresh data
};

const handleDelete = async (entity: Entity) => {
  Modal.confirm({
    title: `Delete ${entity.name}?`,
    content: 'This action cannot be undone.',
    onOk: async () => {
      // TODO: Implement with process API integration
      message.warning('Delete functionality will be implemented with process API integration');
      await refetch(); // Refresh data
    }
  });
};
```
