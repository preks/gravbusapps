# TaskDetailFooter Auto-Actions Implementation

## Overview

`TaskDetailFooter` komponenta je poboljšana sa automatskom detekcijom i prikazivanjem akcija iz cFlow task objekta. Ova implementacija omogućava dinamičko generisanje action dugmadi na osnovu `task.availableActions` koje dolaze sa backend-a.

## Kako funkcioniše

### 1. Backend određuje dostupne akcije

cFlow API (custom-flow-engine) koristi `TaskStateService.getAvailableActions()` za dinamičko određivanje koje akcije su dostupne za svaki task na osnovu:

- **Task Status**: SCHEDULED, IN_PROGRESS, COMPLETED, REJECTED
- **Assignment Mode**: CLAIM vs DIRECT
- **Assignment Status**: CLAIMABLE, CLAIMED, ASSIGNED, UNASSIGNED
- **Ownership**: Da li je korisnik vlasnik taska (`userId === assignedTo`)
- **Task Type**: Da li je APPROVAL (za reject funkciju)
- **Permissions**: `allowReassignment` flag

**Dostupne akcije:**

```typescript
interface AvailableActions {
  canClaim?: boolean // Preuzmi claimable task
  canComplete?: boolean // Završi task
  canReassign?: boolean // Reassignuj task drugom korisniku
  canReject?: boolean // Odbij task (samo approval taskovi)
  canUnclaim?: boolean // Vrati task u pool
}
```

### 2. TaskDetailFooter automatski generiše akcije

Komponenta automatski prepoznaje cFlow task i kreira odgovarajuća action dugmad:

```typescript
<TaskDetailFooter
  task={task}                    // cFlow task sa availableActions
  onTaskAction={handleTaskAction} // Unified handler
  isLoading={isCompleting}       // Loading state
/>
```

**Mapiranje akcija na dugmad:**

- `canClaim` → "Claim Task" (default, UserPlus icon)
- `canComplete` → "Complete Task" (default, Send icon)
- `canReject` → "Reject" (destructive, XCircle icon)
- `canReassign` → "Reassign" (outline, UserSwitch icon)
- `canUnclaim` → "Unclaim" (outline, UserMinus icon)

### 3. Unified handleTaskAction funkcija

Single handler funkcija u `UniversalCflowTaskDetails` procesira sve akcije:

```typescript
const handleTaskAction = async (action: string, data?: any) => {
  switch (action) {
    case 'claim':
      // TODO: Implement claim API call
      break;

    case 'complete':
      // Process form data and complete task
      await fetch(`${flowEngineApi}/api/tasks/${task.id}/complete`, ...);
      break;

    case 'reject':
      // Reject task (approval only)
      await fetch(`${flowEngineApi}/api/tasks/${task.id}/reject`, ...);
      break;

    case 'reassign':
      // TODO: Implement reassign API call
      break;

    case 'unclaim':
      // TODO: Implement unclaim API call
      break;
  }
}
```

## Sticky Footer Implementation

Footer je sada sticky na dnu komponente, kao što je header sticky na vrhu:

```typescript
className={cn(
  "gba:sticky gba:bottom-0 gba:z-40 gba:bg-card/95 gba:backdrop-blur-sm gba:border-t gba:shadow-sm",
  className
)}
```

## Komponenta struktura

```
UniversalCflowTaskDetails
├── TaskDetailHeader (sticky top)
├── Content area (scrollable)
│   ├── Overall Progress
│   ├── Description
│   ├── Task Information
│   ├── Links
│   ├── Form (editable/read-only)
│   └── Comment Section
└── TaskDetailFooter (sticky bottom)
    └── Auto-generated action buttons
```

## Način korišćenja

### Automatski način (preporučeno za cFlow taskove)

```typescript
<TaskDetailFooter
  task={task}
  onTaskAction={handleTaskAction}
  isLoading={isPerforming}
/>
```

### Ručni način (za custom taskove)

```typescript
const customActions: TaskAction[] = [
  {
    label: 'Custom Action',
    onClick: handleCustomAction,
    variant: 'default',
    icon: SomeIcon
  }
];

<TaskDetailFooter actions={customActions} />
```

### Children način (za potpunu kontrolu)

```typescript
<TaskDetailFooter>
  <Button variant="outline" onClick={onCancel}>Cancel</Button>
  <Button variant="default" onClick={onSave}>Save</Button>
</TaskDetailFooter>
```

## Prednosti nove implementacije

### 1. Automatska sinhronizacija sa backend-om

- Frontend ne treba da zna business logiku koje akcije su dostupne
- Backend određuje akcije na osnovu trenutnog stanja taska
- Nema hardcoded pravila u frontend kodu

### 2. Jednostavnost korišćenja

- Single line za integraciju: `<TaskDetailFooter task={task} onTaskAction={handler} />`
- Automatsko mapiranje akcija na dugmad
- Unified handler za sve akcije

### 3. Konzistentnost

- Sve cFlow taskove koriste istu komponentu
- Isti UI pattern za sve akcije
- Sticky footer kao header

### 4. Proširivost

- Lako dodati nove akcije u budućnosti
- Backend dodaje novu akciju → Frontend automatski prikazuje dugme
- No code changes needed u komponenti

## Budući razvoj

### TODO: Implementirati preostale akcije

**Claim Action:**

```typescript
case 'claim':
  const claimResponse = await fetch(`${flowEngineApi}/api/tasks/${task.id}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ userId })
  });
```

**Reassign Action:**

```typescript
case 'reassign':
  // Show user picker dialog
  const newUserId = await showUserPickerDialog();

  const reassignResponse = await fetch(`${flowEngineApi}/api/tasks/${task.id}/reassign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      currentUserId: userId,
      newUserId
    })
  });
```

**Unclaim Action:**

```typescript
case 'unclaim':
  const unclaimResponse = await fetch(`${flowEngineApi}/api/tasks/${task.id}/unclaim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ userId })
  });
```

## Testiranje

### Različiti task tipovi za testiranje:

1. **Claimable Task** - Testirati `canClaim` akciju
2. **Assigned Task** - Testirati `canComplete` akciju
3. **Approval Task** - Testirati `canReject` akciju
4. **Reassignable Task** - Testirati `canReassign` akciju
5. **Claimed Task** - Testirati `canUnclaim` akciju

### Test scenariji:

- Task koji nije vlasnik korisnika → Nijedna akcija nije prikazana
- Completed task → Nijedna akcija nije prikazana
- Claimable task → Prikaži "Claim Task" dugme
- Owner active task → Prikaži "Complete Task" dugme
- Owner approval task → Prikaži "Complete Task" i "Reject" dugmad
- Loading state → Sva dugmad disabled sa loading stanjem

## Related Files

- **TaskDetailFooter**: `src/business-apps/platform/apps/every-box/components/TaskDetailFooter.tsx`
- **UniversalCflowTaskDetails**: `src/business-apps/platform/apps/every-box/components/task-details/UniversalCflowTaskDetails.tsx`
- **Backend TaskStateService**: `custom-flow-engine/src/services/task/taskStateService.ts`
- **Types**: `src/business-apps/platform/apps/every-box/types/index.ts`
