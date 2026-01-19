Customers Debug

Debug app to validate the customer data foundation (tasks, activities, team performance).

Features

- Run list queries with optional search for tasks and activities
- Run entity-scoped queries (by Account/Contact/Lead/Opportunity)
- Run team performance queries (metrics, comparison, leaderboard, trends)
- Inspect results, variables, and query identifiers

Usage
Import and render CustomersDebug in a debug route or screen context. Provide BusinessAppContextProps (notably accessToken).

Example:
import CustomersDebug from '@/business-apps/platform/debug/apps/customers-debug';
<CustomersDebug accessToken={token} userInfo={user} />

Notes

- Mirrors investments-debug but uses customer hooks from src/common/data/customer
- Actions are synchronous per button; use group actions to run batches
- Add IDs for entity-specific tests or the default placeholder is used
