# Hook Refactoring Guide - Entity Data Access Pattern

## Übersicht

Dieses Dokument beschreibt die standardisierten Patterns für Data Access Hooks in der Gravity Business Apps Codebase.

**Ziel:** Konsistente, wartbare und intuitive Hooks für Entity-Datenabfragen basierend auf React Query Best Practices.

## 🎯 TL;DR - Executive Summary

**Hauptproblem:** ~20+ Stellen im Code verwenden umständliches useEffect-Pattern mit manuellem State-Management.

**Lösung:** Erstelle saubere declarative Hooks (`useInvestmentAccount`, `useCustomerAccount`) die State automatisch verwalten.

**Imperative Hooks?** ❌ NICHT BENÖTIGT! Nach vollständiger Codebase-Analyse: 0 Use Cases gefunden.

**Priorität:**

1. ✅ `useInvestmentAccount(context, id)` - Single Entity (PRIORITY)
2. ✅ `useCustomerAccount(context, id)` - Single Entity (PRIORITY)
3. ⏸️ Imperative Hooks - Nur bei echtem Bedarf

---

## Problem Statement

**Aktueller Zustand:**

- Ein Hook-File für alles: `useInvestmentAccounts` enthält sowohl Listen-Queries als auch Single-Entity-Queries
- Dual-Mode Pattern (Function Only vs Stateful) ist nicht standardisiert in der React-Community
- **Hauptproblem:** ~20+ Stellen im Code holen nur die Fetch-Funktion und reimplementieren State-Management manuell in useEffect
- Inkonsistente APIs zwischen verschiedenen Entity-Hooks

**Ziel-Zustand:**

- Klare Trennung: `useEntity` für einzelne Entities (declarative), `useEntities` für Listen (declarative)
- Automatisches State-Management in Hooks statt manuellem useEffect-Pattern
- Standardisierte Patterns nach React Query Konventionen
- ⚠️ Imperative Hooks nur bei echtem Bedarf (aktuell nicht vorhanden in der Codebase!)

---

## Codebase Analysis Results

### Was haben wir gefunden?

**✅ Declarative Patterns (benötigt - ~20+ Stellen):**

- Account/Contact/Opportunity Detail Views laden Daten in useEffect
- Form Contexts holen nur Fetch-Funktion und verwalten State manuell
- Manuelles Loading/Error State Management überall

**❌ Imperative Patterns (NICHT gefunden - 0 Stellen):**

- Keine Button-Click Fetches
- Keine Batch-Processing von Entities
- Keine Conditional On-Demand Fetches
- Downloads/Deletes sind Mutations oder lokale Operations, keine Queries

**💡 Konsequenz:** Wir brauchen NUR declarative Hooks für das Refactoring!

---

## Standard Hook Patterns

### Pattern 1: Declarative Single Entity Hook (PRIMARY - FÜR 20+ STELLEN BENÖTIGT)

**Verwendung:** Wenn eine Komponente Daten für eine spezifische Entity-ID beim Rendern braucht.

```typescript
// src/common/data/investment/hooks/useInvestmentAccount.ts

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { toInvestmentAccount, type InvestmentAccount } from '../types/investmentAccountTypes'
import { buildInvestmentAccountByIdQuery } from '../queries/investmentAccountQueries'

export interface UseInvestmentAccountResult {
  account: InvestmentAccount | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment account by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @example
 * const AccountDetails = ({ accountId }) => {
 *   const { account, loading, error } = useInvestmentAccount(context, accountId)
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Alert>{error}</Alert>
 *
 *   return <div>{account.name}</div>
 * }
 */
export function useInvestmentAccount(context: BusinessAppContextProps, id: string): UseInvestmentAccountResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [state, setState] = useState<UseInvestmentAccountResult>({
    account: null,
    loading: true,
    error: null,
    refetch: async () => {}
  })

  const fetchAccount = useCallback(async () => {
    if (!id || !context.accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const query = buildInvestmentAccountByIdQuery(undefined, id)
      const result = await graphqlClient.request<{ InvestmentAccountByPk: any }>(query)

      const account = result.InvestmentAccountByPk ? toInvestmentAccount(result.InvestmentAccountByPk) : null

      setState(prev => ({ ...prev, account, loading: false, error: null }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment account'

      setState(prev => ({
        ...prev,
        account: null,
        loading: false,
        error: errorMessage
      }))
    }
  }, [id, context.accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  // Provide refetch function
  useEffect(() => {
    setState(prev => ({ ...prev, refetch: fetchAccount }))
  }, [fetchAccount])

  return state
}
```

