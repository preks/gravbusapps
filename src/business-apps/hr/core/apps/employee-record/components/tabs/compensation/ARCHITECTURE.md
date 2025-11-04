# Compensation Benefits Architecture

## Component Hierarchy

```
BenefitsPerksSection
│
├── BenefitCatalogCard (x N)
│   ├── Request Button → opens RequestBenefitModal
│   └── Deactivate Button → opens DeactivateBenefitModal
│
├── RequestBenefitModal
│   └── AppActionForm
│       ├── validateForm()
│       ├── handleSubmit() → startProcess()
│       └── handleSuccess() → close + refetch
│
└── DeactivateBenefitModal
    └── AppActionForm
        ├── validateForm()
        ├── handleSubmit() → startProcess()
        └── handleSuccess() → close + refetch
```

---

## Data Flow Diagram

### **Request Benefit Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ BenefitsPerksSection                                            │
│                                                                 │
│  ┌──────────────┐                                              │
│  │ Catalog Data │ ← useBenefitsCatalog()                       │
│  └──────┬───────┘                                              │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────┐                                          │
│  │ Available        │                                          │
│  │ Benefits List    │                                          │
│  └──────┬───────────┘                                          │
│         │                                                       │
│         │ User clicks "Request"                                │
│         ▼                                                       │
│  ┌──────────────────┐                                          │
│  │ Set Selected     │                                          │
│  │ Benefit + Open   │                                          │
│  │ Modal            │                                          │
│  └──────┬───────────┘                                          │
└─────────┼─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ RequestBenefitModal                                             │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │ Form Fields      │                                          │
│  │ - Provider       │                                          │
│  │ - Yearly Value   │                                          │
│  │ - Start Date     │                                          │
│  │ - Justification  │                                          │
│  └──────┬───────────┘                                          │
│         │                                                       │
│         │ User fills and submits                               │
│         ▼                                                       │
│  ┌──────────────────┐                                          │
│  │ AppActionForm    │                                          │
│  │ - validateForm() │ ← Check all fields                       │
│  └──────┬───────────┘                                          │
│         │                                                       │
│         │ Validation passes                                    │
│         ▼                                                       │
│  ┌──────────────────┐                                          │
│  │ handleSubmit()   │                                          │
│  │ - Build payload  │                                          │
│  │ - startProcess() │ → Kogito: requestEmployeeBenefit        │
│  └──────┬───────────┘                                          │
│         │                                                       │
│         │ Process started                                      │
│         ▼                                                       │
│  ┌──────────────────┐                                          │
│  │ handleSuccess()  │                                          │
│  │ - Close modal    │                                          │
│  │ - Call onSuccess │                                          │
│  └──────┬───────────┘                                          │
└─────────┼─────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│ BenefitsPerksSection                                            │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │ refetch()        │ ← Reload catalog data                    │
│  └──────┬───────────┘                                          │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────┐                                          │
│  │ Updated List     │ (New request shows as "Pending")         │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Flow

```
User types in form
       │
       ▼
┌──────────────────┐
│ Form State       │
│ Updates          │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ isFormValid      │ ← useMemo check
│ (for button)     │
└──────┬───────────┘
       │
       │ User clicks Submit
       ▼
┌──────────────────┐
│ AppActionForm    │
│ calls            │
│ validateForm()   │
└──────┬───────────┘
       │
       ├─ ✅ Valid → handleSubmit()
       │
       └─ ❌ Invalid → Show errors
```

---

## Process Start Flow

### **Current Implementation (Placeholder)**

```
handleSubmit()
    │
    ├─ Build payload
    │
    ├─ startProcess({
    │    domain: 'human-resources',
    │    processName: 'requestEmployeeBenefit',  ← 🚧 Placeholder
    │    payload: { ... },
    │    skipScreen: true
    │  })
    │
    └─ return { success: true }
```

### **Future Implementation (With Flow Registry)**

```
AppAction wrapper
    │
    ├─ Fetch available actions from registry
    │  (contextsArray: [FlowContextName.requestEmployeeBenefit])
    │
    ├─ Registry returns action with:
    │  - Flow name
    │  - Screen URL (modal or full screen)
    │  - Permissions
    │
    ├─ User clicks button
    │
    ├─ AppAction opens screen/modal automatically
    │
    └─ (Same as current from here)
```

---

## Approval Workflow (Future - Backend)

### **Request Benefit Approval**

```
Employee submits request
    │
    ▼
┌───────────────────────┐
│ Kogito Process        │
│ "requestEmployeeBenefit" │
└───────┬───────────────┘
        │
        ├─ Create EmployeeBenefit record (status: PENDING_APPROVAL)
        │
        ├─ Notify Manager (User Task)
        │
        ▼
┌───────────────────────┐
│ Manager Approval      │
└───────┬───────────────┘
        │
        ├─ ✅ Approved
        │   └─ Update status: ACTIVE
        │       └─ Notify Employee
        │
        └─ ❌ Rejected
            └─ Update status: REJECTED
                └─ Notify Employee with reason
```

