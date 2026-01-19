# AI Insights Overview

## Purpose

- Collect a structured analytics snapshot for the active record and share it with the chat agent.
- Keep the payload generic: `metrics`, `summary`, `contacts`, `links`, and `raw` support any entity.
- Send analytics only once per session and reuse it for follow-up questions.

## Frontend Flow

1. `usePageAnalytics` prepares entity context and caches the first payload per session.
2. `buildAnalyticsHeader` fetches data (currently implemented for investments) and returns:
   - `metrics`: array of `{ id, label?, value, unit?, asOf?, meta? }`
   - `summary`: lightweight object with key facts (status, type, account, etc.)
   - `contacts`, `links`, `raw`: optional supporting details
3. `page-analytics.ts` (via `openAiInsightsChatOnce`) adds the payload to `current_page_context` on the first outbound chat message.
4. Components such as `InvestmentRecordAnalyticsChat` call the FlowBot API using the shared REST client and include the session-aware context.

## Key Files

- `src/ai-insights/types/analytics-context.ts`: Type definitions for header and snapshot modes.
- `src/ai-insights/collectors/buildAnalyticsHeader.ts`: Analytics builder for investments, including metric safeguards.
- `src/ai-insights/hooks/usePageAnalytics.ts`: React hook that orchestrates analytics retrieval and session caching.
- `src/ai-insights/send/page-analytics.ts`: Utility to cap payload size and ensure single-send behaviour.
- `src/ai-insights/components/InvestmentRecordAnalyticsChat.tsx`: Example chat UI wiring analytics into FlowBot requests.

## Data Sources

- GraphQL investment query supplies market value, invested capital, EBITDA, counterparties, etc.
- Helper logic normalises currency codes and removes empty/duplicate fields.
- `capAnalytics` trims optional sections (`raw`, `links`, `summary`, `metrics`) to stay under ~6 KB.

## Backend Expectations

1. Extend the session context with `page_analytics`.
2. Store the payload from `current_page_context` the first time it appears.
3. Detect intent (MOIC/EBITDA/“this page”) before injecting analytics into the prompt.
4. Optionally expose a tool that returns the cached analytics JSON.

## Testing Checklist

- Open an investment record and trigger `InvestmentRecordAnalyticsChat`.
- First chat request → `current_page_context.page_analytics` present in Network tab.
- Second request → no analytics field (still answered correctly using cached data).
- Ask KPI-specific question → backend responds with values from analytics JSON.
- Ask non-analytics question → backend handles it without injecting analytics.

## Next Steps

- Implement collectors for additional entity types (accounts, opportunities, leads).
- Finish backend integration using the pattern above.
- Monitor payload sizes and KPI coverage as new fields are introduced.
