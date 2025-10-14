# 🏦 Bank Manager Workplace - "Digitaler Arbeitsplatz"

**Digital workplace dashboard specifically designed for Sparkasse bank branch managers.**

## 🎯 Overview

This application provides a comprehensive, AI-powered dashboard for bank managers featuring:

- **🤖 AI-Powered Search/Command Bar** - Natural language search with context-aware navigation
- **👥 Team Management** - Real-time team overview with absence tracking
- **⚡ Approvals & Workflows** - Banking-specific approval processes (loans, credits, investments)
- **💰 Banking KPIs** - Branch performance metrics and financial indicators
- **🏢 Customer Relations** - VIP customer management and relationship insights
- **📊 AI Assistant** - Context-aware suggestions and intelligent recommendations
- **📰 Activity Feed** - Real-time updates on team activities and approvals
- **⚡ Quick Actions** - One-click access to common banking manager tasks

## 📁 Project Structure

```
bank-manager-workplace/
├── BankManagerWorkplace.tsx      # Main dashboard component
├── index.ts                       # Module exports
├── components/
│   └── AISearchBar.tsx           # ⭐ AI command palette (IMPLEMENTED)
├── hooks/                        # Data fetching hooks (TODO)
├── types/
│   └── banking.types.ts          # TypeScript interfaces (IMPLEMENTED)
└── utils/
    └── formatters.ts             # Formatting utilities (IMPLEMENTED)
```

## ✅ What's Implemented

### 1. **AI Search Bar (AISearchBar.tsx)** ⭐ **DEMO-READY**
- Natural language command palette (German & English)
- Keyboard shortcut: `⌘K` or `Ctrl+K`
- Context-aware search results
- AI suggestions with confidence scores
- Pre-fills chat for complex queries
- Categorized results (Actions, Navigation, AI Suggestions)

**Example queries:**
- "Zeige ausstehende Kreditanträge"
- "Team Urlaubsübersicht"
- "Genehmige Spesenantrag"
- "VIP Kunden"

### 2. **Main Dashboard (BankManagerWorkplace.tsx)** ⭐ **DEMO-READY**
- Responsive grid layout
- Tabbed interface (Overview, Team, Approvals, Analytics)
- Key metrics cards (Team Status, Approvals, Deposits, Satisfaction)
- Approval workflow cards with AI recommendations
- VIP customer sidebar
- AI Insights panel
- German language interface

### 3. **Types & Utilities** ⭐ **COMPLETE**
- Comprehensive TypeScript interfaces
- Currency formatters (EUR)
- Date/time utilities (German locale)
- Priority & status helpers

## 🚧 TODO - Next Steps

### High Priority (For Sparkasse Demo)

#### 1. **Real Data Integration**
```typescript
// hooks/useDirectReports.ts (ALREADY EXISTS IN HR MODULE)
// Import and adapt from: src/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports.ts

// hooks/usePendingApprovals.ts (NEW - NEEDED)
// Integrate with custom-flow-engine API
// Endpoint: GET /api/tasks/assigned?userId=<managerId>
```

#### 2. **Custom Flow Engine Integration**
Create banking workflow templates in `/custom-flow-engine/flows/templates/`:
- `banking/loan-approval.json`
- `banking/credit-limit-change.json`
- `banking/investment-advisory.json`

#### 3. **VIP Customers Widget**
```typescript
// hooks/useVIPCustomers.ts (NEW - NEEDED)
// Use existing CRM GraphQL queries
// Query: Account with type="VIP" and manager assignment
```

### Medium Priority

#### 4. **Team Widget with Real Data**
```typescript
// components/TeamWidget.tsx (NEW)
// Use existing hooks from manager-dashboard:
import { useDirectReports } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports'
import { useTeamAbsences } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamAbsences'
```

#### 5. **Activity Feed**
```typescript
// components/ActivityFeed.tsx (NEW)
// Real-time updates using:
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
```

#### 6. **Financial KPIs Widget**
```typescript
// components/KPIWidget.tsx (NEW)
// hooks/useBankingKPIs.ts (NEW - MOCK DATA)
// Clearly indicate these are mock values for demo
// Prepare integration points for Sparkasse core banking system
```

### Lower Priority

#### 7. **AI Assistant Panel**
```typescript
// components/AIAssistantPanel.tsx (NEW)
// Morning briefing generation
// Pattern recognition from user behavior
// Anomaly detection in approvals
```

