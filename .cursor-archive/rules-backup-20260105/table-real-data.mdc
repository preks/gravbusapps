---
alwaysApply: true
---
- Pagination of Table components should **ALWAYS** trigger a graphql query. So the new data should be query based.
- Search functionality of Table components should **ALWAYS** trigger a graphql query. So the new data should be query based.
- Sorting of Table components should **ALWAYS** trigger a graphql query. So the new data should be query based.
- Filter functionality of Table components should **ALWAYS** trigger a graphql query. So the new data should be query based.

# Table Component with Real Data

When creating table components that integrate with real API data:

- Show `<Spin size="large" />` for loading states
- Show `<Alert>` with retry button for errors
- Handle empty states with meaningful messages
- Use expandable rows for master-detail relationships

## Table Component Pattern
```typescript
const EntityTable: React.FC<EntityTableProps> = (context) => {
  const { entities, isLoading, error, refetch } = useEntityDataIntegration(context);
  
  if (isLoading) {
    return <Spin size="large" />;
  }
  
  if (error) {
    return (
      <Alert
        message="Error Loading Data"
        description={error}
        type="error"
        showIcon
        action={<Button size="small" onClick={refetch}>Retry</Button>}
      />
    );
  }
  
  return (
    <Table
      columns={columns}
      dataSource={entities}
      rowKey="id"
      loading={isLoading}
      expandable={{
        expandedRowRender,
        expandedRowKeys: Array.from(expandedRows),
      }}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
          `${range[0]}-${range[1]} of ${total} items`,
      }}
    />
  );
};
```

## Expandable Row Pattern
```typescript
const expandedRowRender = (record: EnhancedEntity) => {
  return (
    <div style={{ margin: '16px 0', background: '#fafafa', padding: '16px' }}>
      <Title level={5}>Details for {record.name}</Title>
      {record.relatedItems.length > 0 ? (
        <Table columns={detailColumns} dataSource={record.relatedItems} pagination={false} />
      ) : (
        <div style={{ textAlign: 'center', color: '#999' }}>
          No related items found
        </div>
      )}
    </div>
  );
};
```

## Comprehensive Search Implementation Guidelines

**CRITICAL RULE**: Every field displayed in a table row MUST be searchable. Users should be able to find any data they can see.

### Search Field Analysis Process
1. **Audit Displayed Fields**: Identify ALL data shown in table rows
2. **Check Current Search**: Compare with existing GraphQL search conditions  
3. **Add Missing Fields**: Include every displayed field in search `_or` array
4. **Test Search Coverage**: Verify users can search all visible data

### Search Implementation Pattern
```typescript
// Add search functionality - MUST include ALL displayed fields
if (params.search?.trim()) {
  const searchPattern = { _ilike: `%${params.search.trim()}%` };
  whereCondition._or = [
    // Direct scalar fields
    { firstName: searchPattern },
    { lastName: searchPattern },
    { email: searchPattern },
    { phone: searchPattern },
    { jobTitle: searchPattern },
    
    // Nested object fields (use correct GraphQL path)
    { academicTitle: { value: searchPattern } }, // For catalog entries
    { account: { name: searchPattern } },         // For related entities
    { ownerEmployee: { firstName: searchPattern } },
    { ownerEmployee: { lastName: searchPattern } },
    { ownerEmployee: { displayName: searchPattern } },
    
    // All other fields shown in UI
    { contactType: searchPattern },
    { linkedinUrl: searchPattern }
  ];
}
```

### Common Missing Search Fields
- **Academic/Professional Titles**: `academicTitle.value`, `professionalTitle.value`
- **Contact Information**: `linkedinUrl`, `xingUrl`, `website`
- **Classification Fields**: `contactType`, `accountType`
- **Status/Category Fields**: `leadStatus.value`, `leadRating.value`, `leadSource.value`
- **Pipeline Fields**: `stage`, `salesPipelineStage.value`, `pipeline.value`
- **Employee Names**: `ownerEmployee.displayName`, `ownerEmployee.fullName`
- **Company Details**: `companyEmail`, `companyWebsite`
- **Address Components**: `addresses.city`, `addresses.country.value`

### Field Type Search Patterns
```typescript
// Scalar fields
{ fieldName: { _ilike: `%${search}%` } }

// Catalog entry fields  
{ catalogField: { value: { _ilike: `%${search}%` } } }

// Related entity fields
{ relatedEntity: { fieldName: { _ilike: `%${search}%` } } }

// Array/relationship fields
{ arrayField: { relationField: { _ilike: `%${search}%` } } }
```

### Validation Checklist
- [ ] Every displayed column content is searchable
- [ ] Computed display values (like full names) have underlying fields searched
- [ ] Nested object values use correct GraphQL path syntax
- [ ] Badge/tag content fields are included in search
- [ ] Secondary text/descriptions are searchable
- [ ] Tooltip content can be found through search

@src/business-apps/mdm/apps/compensation-data/components/tabs/CompensationBandsTab.tsx




@src/business-apps/mdm/apps/compensation-data/components/tabs/CompensationBandsTab.tsx


