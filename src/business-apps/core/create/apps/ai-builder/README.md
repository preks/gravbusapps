# NEWWORK AI Builder

An AI-powered screen builder that creates NEWWORK platform screens using natural language. Built specifically for the `gravbusapps` repository with deep integration into gravity-business-apps patterns.

## 🎯 Purpose

The AI Builder is your USP - it allows users to:

- **Describe** what screen they want in natural language
- **Generate** complete, production-ready screens following all gravity-business-apps patterns
- **Preview** the generated screen before publishing
- **Publish** directly to the NEWWORK platform with one click

## ✨ Features

### 1. Natural Language Interface

- Chat-based interface for describing screens
- AI understands context: CRM, HR, Finance modules
- Suggests common patterns and components

### 2. Pattern-Aware Generation

- ✅ Uses only `@newwork/nw-design-system` components
- ✅ Follows gravity-business-apps folder structure
- ✅ Implements `BusinessAppContextProps` correctly
- ✅ Adds proper TypeScript types
- ✅ Includes `data-testid` attributes for testing
- ✅ Uses `gba:` prefix for Tailwind classes
- ✅ Integrates with `newwork-graphql-mcp` for data

### 3. File Management

- View all generated files in a tree structure
- See diffs (create/modify/delete)
- Edit files before publishing
- Download as a package

### 4. Preview Mode

- Preview generated screens in isolated environment
- Test functionality before publishing
- See real-time updates

### 5. One-Click Publishing

- Publishes to Azure blob storage
- Registers in NEWWORK platform
- Creates resource URLs automatically
- No manual build/deploy steps needed

### 6. Cost Tracking

- Real-time token usage monitoring
- Cost breakdown per conversation
- Budget awareness

## 🏗️ Architecture

```
ai-builder/
├── AIBuilder.tsx              # Main app component
├── components/
│   ├── ChatInterface.tsx      # Natural language chat UI
│   ├── FileTreeViewer.tsx     # Generated files browser
│   ├── PreviewPanel.tsx       # Screen preview iframe
│   ├── PublishDialog.tsx      # Publish configuration
│   ├── UsageStats.tsx         # Token/cost tracking
│   └── RepositoryInfo.tsx     # Repo status display
├── api/
│   ├── forgeClient.ts         # FORGE API integration
│   └── publishClient.ts       # Publish functionality
├── server/
│   └── publishService.ts      # Node.js publish service
├── types/
│   └── index.ts               # TypeScript definitions
└── README.md                  # This file
```

## 🚀 Setup

### Prerequisites

1. **FORGE Backend** (from `/Users/denisprekrat/Documents/APPS/NEWWORK Apps/forge`)

   ```bash
   cd /Users/denisprekrat/Documents/APPS/NEWWORK Apps/forge
   npm install
   npm run dev
   ```

2. **Indexed Repository**
   The `gravbusapps` repository must be indexed in FORGE:

   ```bash
   # In FORGE dashboard
   - Add repository: https://github.com/preks/gravbusapps
   - Wait for indexing to complete
   ```

3. **Conductor Proxy** (for publishing)
   ```bash
   cd gravity-business-apps
   npm run proxy:conductor
   ```

### Environment Variables

Create `.env` in project root:

```env
# FORGE API (default: http://localhost:3000)
FORGE_API_URL=http://localhost:3000

# Publish Service (default: http://localhost:3002)
PUBLISH_PORT=3002

# Project Root
PROJECT_ROOT=/Users/denisprekrat/Documents/APPS/NEWWORK Apps/BusinessApps/gravity-business-apps
```

## 📖 Usage

### 1. Start the AI Builder

Navigate to `/platform/create/screen-builder` in the NEWWORK platform.

### 2. Describe Your Screen

In the chat interface, describe what you want to build:

**Examples:**

```
"Create a lead management screen with a list view, filters, and detail panel"

"Build a customer dashboard with statistics cards showing total customers,
 active accounts, revenue this month, and a table of recent activities"

"Generate a contact form with name, email, phone, company, and notes fields"
```

