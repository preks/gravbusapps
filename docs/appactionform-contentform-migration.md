# AppActionForm Integration - ContentEntryWindow Migration

## Overview

Migrated `ContentEntryWindow` from using standard `<Form>` wrapper to using `AppActionForm` for proper process event handling, automatic navigation, and standardized form behavior.

---

## Changes Made

### 1. **Import Changes**

**REMOVED**:

```typescript
import { Form, Button } from '@newwork/nw-design-system'
import { useState, useEffect } from 'react'
```

**ADDED**:

```typescript
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { useMemo } from 'react'
```

### 2. **State Management**

**OLD (Manual State)**:

```typescript
const [isSubmitting, setIsSubmitting] = useState(false)

const onSubmit = async (data: ContentEntryWindowVals) => {
  setIsSubmitting(true)
  try {
    // Manual submission logic
    window.dispatchEvent(new CustomEvent('com.newwork.form.success', {...}))
  } finally {
    setIsSubmitting(false)
  }
}
```

**NEW (AppActionForm Managed)**:

```typescript
// AppActionForm handles loading state internally
const handleSubmit = async (data: ContentEntryWindowVals) => {
  // Just return data - AppActionForm dispatches process events
  return {
    contentId: data.id || 'new',
    ...data
  }
}
```

**Benefits**:

- ✅ No manual loading state management
- ✅ Automatic process event dispatching
- ✅ Standardized error handling
- ✅ Process completion event listening

### 3. **Form Wrapper**

**OLD (Standard Form)**:

```typescript
<div className="gba:max-w-4xl gba:mx-auto gba:p-6">
  <h1>{context.contentId ? t('edit_content') : t('create_content')}</h1>

  <Form {...form}>
    <form onSubmit={handleSubmit(onSubmit as any)}>
      {/* Form fields */}

      {/* Manual buttons */}
      <div className="gba:flex gba:justify-end gba:gap-4">
        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>Save</Button>
      </div>
    </form>
  </Form>
</div>
```

**NEW (AppActionForm)**:

```typescript
<AppActionForm
  processType={context.contentId ? 'update' : 'create'}
  onSubmit={handleSubmit}
  formData={defaultValues}
  form={form}
  submitButtonText={context.contentId ? t('update_content') : t('create_content')}
  showCancelButton={true}
  businessAppContext={context}
  data-testid="content-entry-window"
  customFormLayout={true}
>
  <div className="gba:space-y-6">
    {/* Form fields - no manual buttons needed */}
  </div>
</AppActionForm>
```

**Benefits**:

- ✅ Automatic Cancel/Submit buttons with proper styling
- ✅ Process event dispatching (`pse_submit`, `pse_pause`)
- ✅ Process completion event handling
- ✅ Standardized loading/error states
- ✅ Consistent form navigation across all forms

### 4. **Default Values Memoization**

**OLD (Inline Object)**:

```typescript
const form = useForm<ContentEntryWindowVals>({
  defaultValues: {
    id: context.contentId || '',
    title: ''
    // ... other fields
  }
})
```

**NEW (Memoized)**:

```typescript
const defaultValues = useMemo(
  () => ({
    id: context.contentId || '',
    title: ''
    // ... other fields
  }),
  [context.contentId, context.userInfo]
)

const form = useForm<ContentEntryWindowVals>({
  defaultValues
})
```

**Benefits**:

- ✅ Prevents infinite re-renders
- ✅ Default values only recalculated when dependencies change
- ✅ Better performance

### 5. **Removed Manual Button Handling**

**REMOVED**:

```typescript
<Button type="button" variant="outline" onClick={() => {
  window.dispatchEvent(new CustomEvent('com.newwork.form.cancel'))
}}>
  {t('actions.cancel')}
</Button>

<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? t('actions.saving') : t('actions.save')}
</Button>
```

**REPLACED WITH**: AppActionForm's automatic navigation (FormNavigation component)

---

## AppActionForm Props Used

```typescript
{
  processType: 'create' | 'update',      // Auto-selects button text
  onSubmit: handleSubmit,                 // Async submit handler
  formData: defaultValues,                // Form default values
  form: form,                             // React Hook Form instance
  submitButtonText: string,               // Custom submit button text
  showCancelButton: true,                 // Show cancel button
  businessAppContext: context,            // Access token, user info, etc.
  'data-testid': 'content-entry-window',         // Test ID for automation
  customFormLayout: true                  // Use custom layout (no Form wrapper)
}
```

### Why `customFormLayout: true`?

When `true`, AppActionForm:

- ✅ Wraps children in `<Form {...form}>` context
- ✅ Creates a `<form>` element with proper `onSubmit`
- ✅ Lets us define custom field layout
- ✅ Adds navigation buttons automatically at the bottom

When `false` (standard layout):

- Restricts form to `max-w-md` width
- Uses predefined flex column layout
- Better for simple forms with few fields

---

## Process Event Flow

### OLD Flow (Manual):

```
User clicks Submit
  → Manual setState(loading: true)
  → Try/catch block
  → Manual event: window.dispatchEvent('com.newwork.form.success')
  → Manual setState(loading: false)
```

### NEW Flow (AppActionForm):

```
User clicks Submit
  → AppActionForm sets loading state
  → Calls handleSubmit(data)
  → Dispatches process event: dispatchProcessContinueEvent('pse_submit', result)
  → Listens for process completion events:
      - com.newwork.process.processCompletion
      - com.newwork.process.taskCompletion
  → Waits for completion (10s timeout)
  → Calls onSuccess callback
  → Resets loading state
```

**Benefits**:

- ✅ Proper process/task lifecycle handling
- ✅ Automatic timeout for long-running processes
- ✅ Error boundary and error display
- ✅ Success/failure resolution handling

---

## Testing Changes

### Updated Test IDs:

- ❌ **REMOVED**: `content-entry-window-cancel-button`, `content-entry-window-submit-button`
- ✅ **ADDED**: `content-entry-window-cancel-button` (auto-generated by AppActionForm)
- ✅ **ADDED**: `content-entry-window-submit-button` (auto-generated by AppActionForm)
- ✅ **ADDED**: `content-entry-window-form-navigation` (navigation container)

### Test Behavior Changes:

1. **Loading State**: Now managed by AppActionForm, check `isSubmitting` on form context
2. **Error Display**: Errors now show in AppActionForm's Alert component
3. **Process Events**: Form now dispatches `pse_submit`/`pse_pause` instead of custom events

---

## Migration Checklist for Other Forms

When migrating other forms to AppActionForm:

- [ ] Replace `<Form>` wrapper with `<AppActionForm>`
- [ ] Remove manual `isSubmitting` state
- [ ] Change `onSubmit` to return data instead of dispatching events
- [ ] Remove manual Cancel/Submit buttons
- [ ] Add `processType` prop ('create', 'update', 'delete', or 'custom')
- [ ] Pass `businessAppContext` for access token
- [ ] Set `customFormLayout={true}` if using custom field layout
- [ ] Memoize `defaultValues` to prevent re-renders
- [ ] Update test IDs to match AppActionForm's auto-generated IDs

---

## Related Files Modified

1. ✅ `src/business-apps/core/content/forms/content-entry-window/ContentEntryWindow.tsx`
   - Wrapped in AppActionForm
   - Removed manual state management
   - Memoized default values
   - Removed manual buttons

---

**Status**: ✅ MIGRATION COMPLETE - AppActionForm Integration Successful
**Date**: 2025-01-28