### **Deactivate Benefit Approval (Conditional)**

```
Employee submits deactivation
    │
    ▼
┌───────────────────────┐
│ Kogito Process        │
│ "deactivateEmployeeBenefit" │
└───────┬───────────────┘
        │
        ├─ Check benefit value/type
        │
        ├─ IF value < threshold
        │   └─ Auto-approve → Update status: INACTIVE
        │       └─ Notify Employee
        │
        └─ IF value >= threshold
            └─ Require HR approval
                │
                ▼
            ┌───────────────────────┐
            │ HR Approval           │
            └───────┬───────────────┘
                    │
                    ├─ ✅ Approved
                    │   └─ Update status: INACTIVE
                    │       └─ Notify Employee
                    │
                    └─ ❌ Rejected
                        └─ Keep status: ACTIVE
                            └─ Notify Employee
```

---

## Error Handling Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ AppActionForm (Error Boundary)                              │
│                                                             │
│  ┌──────────────────┐                                      │
│  │ validateForm()   │ → Returns string[] of errors         │
│  └──────┬───────────┘                                      │
│         │                                                   │
│         ├─ ✅ null → Allow submission                      │
│         │                                                   │
│         └─ ❌ errors → Display Alert                       │
│                └─ "Provider is required"                   │
│                └─ "Start date must be in the future"      │
│                                                            │
│  ┌──────────────────┐                                     │
│  │ handleSubmit()   │                                     │
│  └──────┬───────────┘                                     │
│         │                                                  │
│         ├─ try { startProcess() }                         │
│         │                                                  │
│         └─ catch (error) → AppActionForm shows error      │
│              └─ Alert variant="destructive"               │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## State Management

### **Modal State (BenefitsPerksSection)**

```typescript
const [requestModalOpen, setRequestModalOpen] = useState(false)
const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
const [selectedBenefit, setSelectedBenefit] = useState<BenefitCatalogItem | null>(null)
```

### **Form State (Inside Modals)**

```typescript
// RequestBenefitModal
const [provider, setProvider] = useState<string>('')
const [yearlyValue, setYearlyValue] = useState<string>('')
const [startDate, setStartDate] = useState<string>('')
const [justification, setJustification] = useState('')

// DeactivateBenefitModal
const [endDate, setEndDate] = useState<string>('')
const [reason, setReason] = useState<string>('')
const [additionalDetails, setAdditionalDetails] = useState('')
```

### **Loading State (AppActionForm)**

```typescript
// Managed internally by AppActionForm
const [loading, setLoading] = useState(false)
const [message, setMessage] = useState<ProcessMessage | null>(null)
```

---

## File Structure

```
compensation/
├── constants/
│   ├── compensationFlows.ts          ← 🆕 Flow names and domains
│   ├── benefitDeactivationReasons.ts
│   └── benefitFormValidation.ts
│
├── components/
│   ├── current/
│   │   ├── BenefitsPerksSection.tsx  ← Main container
│   │   └── BenefitCatalogCard.tsx    ← Individual benefit card
│   │
│   ├── modals/
│   │   ├── RequestBenefitModal.tsx   ← 🔄 Refactored with AppActionForm
│   │   ├── DeactivateBenefitModal.tsx← 🔄 Refactored with AppActionForm
│   │   └── BenefitSummaryCard.tsx
│   │
│   └── form-fields/
│       ├── BenefitProviderField.tsx
│       └── BenefitValueField.tsx
│
├── FLOW_INTEGRATION_GUIDE.md         ← 🆕 Integration instructions
├── REFACTORING_SUMMARY.md            ← 🆕 Changes summary
└── ARCHITECTURE.md                   ← 🆕 This file
```

---

## Technology Stack

| Layer                | Technology                 | Purpose                    |
| -------------------- | -------------------------- | -------------------------- |
| **UI Framework**     | React 18                   | Component rendering        |
| **Styling**          | Tailwind CSS (gba: prefix) | Utility-first styling      |
| **Design System**    | @newwork/nw-design-system  | UI components              |
| **Form Management**  | AppActionForm              | Standardized form handling |
| **Process Engine**   | Kogito (🚧 pending)        | Workflow orchestration     |
| **State Management** | React useState/useMemo     | Local state                |
| **Data Fetching**    | Custom hooks               | API integration            |
| **Validation**       | Custom functions           | Form validation            |

---

## Future Enhancements

### **Phase 1 (Current)** ✅

- [x] Basic catalog display
- [x] Request benefit modal
- [x] Deactivate benefit modal
- [x] AppActionForm integration
- [x] Validation

### **Phase 2 (When Flows Ready)** 🚧

- [ ] Kogito flow integration
- [ ] AppAction triggers
- [ ] Approval workflows
- [ ] Notifications

### **Phase 3 (Future)**

- [ ] Edit benefit details
- [ ] Bulk benefit operations
- [ ] Benefit history timeline
- [ ] Documents/attachments
- [ ] Comments/notes

---

**Last Updated:** November 2025  
**Architecture Version:** 1.0