### 3. Review Generated Files

Switch to the "Files" tab to see all generated files:

- Component files (`.tsx`)
- Index files (`.ts`)
- Type definitions
- Hooks and queries
- Styles

### 4. Preview the Screen

Click "Preview" tab to see the screen in action:

- Interact with the UI
- Test functionality
- Verify styling
- Check responsiveness

### 5. Publish to Platform

When satisfied:

1. Click "Publish to Platform"
2. Verify screen path: `crm/customers/apps/my-screen`
3. Verify resource URL: `/apps/crm/my-screen`
4. Click "Publish Screen"

Your screen is now live in the NEWWORK platform! 🎉

## 🎨 Example Prompts

### CRM Module

```
"Create a lead list with columns for name, company, status, owner, and actions"
"Build an opportunity pipeline with drag-and-drop between stages"
"Generate a contact detail view with tabs for info, activities, and notes"
```

### HR Module

```
"Create an employee directory with search, filters, and org chart"
"Build a leave request form with date picker and approval workflow"
"Generate a performance review screen with ratings and comments"
```

### Finance Module

```
"Create an expense approval list with filters and bulk actions"
"Build an invoice detail view with line items and payment history"
"Generate a budget dashboard with charts and variance analysis"
```

## 🔧 Technical Details

### Data Integration

The AI Builder automatically integrates with GraphQL APIs using `newwork-graphql-mcp`:

```typescript
// Generated hook example
export const useLeadData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchLeads = async (variables: LeadQueryVariables = {}) => {
    const query = GET_LEADS_QUERY(variables)
    const result = await graphqlClient.request<LeadsResponse>(query)
    return result
  }

  return { fetchLeads }
}
```

### Component Patterns

All generated components follow the standard pattern:

```typescript
import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Button, Card } from '@newwork/nw-design-system';

interface MyScreenProps extends BusinessAppContextProps {}

export const MyScreen: React.FC<MyScreenProps> = (props) => {
  return (
    <div className="gba:container gba:mx-auto gba:p-6">
      <Card data-testid="my-screen-container">
        {/* Generated content */}
      </Card>
    </div>
  );
};
```

### Publishing Process

1. **File Writing**: Generated files are written to `src/business-apps/`
2. **Building**: Vite builds the screen bundle
3. **Uploading**: Files are uploaded to Azure blob storage
4. **Registration**: Screen is registered in platform navigation
5. **Verification**: URL is tested and confirmed

## 🐛 Troubleshooting

### FORGE API Not Responding

```bash
# Check if FORGE is running
curl http://localhost:3000/api/health

# Check repository status
curl http://localhost:3000/api/repos/gravbusapps-main/status
```

### Publish Service Not Running

```bash
# Check if service is running
curl http://localhost:3002/api/health

# Restart service
node src/business-apps/platform/apps/ai-builder/server/publishService.ts
```

### Generated Code Has Errors

- Review the generated files in the Files tab
- Check for missing imports
- Verify component names match exports
- Ensure all dependencies are installed

## 📊 Metrics

The AI Builder tracks:

- **Tokens Used**: Input/output token counts
- **Cost**: Real-time cost calculation
- **Success Rate**: Successful builds/publishes
- **Generation Time**: Average time to generate screens
- **Popular Patterns**: Most requested screen types

## 🎯 Roadmap

- [ ] Multi-file editing before publish
- [ ] Screen templates library
- [ ] Version history and rollback
- [ ] Collaborative editing
- [ ] AI-powered bug fixing
- [ ] Performance optimization suggestions
- [ ] Accessibility checking
- [ ] Automated testing generation

## 🤝 Contributing

To extend the AI Builder:

1. Add new component patterns in FORGE system prompts
2. Create new templates in `templates/` directory
3. Extend `forgeClient.ts` for new capabilities
4. Add new preview modes in `PreviewPanel.tsx`

## 📄 License

Internal NEWWORK tool - Not for external distribution

---

**Built with ❤️ for NEWWORK Platform**