**Wann verwenden:**

- ✅ Daten werden beim Rendern der Komponente benötigt
- ✅ Daten sollen automatisch neu laden wenn die ID sich ändert
- ✅ Loading states und Error handling werden benötigt
- ✅ Standard-Use-Case für 90% aller Fälle

---

### Pattern 2: Declarative List Hook (Primary)

**Verwendung:** Wenn eine Komponente eine Liste von Entities mit Pagination/Search benötigt.

**Wichtig:**

- `refetch` akzeptiert optionale Variablen (Apollo Client Pattern - Best Practice)
- `variables` müssen mit `useMemo` und `JSON.stringify` memoized werden, um rekursive Aufrufe zu vermeiden
- Hooks geben rohe Entity-Arrays zurück - Transformation zu SelectOption[] sollte in Komponenten mit `useMemo` erfolgen

```typescript
// src/common/data/investment/hooks/useInvestmentAccounts.ts

import { useCallback, useState, useEffect, useMemo } from 'react'

export interface UseInvestmentAccountsResult {
  accounts: InvestmentAccount[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: InvestmentAccountQueryVariables) => Promise<void>
}

/**
 * Declarative hook for fetching a list of investment accounts.
 * Supports filtering, pagination, and search.
 *
 * @example
 * const AccountList = () => {
 *   const { accounts, loading, refetch } = useInvestmentAccounts(context, {
 *     limit: 20,
 *     search: 'Tech'
 *   })
 *
 *   // Search with new variables
 *   const handleSearch = (searchTerm: string) => {
 *     refetch({ search: searchTerm, offset: 0 })
 *   }
 *
 *   return <Table dataSource={accounts} loading={loading} />
 * }
 */
export function useInvestmentAccounts(
  context: BusinessAppContextProps,
  variables?: InvestmentAccountQueryVariables
): UseInvestmentAccountsResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // ⚠️ CRITICAL: Memoize variables to prevent infinite loops when object is recreated on each render
  // This is necessary because inline objects like { limit: 20 } create new references on every render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    accounts: [] as InvestmentAccount[],
    total: 0,
    loading: true,
    error: null as string | null
  })

  const fetchAccounts = useCallback(
    async (queryVariables?: InvestmentAccountQueryVariables) => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        // Merge stable default variables with query-specific variables
        const vars = { ...stableVariables, ...queryVariables }
        const query = buildInvestmentAccountQuery()
        const whereCondition = buildInvestmentAccountWhereCondition(vars)
        const orderBy = buildInvestmentAccountOrderBy(vars.orderBy || [])

        const graphQLVariables = {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where: whereCondition,
          orderBy: orderBy
        }

        const result = await graphqlClient.request<InvestmentAccountQueryResponse>(query, graphQLVariables)

        const accounts = result.InvestmentAccount.map(toInvestmentAccount)
        const total = result.InvestmentAccountAggregate?.aggregate?.count || 0

        setState({ accounts, total, loading: false, error: null })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment accounts'

        setState(prev => ({
          ...prev,
          accounts: [],
          total: 0,
          loading: false,
          error: errorMessage
        }))
      }
    },
    [context.accessToken, graphqlClient, stableVariables] // Use stableVariables, not variables!
  )

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    ...state,
    refetch: fetchAccounts
  }
}
```

**Wann verwenden:**

- ✅ Listen-Darstellung mit Tabellen oder Cards
- ✅ Pagination und Search Funktionalität
- ✅ Automatisches Neuladen bei Filter-Änderungen

---

### Pattern 3: Imperative Fetch Hook (OPTIONAL - AKTUELL NICHT BENÖTIGT)

⚠️ **WICHTIG:** Nach Analyse der gesamten Codebase wurde **KEIN einziger Use Case** für imperative Hooks gefunden!

**Status:** Nicht implementieren, es sei denn ein echter Use Case entsteht.

**Potentielle zukünftige Use Cases:**

- Button-Click Exports (aktuell nicht vorhanden)
- Batch-Processing von mehreren Entities (aktuell nicht vorhanden)
- Conditional On-Demand Fetches außerhalb von useEffect (aktuell nicht vorhanden)

