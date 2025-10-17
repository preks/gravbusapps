# GraphQL Schema Integration for AI Builder

## Overview

This document explains how the AI Builder integrates with the NEWWORK GraphQL schema to generate screens with real data integration.

## Architecture

### Why NOT in Global FORGE?

The GraphQL schema information is **intentionally NOT added to the global FORGE tools** because:

1. **Repository-Specific**: The NEWWORK GraphQL schema is specific to the `gravity-business-apps` repository
2. **FORGE is Generic**: FORGE is designed to work with ANY repository, not just NEWWORK projects
3. **Security**: Prevents leaking NEWWORK-specific schema information to non-NEWWORK projects
4. **Clarity**: Keeps NEWWORK patterns separate from generic AI building patterns

### Where GraphQL Info Lives

✅ **Included**: `config/systemPrompt.ts` in gravity-business-apps
- Contains complete entity schemas
- Provides GraphQL query examples
- Explains where conditions and filters
- Documents AppActionButton integration

❌ **Not Included**: FORGE global tools (`packages/api/src/tools/index.ts`)
- FORGE remains repository-agnostic
- No NEWWORK-specific assumptions
- Works with any project structure

## How It Works

### 1. System Prompt as Documentation

The `config/systemPrompt.ts` file serves as:

1. **AI Instructions**: When using Cursor Composer in this repository
2. **Developer Reference**: Complete examples for manual development
3. **Pattern Library**: All NEWWORK-specific patterns in one place

### 2. Available Entities

The system prompt documents these entities with full schemas:

#### CRM Entities
- **Account**: Customer organizations with addresses, contacts, and owner info
- **Lead**: Potential customers with status, rating, and source tracking
- **Contact**: Individual contacts with account relationships
- **Opportunity**: Sales opportunities with stages, amounts, and probabilities

#### HR Entities
- **Employee**: Staff members with departments, positions, and managers

### 3. GraphQL Query Patterns

All documented queries follow this pattern:

```graphql
query GetEntities($where: EntityBoolExp, $limit: Int, $offset: Int) {
  Entity(where: $where, limit: $limit, offset: $offset, order_by: { createdAt: DESC }) {
    id
    # ... entity fields
  }
  EntityAggregate(where: $where) {
    aggregate { count }
  }
}
```

### 4. Where Condition Patterns

```typescript
// Text search (case-insensitive)
const whereCondition = {
  _or: [
    { firstName: { _ilike: `%${search}%` } },
    { lastName: { _ilike: `%${search}%` } },
  ]
};

// Nested object search
const whereCondition = {
  _or: [
    { name: { _ilike: `%${search}%` } },
    { ownerEmployee: { firstName: { _ilike: `%${search}%` } } },
  ]
};
```

## Usage in AI Builder

### When Building a Screen

1. **AI Reads System Prompt**: The AI (Cursor Composer) has access to `systemPrompt.ts`
2. **Identifies Entity Needs**: Based on user request, identifies which entities to use
3. **Generates GraphQL Queries**: Creates proper queries following documented patterns
4. **Generates Integration Code**: Creates hooks, queries, and components

### Example User Request

**Input**: "Create a lead management screen with search and filters"

**AI Output**:
```typescript
// queries/LeadQueries.ts
export const GET_LEADS_QUERY = (variables: LeadQueryVariables): string => {
  const whereCondition: any = {};
  
  if (variables.search) {
    whereCondition._or = [
      { firstName: { _ilike: `%${variables.search}%` } },
      { lastName: { _ilike: `%${variables.search}%` } },
      { company: { _ilike: `%${variables.search}%` } },
      { email: { _ilike: `%${variables.search}%` } },
    ];
  }

  return `
    query GetLeads {
      Lead(
        where: ${JSON.stringify(whereCondition)}
        limit: ${variables.limit || 20}
        offset: ${variables.offset || 0}
        order_by: { createdAt: DESC }
      ) {
        id
        firstName
        lastName
        email
        phone
        company
        leadStatus { value }
        leadRating { value }
        ownerEmployee {
          firstName
          lastName
          displayName
        }
        createdAt
      }
      LeadAggregate(where: ${JSON.stringify(whereCondition)}) {
        aggregate { count }
      }
    }
  `;
};
```

## Real-World Entity Schemas

### Account Schema

```graphql
Account {
  id: String!
  name: String!
  website: String
  phone: String
  email: String
  legalForm: CatalogEntry { id, value, code }
  industry: CatalogEntry { id, value, code }
  numberOfEmployees: CatalogEntry { value }
  annualRevenue: CatalogEntry { value, code }
  addresses: [CrmAddress { city, country { value }, region { value } }]
  accountContacts: [AccountContact { contact { ... } }]
  ownerEmployee: Employee { id, firstName, lastName }
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Lead Schema

```graphql
Lead {
  id: String!
  firstName: String
  lastName: String
  email: String
  phone: String
  company: String
  jobTitle: String
  linkedinUrl: String
  leadSource: CatalogEntry { id, value, code }
  leadStatus: CatalogEntry { id, value, code }
  leadRating: CatalogEntry { id, value, code }
  ownerEmployee: Employee { id, firstName, lastName, displayName }
  createdAt: DateTime
  updatedAt: DateTime
}
```

## AppActionButton Integration

Every generated table MUST include AppActionButton for row actions:

```typescript
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

