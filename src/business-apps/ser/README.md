# Service Portal Module

Employee-facing catalog of predefined service requests for Services+ platform.

## Structure

### Apps

- **ServicePortal** - Single unified app with internal navigation for:
  - Service Catalog (browse categories and templates)
  - Service Detail (view templates within a category)
  - Request Form (dynamic form generation and submission)
  - My Requests (list and timeline view of user's requests)

### Components

- **ServicesLayout** - Top-level layout using nw-design-system shell with feature flag protection

### Features

- ✅ `services.enabled` feature flag integration (`Feature.Services.Enabled.Key`)
- ✅ nw-design-system components and styling
- ✅ Service category catalog with search
- ✅ Dynamic form generation (placeholder - TODO: implement JSON schema forms)
- ✅ Request timeline and status tracking
- ✅ Responsive design with proper data-testid attributes

### Dependencies

- `@newwork/services-plus-core` - Core types and WorkflowEngine interface
- `@newwork/services-plus-seed` - Service categories seed data
- `@newwork/nw-design-system` - UI components and layout

### Internal Navigation

The Service Portal handles internal routing between views:

- **Catalog** - Browse service categories
- **Service Detail** - View services within a category
- **Request Form** - Fill out and submit service requests
- **My Requests** - Track submitted requests with timeline

### TODO Items

- [ ] Implement MockWorkflowEngineAdapter
- [ ] JSON Schema form generation for RequestForm
- [ ] Real service template loading from API
- [ ] Polling for request updates (10s intervals)
- [ ] Analytics events integration
- [ ] Service Desk module (separate expert-facing app)

## Usage

```typescript
import { ServicePortal } from '@/business-apps/ser';

// Single Service Portal app with internal navigation
<ServicePortal
  {...businessAppContext}
  workflowEngine={mockWorkflowEngine}
  initialView="catalog"
/>

// Can start from specific view
<ServicePortal
  {...businessAppContext}
  workflowEngine={mockWorkflowEngine}
  initialView="my-requests"
/>
```

### User Experience Flow

1. **Browse** → User sees service categories
2. **Explore** → User clicks category to see available services
3. **Select** → User chooses specific service to request
4. **Fill Form** → User completes dynamic form based on service template
5. **Submit** → Request enters workflow, user sees confirmation
6. **Track** → User can view request progress and timeline