**Wenn benötigt:**

```typescript
// src/common/data/investment/hooks/useFetchInvestmentAccount.ts
// ⚠️ NUR ERSTELLEN WENN ECHTER USE CASE EXISTIERT!

export function useFetchInvestmentAccount(
  context: BusinessAppContextProps
): (id: string) => Promise<InvestmentAccount | null> {
  const graphqlClient = useGraphQLClient(context.accessToken)

  return useCallback(
    async (id: string): Promise<InvestmentAccount | null> => {
      if (!context.accessToken) {
        throw new Error('No access token available')
      }

      try {
        const query = buildInvestmentAccountByIdQuery(undefined, id)
        const result = await graphqlClient.request<{ InvestmentAccountByPk: any }>(query)

        return result.InvestmentAccountByPk ? toInvestmentAccount(result.InvestmentAccountByPk) : null
      } catch (error) {
        console.error('Error fetching investment account:', error)
        throw error
      }
    },
    [context.accessToken, graphqlClient]
  )
}
```

**Aktuell in der Codebase:**

- ❌ Downloads sind lokale File-Operations, keine API Fetches
- ❌ Deletes sind Mutations (POST/DELETE), keine Queries (GET)
- ❌ AI Summaries sind bereits in Hooks gekapselt
- ❌ Keine Button-Click Fetches gefunden

---

## Naming Conventions

### Hook Files

```
useEntity.ts       // Single entity (declarative) - REQUIRED
useEntities.ts     // Multiple entities (declarative) - REQUIRED
useFetchEntity.ts  // Imperative fetch (optional) - NOT NEEDED YET
```

### Hook Names

```typescript
useInvestmentAccount(context, id) // Single - Declarative (REQUIRED)
useInvestmentAccounts(context, variables) // List - Declarative (REQUIRED)
// useFetchInvestmentAccount(context)       // Single - Imperative (NOT NEEDED)

useCustomerAccount(context, id) // Single - Declarative (REQUIRED)
useCustomerAccounts(context, variables) // List - Declarative (REQUIRED)
// useFetchCustomerAccount(context)         // Single - Imperative (NOT NEEDED)
```

### Return Values

```typescript
// Single Entity Hook (ALWAYS USED)
{
  account: Account | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>  // No parameters - refetches with same ID
}

// List Hook (ALWAYS USED)
{
  accounts: Account[]           // Raw entity array - transform in components with useMemo if needed
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: QueryVariables) => Promise<void>  // Apollo Client Pattern - accepts optional variables
}

// Imperative Hook (OPTIONAL - NOT IN USE)
// (id: string) => Promise<Account | null>
```

**Wichtig zu `refetch` in List Hooks:**

- **Best Practice:** `refetch(variables?)` folgt dem Apollo Client Pattern
- **Verwendung:** `refetch()` ohne Parameter = refetch mit ursprünglichen Variablen, `refetch({ search: 'new' })` = refetch mit neuen Variablen
- **Naming:** `refetch` ist der Standard-Name (nicht `search`, `reload`, etc.)
- **Keine Convenience Wrapper:** Hooks sollten direkt verwendet werden, keine Wrapper-Funktionen erstellen

---

## Migration Plan

### Phase 1: Create New Hooks (No Breaking Changes)

1. **Investment Accounts**
   - ✅ Create `useInvestmentAccount.ts` (declarative single) - **PRIORITY**
   - ✅ Refactor existing `useInvestmentAccounts.ts` (declarative list)
   - ❌ ~~Extract `useFetchInvestmentAccount.ts` (imperative)~~ - **NOT NEEDED**

2. **Customer Accounts**
   - ✅ Create `useCustomerAccount.ts` (declarative single) - **PRIORITY**
   - ✅ Refactor existing `useCustomerAccounts.ts` (declarative list)
   - ❌ ~~Extract `useFetchCustomerAccount.ts` (imperative)~~ - **NOT NEEDED**

### Phase 2: Update Hook Implementations

**From (Old Pattern):**

```typescript
// useInvestmentAccounts.ts - OLD
export function useGetInvestmentAccounts(
  context: BusinessAppContextProps,
  options?: UseGetInvestmentAccountsOptions
): FunctionOnlyReturn | StatefulReturn {
  // Dual mode implementation
}

export const useGetInvestmentAccountById = context => {
  // Mixed into same file
}
```

