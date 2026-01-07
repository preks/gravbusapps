# Services+ Contract

## Overview

You are building Services+ (POC) with two apps:

### Service Portal

- **Purpose**: Employee-facing catalog of predefined service requests
- **Features**:
  - Dynamic form generation
  - Multi-step workflow
  - "My Requests" with per-step timestamps

### Service Desk

- **Purpose**: Expert-facing ticketing per desk (IT, HR, etc.)
- **Features**:
  - Claim/assign functionality
  - Step advancement capabilities
  - Per-step comments visible downstream

## Platform Alignment

### Services+ Integration

- **Phase**: Phase 4 next to Sales+
- **Leverages**: FLOW and MAP Orgchart for routing/roles
- **Workflow Engine**: FLOW taxonomy integration

### FLOW Taxonomy

- **Action FLOWs**: Single-step workflows
- **Multi-step FLOWs**: Request/approval workflows
- **Customer cFLOWs**: Customer-facing workflows
- **Technical Note**: All are technically FLOWs

### Cross-Module Integration

- **EVERY**: Cross‑module work hub for future notifications
- **Capability/Role Mapping**: Derived from MAP Orgchart (e.g., IT_Manager, HR_Manager)
- **Desks**: Organizational structure from MAP Orgchart

## POC Integrations

### Data Sources

- **User/Org/Capabilities**: Real data via nw-graphql-mcp
- **Workflow State**:
  - **Initial**: MockWorkflowEngineAdapter
  - **Future**: Drop‑in ConductorWorkflowEngineAdapter (same interface)

### Design System

- **Components**: Use nw-design-system components
- **Layout**: Leverage nw-design-system layout patterns

## Architecture Notes

- Services+ follows the same architectural patterns as other business apps
- Integration with FLOW engine for workflow management
- MAP Orgchart provides organizational context and role-based routing
- Design system ensures consistent UI/UX across the platform

Core Domain (Typescript):
export type StepReceiver =
| 'HR' | 'IT' | 'Facilities' | 'Finance' | 'Procurement' | 'Legal'
| 'Security' | 'AccessIdentity' | 'Workplace' | 'Fleet' | 'Data' | 'L&D' | 'Admin';

export type StepStatus = 'pending' | 'ready' | 'in_progress' | 'blocked' | 'done' | 'canceled';
export type TicketStatus = 'queued' | 'claimed' | 'in_progress' | 'waiting' | 'done' | 'canceled';

export type ServiceCategory = { id:string; name:string; icon?:string; description?:string; order:number; };

export type StepDefinition = {
id:string; name:string; receiver:StepReceiver;
parallelGroup?:string; requires?:string[]; slaHours?:number;
inputs?:Record<string,unknown>;
};

export type ServiceRequestTemplate = {
id:string; categoryId:string; key:string; title:string; description?:string;
formSchema:any; uiSchema?:Record<string,unknown>; steps:StepDefinition[]; version:number; enabled:boolean;
};

export type Comment = {
id:string; stepId:string; authorId:string; createdAt:string; body:string;
visibility:'current_and_downstream';
};

export type StepInstance = {
id:string; defId:string; name:string; desk:StepReceiver; status:StepStatus;
assignedToUserId?:string; claimedByUserId?:string;
startedAt?:string; finishedAt?:string;
comments:Comment[];
requestId:string; // backlink
};

export type SubmittedRequest = {
id:string; templateId:string; templateVersion:number;
requesterId:string; createdAt:string; status:'open'|'in_progress'|'completed'|'canceled';
titleSnapshot:string; categoryIdSnapshot:string;
formData:any;
steps:StepInstance[];
timeline:Array<{at:string; message:string}>;
};

export interface WorkflowEngine {
startRequest(templateKey:string, formData:any):Promise<string>;
getRequest(requestId:string):Promise<SubmittedRequest>;
getMyRequests():Promise<SubmittedRequest[]>;
getDeskTickets(desk:StepReceiver):Promise<StepInstance[]>;
claim(stepId:string):Promise<void>;
assign(stepId:string, userId:string):Promise<void>;
advance(stepId:string, payload?:any):Promise<void>;
comment(stepId:string, body:string):Promise<Comment>;
}

Seed categories (POC):
• HR, IT, Travel, Facilities/Workplace, Finance, Procurement, Legal, Security, Access & Identity, Data/Analytics, Learning & Development, Fleet, Admin.

Seed request examples per category (POC minimum):
• HR: Onboard, Offboard, Contract change, Data change, Employment letter, Parental leave
• IT: New license, New hardware, Hardware issue, Software/SSO access, VPN, Deprovision
• Travel: Booking, Visa letter, Policy exception, Insurance certificate
• Facilities: Badge access, Room AV setup, Seating move, Building issue
• Finance: New vendor, Cost center change, Expense limit increase, Corporate card
• Procurement: Purchase request, RFQ, Contract renewal
• Legal: NDA, Contract review, DPIA
• Security: Incident, Data access exception, Phishing follow‑up
• Access & Identity: DL/group add, Role update, Elevated access (time‑bound)
• Data/Analytics: New BI dashboard, Data extract, KPI change
• L&D: Course enrollment, Certification reimbursement, Training content
• Fleet: Company car, Fuel card issue, Accident report
• Admin: Office supplies, Shipping, Event support

Behavioral rules:
• On submit, compute initial ready steps (respect requires and parallelGroup).
• Parallel steps in same parallelGroup become ready together.
• Completing a step unlocks dependents; write timeline entries with timestamps.
• Comments on a step are visible downstream (later steps).
• A ticket is any step in ready|in_progress routed to its desk.
• Desk visibility gates by MAP Orgchart capabilities/roles (e.g., IT_Manager, HR_Manager) ￼.

NFRs:
• Feature flag `services.enabled` (accessible via `Feature.Services.Enabled.Key`).
• Accessibility & i18n; design-system compliance.
• Simple 10s polling; later replaced by Conductor events.
• Basic analytics events: services.request_submitted, services.step_claimed, services.step_completed, services.comment_added.