#### 8. **Quick Actions Panel**
```typescript
// components/QuickActions.tsx (NEW)
// Common task shortcuts
// Badge counts for pending items
```

#### 9. **German Translations**
Add i18n support with German translations for all UI text.

#### 10. **Sparkasse Branding**
- Color scheme customization
- Logo integration
- Custom styling

## 🔌 Integration Points

### Custom Flow Engine
```typescript
// API Endpoints to use:
GET  /api/tasks/assigned?userId={managerId}           // Get assigned approvals
GET  /api/tasks/claimable?userId={managerId}          // Get claimable tasks
POST /api/tasks/{taskId}/complete                     // Complete approval
POST /api/templates/{id}/execute                      // Start new workflow
```

### GraphQL (Existing)
```typescript
// Queries to use:
- Employee (team members)
- EmployeeAbsence (absences)
- Account (CRM customers)
- Opportunity (sales opportunities)
- ExpenseRequest (expense approvals)
```

### Manager Dashboard (Existing Components)
```typescript
// Import and adapt from:
import { useDirectReports } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports'
import { useTeamBirthdays } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamBirthdays'
import { useMatrixTeams } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useMatrixTeams'
```

## 🎨 Design System

All components use `@newwork/nw-design-system`:
- `Card`, `CardHeader`, `CardContent` - Widget containers
- `Button`, `Badge` - Interactive elements
- `Command`, `CommandDialog` - AI search
- `Tabs` - Navigation
- `Skeleton` - Loading states

Styling follows Tailwind v4 with `gba:` prefix:
```tsx
<div className="gba:flex gba:gap-4 gba:p-6">
```

## 🚀 How to Run

1. **Register the app** in the platform launcher
2. **Add route** to the application router
3. **Test** in development:
```bash
cd /Users/denisprekrat/Documents/APPS/NEWWORK Apps/BusinessApps/gravity-business-apps
npm run dev
```

## 📝 Demo Script for Sparkasse

### Opening (30 seconds)
1. Open dashboard - show clean, modern interface
2. Highlight German language
3. Point out AI search bar at top

### AI Search Demo (2 minutes) ⭐ **WOW FACTOR**
1. Press `⌘K` to open command palette
2. Type: "Kreditanträge" - show instant results
3. Type: "Team Urlaub" - show different category
4. Show AI suggestions with confidence scores
5. Demonstrate chat integration (prefilled messages)

### Dashboard Tour (2 minutes)
1. Point out key metrics (team status, approvals, deposits)
2. Show approval cards with AI recommendations
3. Highlight VIP customer panel
4. Demonstrate responsive design (resize window)

### Workflow Demo (1 minute)
1. Click on a loan approval
2. Show AI risk assessment
3. One-click approval workflow
4. Explain custom-flow-engine integration

### Extensibility (1 minute)
1. Show mock data indicators
2. Explain integration architecture
3. Highlight real data that's already working (team, CRM)
4. Discuss Sparkasse-specific customizations

## 🎯 Success Metrics

- ✅ **Visual Impact**: Modern, professional design
- ✅ **AI Demonstration**: Working search with NLP understanding
- ✅ **Banking Relevance**: Specific use cases (loans, customers, compliance)
- 🚧 **Real Data Integration**: Partial (CRM ready, flows need setup)
- 🚧 **Scalability**: Architecture in place, needs full implementation

## 📚 References

- Manager Dashboard: `src/business-apps/hr/core/apps/manager-dashboard/`
- CRM Module: `src/business-apps/crm/`
- Custom Flow Engine: `/custom-flow-engine/`
- Design System: `@newwork/nw-design-system`

## 🤝 Contributing

When extending this application:

1. **Follow the patterns** established in ManagerDashboard
2. **Use existing hooks** from HR and CRM modules where possible
3. **Integrate custom-flow-engine** for all approval workflows
4. **Label mock data clearly** for demo purposes
5. **Document integration points** for Sparkasse systems
6. **Test with German locale** and real user scenarios

## 📞 Support

For questions about:
- Custom Flow Engine: See `/custom-flow-engine/README.md`
- Design System: See `@newwork/nw-design-system` documentation
- GraphQL Schema: Use newwork-graphql-mcp MCP server

