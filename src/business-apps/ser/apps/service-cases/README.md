# Service Cases Application

Case management specifically for the Services module (Service Desk/Portal).

## Overview

The Service Cases app provides comprehensive case management for IT support and service-related cases. It uses the reusable `CaseManagement` component from `common/apps/case-management` with service-specific configuration.

## Features

- **Dashboard**: Real-time KPIs and analytics for service cases
- **Case List**: Filter, search, and manage service cases
- **Case Details**: Full case information with flows, notes, and entity links
- **Flow Management**: Add and remove workflows to cases
- **Entity Linking**: Link cases to users, employees, and organizational units

## Configuration

The app is pre-configured with:

| Property              | Value                                        | Description                               |
| --------------------- | -------------------------------------------- | ----------------------------------------- |
| `appTag`              | `AppCatalog:1:SER`                           | Filters cases to Services module only     |
| `allowCreate`         | `true`                                       | Users can create new service cases        |
| `allowEdit`           | `true`                                       | Users can edit existing cases             |
| `allowDelete`         | `false`                                      | Deletion is disabled for audit compliance |
| `showAnalytics`       | `true`                                       | Dashboard analytics are enabled           |
| `enableEntityLinking` | `true`                                       | Entity linking is enabled                 |
| `entityTypes`         | `['user', 'employee', 'organizationalUnit']` | All entity types available                |

## Usage

### Basic Integration

```tsx
import { ServiceCases } from '@/business-apps/ser/apps/service-cases'

const ServicesApp = () => {
  const context = {
    accessToken: 'your-access-token',
    userInfo: { id: 'user123', name: 'John Doe' }
  }

  return <ServiceCases {...context} />
}
```

### With Navigation Callbacks

```tsx
<ServiceCases
  initialView="dashboard"
  onServiceDeskNavigation={() => navigateTo('/service-desk')}
  onServicePortalNavigation={() => navigateTo('/service-portal')}
  {...context}
/>
```

## Props

| Prop                        | Type                    | Default       | Description                            |
| --------------------------- | ----------------------- | ------------- | -------------------------------------- |
| `initialView`               | `'dashboard' \| 'list'` | `'dashboard'` | View to show on load                   |
| `onServiceDeskNavigation`   | `() => void`            | `undefined`   | Callback for Service Desk navigation   |
| `onServicePortalNavigation` | `() => void`            | `undefined`   | Callback for Service Portal navigation |
| `accessToken`               | `string`                | Required      | JWT token for API authentication       |
| `userInfo`                  | `object`                | `undefined`   | Current user information               |

## Feature Flag

The app respects the `Feature.Services.Enabled` feature flag. If the Services module is disabled, users will see a "Feature Not Available" message.

## Tag-Based Filtering

All cases are automatically filtered by the `AppCatalog:1:SER` tag, ensuring that:

- Only service-related cases are visible
- New cases are automatically tagged for the Services module
- Cases from other modules (HR, Finance, etc.) are not mixed in

## Related Components

- [CaseManagement](../../../common/apps/case-management/README.md) - Reusable case management component
- [ServiceDesk](../service-desk/README.md) - Service desk agent interface
- [ServicePortal](../service-portal/README.md) - End-user service request portal

## API Integration

Integrates with the Custom Flow Engine Cases API:

- `POST /api/cases` - Create service case
- `GET /api/cases/:caseId` - Get case details
- `POST /api/cases/:caseId/flows` - Add flow to case
- `DELETE /api/cases/:caseId/flows/:workflowId` - Remove flow
- `POST /api/cases/:caseId/complete` - Complete case
- `GET /api/cases/:caseId/flows` - Get linked flows

## Architecture

```
ServiceCases (Entry Point)
├── Feature Flag Check
└── CaseManagement (Reusable Component)
    ├── CaseDashboard
    ├── CaseList
    ├── CaseDetails
    ├── CaseForm
    ├── FlowManagementPanel
    ├── CaseNotesPanel
    └── EntityLinkingPanel
```

## Future Enhancements

1. **Service Desk Integration**: Deep linking between cases and tickets
2. **SLA Tracking**: Service level agreement monitoring
3. **Escalation Rules**: Automatic case escalation
4. **Knowledge Base**: Link cases to KB articles
5. **Customer Portal**: Customer-facing case view

## Support

For issues or questions:

- Check the [CaseManagement README](../../../common/apps/case-management/README.md)
- Review the [Custom Flow Engine API docs](http://localhost:3000/api-docs)
- Contact the Platform team

## License

Internal NEWWORK application - All rights reserved
