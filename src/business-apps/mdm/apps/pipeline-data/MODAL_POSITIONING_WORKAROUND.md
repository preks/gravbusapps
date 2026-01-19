# 🚨 MODAL POSITIONING WORKAROUND NOTICE

## Issue Description

The `@newwork/nw-design-system` Dialog component has inconsistent positioning behavior between local development and published environments. Modals appear shifted (top-left instead of centered) causing poor UX.

## Temporary Solution Applied

**Date**: January 2025  
**Reason**: Design system Dialog positioning bug  
**Solution**: Replaced all Dialog components with Ant Design Modal for consistent centering

## Files Modified

### ✅ Components Using Ant Design Modal (instead of nw-design-system Dialog)

1. **`src/business-apps/mdm/apps/pipeline-data/components/PipelineStagesModal.tsx`**
   - Main pipeline stages modal
   - Stage add/edit modal
   - Stage delete confirmation modal

2. **`src/business-apps/mdm/apps/pipeline-data/components/StageConditionsModal.tsx`**
   - Main stage conditions modal
   - Condition add/edit modal
   - Condition delete confirmation modal

3. **`src/business-apps/mdm/apps/pipeline-data/components/PipelineOverview.tsx`**
   - Pipeline add/edit modal
   - Pipeline delete confirmation modal

## What Was Changed

### Before (Design System - BROKEN)

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@newwork/nw-design-system'
;<Dialog open={visible} onOpenChange={onClose}>
  <DialogContent className="gba:max-w-[95vw] gba:w-[95vw]">
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button>Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### After (Ant Design - WORKING)

```tsx
import { Modal } from 'antd'
;<Modal open={visible} onCancel={onClose} footer={null} width="95vw" centered title="Modal Title">
  {/* Content */}
  <div className="gba:flex gba:gap-2 gba:pt-4">
    <Button>Action</Button>
  </div>
</Modal>
```

## 🔄 REVERSION INSTRUCTIONS

**When to Revert**: When `@newwork/nw-design-system` Dialog component is fixed to center properly in both local and published environments.

### Step 1: Test Design System Dialog

```tsx
// Test this in both local and published environments:
<Dialog open={true}>
  <DialogContent className="gba:max-w-[95vw] gba:w-[95vw]">
    <DialogHeader>
      <DialogTitle>Test Modal</DialogTitle>
    </DialogHeader>
    <div>Test content</div>
  </DialogContent>
</Dialog>
```

### Step 2: Revert Changes (if Dialog is fixed)

1. **Update Imports**:

   ```tsx
   // Remove
   import { Modal } from 'antd'

   // Add back
   import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@newwork/nw-design-system'
   ```

2. **Replace Modal Components**:

   ```tsx
   // Replace Modal with Dialog
   <Modal> → <Dialog>
   <div> → <DialogContent>
   title prop → <DialogHeader><DialogTitle>
   Custom footer → <DialogFooter>
   ```

3. **Update Properties**:
   ```tsx
   // Modal props → Dialog props
   open → open
   onCancel → onOpenChange={(open) => !open && onClose()}
   width → className="gba:max-w-[XXXvw] gba:w-[XXXvw]"
   centered → (remove, Dialog should center automatically)
   footer={null} → (remove, use DialogFooter)
   ```

### Step 3: Test All Modals

- [ ] Pipeline stages modal centers correctly
- [ ] Stage conditions modal centers correctly
- [ ] Add/edit pipeline modal centers correctly
- [ ] All delete confirmation modals center correctly
- [ ] Test in both local development AND published environment

## Reference Issue

**Working Reference**: `src/business-apps/crm/common/apps/opportunity-record/components/OpportunityDetails.tsx` uses Ant Design Modal and centers correctly.

## Notes

- Keep this file until design system Dialog is verified to work consistently
- Update `@newwork/nw-design-system` to latest version before testing
- Ensure centering works in both development and production environments
- Remove this file after successful reversion

---

**Contact**: Development team if you need help with the reversion process.
