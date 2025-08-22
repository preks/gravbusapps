# Investment Data Layer

This module provides data access, types, and GraphQL integration for investment-related entities.

## Structure

```
src/common/data/investment/
├── types/
│   ├── investmentBaseTypes.ts          # Base types for Investment + specializations (Equity, RealEstate, LiquidFund)
│   ├── investmentRelationBaseTypes.ts  # Base types for CRM entities (Account, Contact, Lead, Opportunity, etc.)
│   ├── investmentTypes.ts              # Enhanced types for Investment + specializations (with computed fields)
│   ├── investmentRelationTypes.ts      # Enhanced types for CRM entities (with computed fields)
│   ├── investmentEnums.ts              # Essential enums from DBML schema
│   └── index.ts                        # Clean type exports
├── queries/
│   ├── investmentQueries.ts            # Core Investment queries (with specializations)
│   ├── investmentAccountQueries.ts     # InvestmentAccount queries
│   ├── investmentContactQueries.ts     # InvestmentContact queries  
│   ├── investmentLeadQueries.ts        # InvestmentLead queries
│   ├── investmentOpportunityQueries.ts # InvestmentOpportunity queries
│   ├── investmentReportQueries.ts      # Investment Report queries
│   └── index.ts                        # Query exports
├── hooks/
│   ├── useInvestments.ts               # Investment data hooks
│   ├── useInvestmentAccounts.ts        # Investment Account hooks
│   ├── useInvestmentContacts.ts        # Investment Contact hooks
│   ├── useInvestmentLeads.ts           # Investment Lead hooks
│   ├── useInvestmentOpportunities.ts   # Investment Opportunity hooks
│   ├── useInvestmentDataIntegration.ts # Combined data integration
│   └── index.ts                        # Hook exports
├── mappers/
│   ├── investment.ts                   # Investment data transformations
│   ├── investmentAccount.ts            # Account data transformations
│   └── index.ts                        # Mapper exports
└── dbml/
    └── nw_investment_relations.dbml    # Database schema (source of truth)
```

## Design Principles

### Type Architecture
- **Base Types**: Match GraphQL responses exactly (no computed fields)
- **Enhanced Types**: Extend base types with computed UI fields
- **Common Types**: Reuse `CatalogEntry` and `Employee` from `@/common/network/graphql/commonTypes`

### Query Strategy  
- **Complete Queries**: Full self-contained queries using only common fragments (`CATALOG_ENTRY`, `AUDIT_FIELDS`, `EMPLOYEE`)
- **No Custom Fragments**: Avoid fragment definition conflicts - build complete queries first, extract fragments later if needed
- **Schema-Based**: All queries built using actual GraphQL schema discovered via newwork-mcp

### Data Flow
1. **GraphQL API** → **Base Types** (exact response match)
2. **Base Types** → **Enhanced Types** (via mappers with computed fields)  
3. **Enhanced Types** → **UI Components** (ready-to-use data)

## Usage

```typescript
// Import types
import { Investment, InvestmentAccount } from '@/common/data/investment/types';

// Import queries  
import { GET_INVESTMENTS, GET_INVESTMENT_ACCOUNTS } from '@/common/data/investment/queries';

// Import hooks
import { useInvestments, useInvestmentAccounts } from '@/common/data/investment/hooks';
```