**To (New Pattern):**

```typescript
// useInvestmentAccounts.ts - NEW
export function useInvestmentAccounts(
  context: BusinessAppContextProps,
  variables?: InvestmentAccountQueryVariables
): UseInvestmentAccountsResult {
  // Always declarative list
}

// useInvestmentAccount.ts - NEW (separate file)
export function useInvestmentAccount(context: BusinessAppContextProps, id: string): UseInvestmentAccountResult {
  // Always declarative single
}
```

### Phase 3: Migrate Consumers

**Consumer Update Pattern:**

```typescript
// ❌ OLD: Umständliches "Function Only" Pattern (HÄUFIGSTES PROBLEM!)
const { fetchInvestmentAccountById } = useGetInvestmentAccountById(props)
const [accountData, setAccountData] = useState<InvestmentAccount | undefined>(undefined)
const [dataLoading, setDataLoading] = useState(true)
const [dataError, setDataError] = useState<string | null>(null)

useEffect(() => {
  const loadAccountData = async () => {
    if (!accountId) return
    try {
      setDataLoading(true)
      setDataError(null)
      const result = await fetchInvestmentAccountById(accountId)
      if (result?.account) {
        setAccountData(result.account)
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setDataLoading(false)
    }
  }
  loadAccountData()
}, [accountId, fetchInvestmentAccountById])

// ✅ NEW: Clean declarative pattern
const { account, loading, error } = useInvestmentAccount(props, accountId)

// Ersparnis: ~20 Zeilen Code, kein manuelles State-Management!

// ---

// OLD: Stateful Mode (List) - funktioniert schon gut!
const { options, loading } = useGetInvestmentAccounts(context, { withState: true })

// NEW: Sauberere API
const { accounts, loading } = useInvestmentAccounts(context, { limit: 20 })
```

**Betroffene Dateien (~20+ Stellen):**

- `src/business-apps/irm/core/records/account-record/AccountRecord.tsx`
- `src/business-apps/irm/core/forms/account-form/context/AccountFormContext.tsx`
- `src/business-apps/irm/core/forms/opportunity-form/context/OpportunityFormContext.tsx`
- `src/business-apps/irm/core/forms/contact-form/context/ContactFormContext.tsx`
- `src/business-apps/crm/core/records/account-record/AccountRecord.tsx`
- `src/business-apps/crm/core/forms/account-form/context/AccountFormContext.tsx`
- Alle anderen Form Contexts

### Phase 4: Deprecate Old Patterns

1. Add deprecation warnings to old hooks
2. Update documentation
3. After all consumers migrated, remove old implementations

---

## Pattern Analysis: Was brauchen wir wirklich?

### ✅ Declarative Hooks (REQUIRED - 100% unserer Use Cases!)

**Characteristics:**

- Automatic data fetching
- State management included
- Re-fetches on dependency changes
- Built-in loading/error states

**Real Usage in Codebase:**

- ✅ Detail Views (AccountRecord, OpportunityRecord, etc.) - ~15 Stellen
- ✅ Form Contexts (AccountFormContext, etc.) - ~10 Stellen
- ✅ List/Table Components - ~20 Stellen
- ✅ Alle Combobox/Select Fields - ~30 Stellen

**Example:**

```typescript
// ✅ Was wir überall brauchen
const AccountDetails = ({ accountId }) => {
  const { account, loading, error } = useInvestmentAccount(context, accountId)

  if (loading) return <Spinner />
  if (error) return <Alert>{error}</Alert>

  return <div>{account.name}</div>
}
```

**Current Problem (20+ Stellen):**

```typescript
// ❌ Aktuell überall so implementiert - UMSTÄNDLICH!
const { fetchInvestmentAccountById } = useGetInvestmentAccountById(context)
const [account, setAccount] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  const load = async () => {
    setLoading(true)
    const result = await fetchInvestmentAccountById(id)
    setAccount(result.account)
    setLoading(false)
  }
  load()
}, [id])
```

---

### ❌ Imperative Hooks (NOT NEEDED - 0% unserer Use Cases!)

**Status:** **NICHT in der Codebase gefunden!**

**Was wir NICHT haben:**

