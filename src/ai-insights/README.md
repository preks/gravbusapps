# AI Insights - Page Analytics Integration

Implementation for sending page analytics context to AI chat backend.

## Overview

This module collects KPI data from the current page and sends it to the chat backend once per session. The analytics are included in the LLM prompt only when the user's question is about page analytics (detected via intent classification on backend).

## Architecture

### Frontend (This Module)

1. **Types** (`types/analytics-context.ts`): Data contract for analytics context
2. **Collector** (`collectors/buildAnalyticsHeader.ts`): Builds analytics header from entity data
3. **Sender** (`send/page-analytics.ts`): Manages one-time-per-session sending
4. **Hook** (`hooks/usePageAnalytics.ts`): React hook for easy integration

### Backend (Separate Repository)

1. **MonolithContext**: Extended with `page_analytics` field
2. **Intent Detection**: Simple heuristic to detect page-analytics questions
3. **Prompt Injection**: Conditionally includes analytics section in monolith prompt

## Usage

### Basic Integration

```tsx
import { usePageAnalytics } from '@/ai-insights/hooks/usePageAnalytics'

function InvestmentRecordChat({ investmentId, investmentName, accessToken }) {
  const { getPageAnalyticsContext } = usePageAnalytics({
    entity: { type: 'investment', id: investmentId, name: investmentName },
    accessToken,
    currency: 'EUR'
  })

  const handleSendMessage = async (message: string, sessionId?: string) => {
    // Get page context with analytics (sent once per session)
    const pageContext = await getPageAnalyticsContext({
      url: window.location.href,
      route: '/irm/investments/record',
      view: 'investment-record',
      type: 'entity',
      entity_name: 'Investment',
      id: investmentId
    })

    // Send to chat API
    const form = new FormData()
    form.append('session_id', sessionId || '')
    form.append('user_input_text', message)
    form.append('current_page_context', JSON.stringify(pageContext))
    // ... rest of API call
  }
}
```

### Manual Collection

```tsx
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildAnalyticsHeader } from '@/ai-insights/collectors/buildAnalyticsHeader'

function useManualAnalytics(accessToken: string) {
  const graphqlClient = useGraphQLClient(accessToken)

  const collect = async () => {
    return buildAnalyticsHeader({
      entity: { type: 'investment', id: '123', name: 'My Investment' },
      graphqlClient,
      currency: 'EUR'
    })
  }

  return collect
}
```

## Data Structure

### CurrentPageContext

Backend expects CurrentPageContext with discriminated union by `type`:

```typescript
// Entity page
{
  type: 'entity',
  url: 'https://...',
  route: '/irm/investments/record',
  view: 'investment-record',
  entity_name: 'Investment',
  id: 'uuid',
  page_analytics?: { ... }
}

// Overview page
{
  type: 'overview',
  url: 'https://...',
  route: '/irm/investments/dashboard',
  entity_name: 'Investment',
  page_analytics?: { ... }
}

// Unknown page
{
  type: 'unknown',
  url: 'https://...',
  page_analytics?: { ... }
}
```

### AnalyticsContext (Header Mode)

```typescript
{
  mode: 'header',
  entity: {
    type: 'investment',
    id: 'uuid',
    name: 'Investment Name'
  },
  summary: {
    status: 'Active',
    type: 'Equity',
    phase: 'Growth',
    currency: 'EUR',
    account: {
      id: 'account-id',
      name: 'Beta Capital AG',
      website: 'https://beta-capital.example',
      primaryAddress: { country: 'Germany', locality: 'Berlin' }
    },
    owner: {
      id: 'employee-id',
      name: 'Maria Schneider',
      jobPosition: 'Investment Manager'
    },
    totals: {
      investmentMarketValue: 341_757_281,
      totalInvestmentAmount: 339_040_000
    }
  },
  metrics: [
    {
      id: 'investment.moic.current',
      label: 'MOIC (current)',
      value: 1.01,
      asOf: '2025-11-11'
    },
    {
      id: 'investment.stakePercentage',
      label: 'Stake Percentage',
      value: 12,
      unit: '%'
    },
    {
      id: 'investment.totalCommitmentAmount',
      label: 'Total Commitment',
      value: 326_000_000,
      unit: 'EUR'
    }
  ],
  contacts: [
    {
      id: 'contact-id',
      name: 'John Doe',
      relation: 'accountContact',
      role: 'CFO',
      email: 'john.doe@example.com',
      phone: '+49 30 1234567'
    }
  ],
  links: [
    {
      id: 'investment.account.website',
      title: 'Beta Capital AG website',
      url: 'https://beta-capital.example',
      type: 'website'
    }
  ],
  meta: {
    currency: 'EUR',
    as_of: '2025-11-11'
  },
  raw: {
    investment: {
      id: 'uuid',
      name: '1000 shares for 12 percent',
      status: 'Active',
      totals: {
        investmentMarketValue: 341_757_281,
        totalInvestmentAmount: 339_040_000
      }
    },
    account: {
      id: 'account-id',
      name: 'Beta Capital AG',
      industry: 'Financial Services'
    }
  }
}
```

## Supported Entities

- `investment` - Metrics derived from investment record (MOIC, EBITDA, stake, etc.)
- Other entity types return empty metrics until collectors are implemented

## Backend Integration

### Required Backend Changes

1. **Extend MonolithContext**:

```python
class MonolithContext(BaseModel):
    # ... existing fields
    page_analytics: Optional[dict] = None
```

2. **One-time Storage** (in controller):

```python
incoming_cpc = agent_input.current_page_context or {}
incoming_pa = incoming_cpc.get("page_analytics")
if incoming_pa and not ctx.page_analytics:
    ctx.page_analytics = incoming_pa
```

3. **Intent Detection**:

```python
def is_page_analytics_question(text: str) -> bool:
    patterns = ['moic', 'irr', 'ebitda', 'shareholder', 'this page']
    return any(p in text.lower() for p in patterns)
```

4. **Conditional Prompt Injection**:

```python
if ctx.page_analytics and is_page_analytics_question(user_question):
    page_analytics_section = f"\n## Page Analytics\n{json.dumps(ctx.page_analytics)}\n"
```

## Session Management

Analytics are sent **once per session**:

- First chat message includes `page_analytics` in `current_page_context`
- Subsequent messages don't include analytics (backend stores in session)
- When `session_id` changes, analytics are collected again

## Supported Modes

### Header Mode

- KPI data collection
- One-time collection per session
- Static storage in backend session
- Lightweight JSON format

### Snapshot Mode

- Full page snapshot with DOM parsing
- Component-level data extraction
- HTML/text content capture