// In table columns
{
  accessorKey: 'actions',
  header: 'Actions',
  cell: ({ row }) => (
    <AppActionButton
      data-testid={`lead-update-button-${row.original.id}`}
      size="icon"
      contextsArray={[FlowContextName.customerLeadEntity]}
      externalContextData={{ leadId: row.original.id }}
      prefixDataTestId="lead-update"
      accessToken={props.accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
      onClick={(e) => e.stopPropagation()}
    />
  )
}
```

### Flow Context Mapping

| Entity | Flow Context | External Data |
|--------|--------------|---------------|
| Lead | `FlowContextName.customerLeadEntity` | `{ leadId }` |
| Account | `FlowContextName.customerAccountEntity` | `{ accountId }` |
| Contact | `FlowContextName.customerContactEntity` | `{ contactId }` |
| Opportunity | `FlowContextName.customerOpportunityEntity` | `{ opportunityId }` |
| Employee | `FlowContextName.employeeEntity` | `{ employeeId }` |

## Testing GraphQL Integration

### Manual Testing

1. **Check System Prompt**: Verify `config/systemPrompt.ts` has latest schemas
2. **Generate Screen**: Ask AI to create a list screen for an entity
3. **Verify Queries**: Check generated queries match documented patterns
4. **Test Where Conditions**: Ensure search uses `_or` with `_ilike`
5. **Test AppActionButton**: Verify all tables have actions column

### Example Test Cases

**Test 1: Lead List with Search**
```
User: "Create a lead list screen with search"
Expected: 
- Generates LeadQueries.ts with proper where conditions
- Creates search input that filters by name, email, company
- Includes AppActionButton with customerLeadEntity context
```

**Test 2: Account Dashboard**
```
User: "Create an account dashboard with statistics and list"
Expected:
- Generates AccountQueries.ts with aggregate queries
- Creates statistics cards showing totals
- Creates table with search and filters
- Includes AppActionButton with customerAccountEntity context
```

## Troubleshooting

### Query Not Working

**Problem**: Generated query doesn't return data
**Solution**: 
1. Check entity name matches GraphQL schema exactly (case-sensitive)
2. Verify where conditions use correct field names
3. Test query in GraphQL Playground first

### AppActionButton Missing

**Problem**: Table doesn't have actions column
**Solution**:
1. Remind AI: "Add AppActionButton column to the table"
2. Specify: "Use FlowContextName.customerLeadEntity for leads"
3. Reference: Point to system prompt AppActionButton section

### Wrong Flow Context

**Problem**: AppActionButton uses wrong context name
**Solution**:
1. Check Flow Context Mapping table in system prompt
2. Ensure external data includes correct ID field
3. Verify context matches entity (leadId for leads, accountId for accounts)

## Best Practices

### For AI Prompts

1. **Be Specific**: "Create a lead list with search by name, email, and company"
2. **Mention Data**: "Use GraphQL to fetch leads from the Lead entity"
3. **Request Actions**: "Include AppActionButton for each row"

### For Generated Code

1. **Always Use Hooks**: Separate GraphQL logic into hooks
2. **Handle Loading**: Show loading spinners during data fetch
3. **Handle Errors**: Display error messages with retry option
4. **Add TestIDs**: All interactive elements need data-testid

### For Maintenance

1. **Keep System Prompt Updated**: When schema changes, update systemPrompt.ts
2. **Document New Patterns**: Add new entities and queries to documentation
3. **Test Regularly**: Verify AI generates correct queries periodically

## Future Enhancements

### Potential Improvements

1. **Live Schema Access**: Connect directly to GraphQL introspection
2. **Query Builder UI**: Visual query building in AI Builder
3. **Schema Validation**: Validate generated queries against real schema
4. **Template Library**: Pre-built query templates for common patterns

### Integration Points

1. **MCP Server**: Could expose newwork-graphql-mcp tools to FORGE (if needed)
2. **Schema Sync**: Automated updates to systemPrompt.ts from live schema
3. **Query Testing**: Built-in query tester in AI Builder UI

## Summary

✅ **GraphQL schema information is ONLY in gravity-business-apps**
✅ **FORGE remains repository-agnostic**
✅ **System prompt provides complete entity documentation**
✅ **All patterns follow NEWWORK conventions**
✅ **AppActionButton integration is documented**
✅ **Where conditions use proper patterns**

This architecture ensures:
- Clean separation of concerns
- Repository-specific knowledge stays local
- FORGE can work with any project
- AI has all information needed to generate correct code