- ❌ Button-Click Fetches (Downloads sind lokale Operations)
- ❌ Batch Processing (keine solchen Use Cases)
- ❌ Conditional On-Demand Fetches (alles in useEffect)
- ❌ Export Functions mit Data Fetch

**Warum nicht benötigt:**

- Downloads/Views arbeiten mit bereits geladenen Daten
- Deletes sind Mutations (POST/DELETE), keine Queries (GET)
- AI Summaries sind bereits in declarative Hooks gekapselt
- Alle Form Submissions verwenden bereits geladene Daten

**Falls zukünftig benötigt:**

```typescript
// Nur erstellen wenn echter Use Case entsteht!
const ExportButton = () => {
  const fetchAccount = useFetchInvestmentAccount(context)

  const handleExport = async () => {
    const account = await fetchAccount('123')
    downloadPDF(account)
  }

  return <Button onClick={handleExport}>Export</Button>
}
```

---

## Quick Decision Tree

```
Need to fetch entity data?
│
├─ For rendering the component?
│  └─ YES → Use declarative hook (useEntity/useEntities)
│
├─ For button click / event handler?
│  └─ Check: Ist data schon geladen?
│     ├─ JA → Kein Hook nötig, arbeite mit vorhandenen Daten
│     └─ NEIN → ⚠️ Seltener Fall - erwäge declarative + refetch()
│
└─ Für Mutation (DELETE/UPDATE/CREATE)?
   └─ Das ist keine Query! Verwende REST/GraphQL Client direkt
```

**Praktische Entscheidungshilfe:**

| Use Case            | Lösung                             | Anzahl in Codebase |
| ------------------- | ---------------------------------- | ------------------ |
| Account Detail View | `useInvestmentAccount(ctx, id)`    | ~15                |
| Form Loading by ID  | `useInvestmentAccount(ctx, id)`    | ~10                |
| Account List/Table  | `useInvestmentAccounts(ctx, vars)` | ~20                |
| Combobox Options    | `useInvestmentAccounts(ctx, vars)` | ~30                |
| Download Document   | Kein Hook - Daten schon da         | ~10                |
| Delete Entity       | Mutation - kein Query Hook         | ~5                 |
| AI Summary          | Schon in Hook gekapselt            | ~5                 |
| Button-Click Export | **NICHT VORHANDEN**                | 0                  |

---

## Testing Patterns

### Testing Declarative Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react'

test('useInvestmentAccount fetches data automatically', async () => {
  const { result } = renderHook(() => useInvestmentAccount(mockContext, '123'))

  expect(result.current.loading).toBe(true)

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
    expect(result.current.account).toBeTruthy()
  })
})
```

### Testing Imperative Hooks

```typescript
test('useFetchInvestmentAccount fetches on demand', async () => {
  const { result } = renderHook(() => useFetchInvestmentAccount(mockContext))

  const fetchAccount = result.current
  const account = await fetchAccount('123')

  expect(account).toBeTruthy()
  expect(account.id).toBe('123')
})
```

---

## Related Entities Pattern

For hooks that fetch related entities (tasks, activities, notes, documents), keep them in the same file but follow the pattern:

```typescript
// src/common/data/investment/hooks/useInvestmentAccountRelated.ts

export const useInvestmentAccountTasks = (context, accountId) => {
  // Declarative hook for account tasks
}

export const useInvestmentAccountActivities = (context, accountId) => {
  // Declarative hook for account activities
}

export const useInvestmentAccountNotes = (context, accountId) => {
  // Declarative hook for account notes
}
```

---

## Implementation Best Practices

### List Hook: Variables Memoization

**Problem:** Wenn `variables` als inline-Objekt übergeben wird (z.B. `{ limit: 20 }`), wird es bei jedem Render neu erstellt, was zu rekursiven Aufrufen führt.

**Lösung:** Verwende `useMemo` mit `JSON.stringify` für stabile Referenzen:

```typescript
// ✅ CORRECT
const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

const fetchAccounts = useCallback(
  async (queryVariables?: InvestmentAccountQueryVariables) => {
    const vars = { ...stableVariables, ...queryVariables }
    // ...
  },
  [context.accessToken, graphqlClient, stableVariables] // Use stableVariables!
)
```

**Warum `JSON.stringify`?**

- Flexibel: Funktioniert mit allen Objekt-Strukturen ohne manuelle Property-Auflistung
- Zukunftssicher: Neue Properties werden automatisch erfasst
- Best Practice: Empfohlen in React-Community für Objekt-Dependencies

### List Hook: Data Transformation

**Prinzip:** Hooks geben rohe Entity-Arrays zurück. Transformation zu SelectOption[] oder anderen Formaten sollte in Komponenten erfolgen.

```typescript
// ✅ CORRECT: Transform in component with useMemo
const ContactInformationSegment = ({ useAccounts }) => {
  const accountOptions = useMemo(() => {
    if (!useAccounts?.accounts) return []
    return useAccounts.accounts.map(account => ({
      id: account.id,
      value: account.id,
      label: account.name || account.displayName
    }))
  }, [useAccounts?.accounts])

  return <AccountSelect accounts={accountOptions} />
}

// ❌ INCORRECT: Don't create convenience wrappers
const useAccountSelectOptions = (context) => {
  const { accounts } = useInvestmentAccountsList(context)
  return accounts.map(/* ... */) // Don't do this!
}
```

### Hook Usage: Direct, No Wrappers

**Prinzip:** Verwende Hooks direkt, keine Convenience-Wrapper erstellen.

```typescript
// ✅ CORRECT: Direct usage
const { accounts, loading, error, refetch } = useInvestmentAccountsList(context, { limit: 20 })

// ❌ INCORRECT: Don't create wrappers
const useAccountSelect = context => {
  const hookResult = useInvestmentAccountsList(context)
  return {
    options: hookResult.accounts.map(/* ... */)
    // ...
  }
}
```

## References

- React Hooks Best Practices: https://react.dev/reference/react
- React Query Patterns: https://tanstack.com/query/latest
- Apollo Client refetch Pattern: https://www.apollographql.com/docs/react/data/queries/#refetching
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/

---

## Questions & Decisions Log

**Q: Why separate declarative and imperative hooks?**
A: Clarity of intent. After Codebase-Analyse: Wir brauchen nur declarative Hooks!

**Q: Why not keep the dual-mode pattern?**
A: Not a recognized pattern in React community. Separate hooks are clearer and more testable.

**Q: When to use imperative hooks?**
A: ⚠️ **AKTUELL NIRGENDWO!** Nach vollständiger Codebase-Analyse: 0 Use Cases gefunden.

**Q: Should we always provide imperative variants?**
A: **NEIN!** Nur erstellen wenn echter Use Case entsteht. Aktuell nicht benötigt.

**Q: What are the real problems in our codebase?**
A: ~20+ Stellen verwenden umständliches useEffect-Pattern statt sauberer declarative Hooks.

**Q: Was ist mit Downloads/Deletes/Exports?**
A:

- Downloads = Lokale File Operations, kein API Fetch
- Deletes = Mutations (POST/DELETE), keine Queries (GET)
- Exports = Aktuell nicht vorhanden in der Codebase

**Q: Was ist das Hauptziel des Refactorings?**
A: Ersetze ~20+ umständliche useEffect-Patterns durch saubere declarative Hooks!

**Q: Warum `useMemo` mit `JSON.stringify` für variables in List Hooks?**
A: Inline-Objekte wie `{ limit: 20 }` werden bei jedem Render neu erstellt. Ohne Memoization führt das zu rekursiven Aufrufen, da `useCallback` bei jedem Render neu erstellt wird. `JSON.stringify` ist flexibel und zukunftssicher - funktioniert mit allen Objekt-Strukturen ohne manuelle Property-Auflistung.

**Q: Warum gibt `refetch` in List Hooks optionale Variablen zurück?**
A: Das folgt dem Apollo Client Pattern (Best Practice). `refetch()` ohne Parameter = refetch mit ursprünglichen Variablen, `refetch({ search: 'new' })` = refetch mit neuen Variablen. Dies ist flexibler als separate `search()` Funktionen.

**Q: Sollten wir Convenience Wrapper für Hooks erstellen?**
A: **NEIN!** Hooks sollten direkt verwendet werden. Transformationen (z.B. zu SelectOption[]) sollten in Komponenten mit `useMemo` erfolgen, nicht in Wrapper-Hooks.

**Q: Warum geben List Hooks rohe Entity-Arrays zurück statt SelectOption[]?**
A: Separation of Concerns. Hooks sind für Datenabfrage zuständig, Komponenten für UI-Transformation. Dies macht Hooks wiederverwendbarer und testbarer.
