# Template Manager - Phase 2 Sprint 2: Diff Viewer

## 🎯 Objective

Provide a side-by-side comparison view for individual templates, highlighting exact differences in their JSON structure.

## ✅ Features Implemented

### 1. Diff Viewer Modal Component

**File**: `components/comparison/DiffViewerModal.tsx`

A comprehensive modal that displays template differences in multiple viewing modes:

#### **Three Viewing Modes**:

1. **Clean Diff (No Metadata)** - Shows only template content without database metadata
   - Easier to read and focus on actual template changes
   - Removes `metadata`, timestamps, and version info
   - Default view for quick comparisons

2. **Full Diff (With Metadata)** - Shows complete template JSON including all metadata
   - Useful for debugging and audit trails
   - Shows database info, versions, timestamps
   - Complete picture of template state

3. **Side-by-Side Preview** - Static JSON preview without highlighting
   - Shows formatted JSON for both source and target
   - Includes version info and line counts
   - Good for quick inspection without diff highlighting

#### **Key Features**:

- **Word-level diffing** using `react-diff-viewer-continued`
- **Color coding**:
  - 🟢 Green: Added content
  - 🔴 Red: Removed content
  - 🟡 Yellow: Highlighted changes
- **Custom styling** with monospace font and clear visual hierarchy
- **Version badges** showing source and target versions
- **Status badge** showing comparison status
- **Version gap indicator** when applicable
- **Line count statistics** for each template

### 2. Diff Button in Comparison Table

**File**: `components/comparison/TemplateComparisonTable.tsx`

Added "Diff" button next to "Sync" button in the Actions column:

#### **When Diff Button Appears**:

The button is shown for templates with differences:

- ✅ `CONTENT_DRIFT` - Same version, different content
- ✅ `VERSION_DRIFT` - Different versions, same content
- ✅ `SOURCE_AHEAD` - Source has newer version
- ✅ `TARGET_AHEAD` - Target has newer version
- ✅ `NEW_IN_SOURCE` - Only exists in source
- ✅ `NEW_IN_TARGET` - Only exists in target
- ❌ `IDENTICAL` - No diff needed (templates are identical)

#### **Button Design**:

- Outline variant for secondary action
- FileCode icon for clear visual indication
- Positioned before "Sync" button
- Data-testid for automated testing

### 3. Integration with ComparisonDashboard

**File**: `components/comparison/ComparisonDashboard.tsx`

Seamless integration with the main dashboard:

#### **State Management**:

```typescript
const [showDiffModal, setShowDiffModal] = useState(false)
const [diffComparison, setDiffComparison] = useState<TemplateComparison | null>(null)
const [diffSourceTemplate, setDiffSourceTemplate] = useState<FlowTemplate | null>(null)
const [diffTargetTemplate, setDiffTargetTemplate] = useState<FlowTemplate | null>(null)
const [loadingDiff, setLoadingDiff] = useState(false)
```

#### **Diff Click Handler**:

- Validates source and target instances are selected
- Opens modal immediately (for instant feedback)
- Fetches both templates in parallel (using `Promise.all`)
- Handles errors gracefully (shows error alert, closes modal)
- Uses correct API keys/access tokens for each instance

#### **API Integration**:

```typescript
const promises: [Promise<FlowTemplate | null>, Promise<FlowTemplate | null>] = [
  comparison.source
    ? templateApi.getTemplateById(sourceInstance.baseUrl, comparison.templateId, sourceApiKey)
    : Promise.resolve(null),
  comparison.target
    ? templateApi.getTemplateById(targetInstance.baseUrl, comparison.templateId, targetApiKey)
    : Promise.resolve(null)
]

const [sourceTemplate, targetTemplate] = await Promise.all(promises)
```

## 🎨 User Experience Flow

### Happy Path:

1. User compares two instances (e.g., Demo → Local Development)
2. Comparison table shows templates with various statuses
3. Templates with differences have a "Diff" button
4. User clicks "Diff" on a template (e.g., "ai agent" with CONTENT_DRIFT)
5. **Modal opens immediately** with loading state
6. Templates are fetched in parallel (~100-300ms)
7. **Diff is displayed** with word-level highlighting
8. User switches between viewing modes (Clean, Full, Preview)
9. User reviews changes and decides to sync or not
10. User closes modal

### Edge Cases Handled:

- **Template only in source**: Shows source template vs "Template not found"
- **Template only in target**: Shows "Template not found" vs target template
- **Identical templates**: No diff button shown (status is IDENTICAL)
- **Fetch errors**: Error alert shown, modal closed automatically
- **Missing instances**: Validation error before fetch attempt

## 📊 Technical Details

### Dependencies Added:

```json
{
  "react-diff-viewer-continued": "^3.4.0"
}
```

**Why `react-diff-viewer-continued`?**

- Maintained fork of `react-diff-viewer`
- Better TypeScript support
- Word-level diffing with `DiffMethod.WORDS`
- Customizable styling
- Split view support

### Component Architecture:

```
ComparisonDashboard (State Management)
    ↓
    ├─→ TemplateComparisonTable (Diff Button)
    │       ↓
    │       └─→ handleDiffClick()
    │               ↓
    │               ├─→ Fetch Source Template (parallel)
    │               ├─→ Fetch Target Template (parallel)
    │               └─→ Open Modal
    │
    └─→ DiffViewerModal (Display)
            ↓
            ├─→ Clean Diff Tab
            ├─→ Full Diff Tab
            └─→ Preview Tab
```

### Data Flow:

```
User Click
    ↓
TemplateComparisonTable.onDiffClick(comparison)
    ↓
ComparisonDashboard.handleDiffClick(comparison)
    ↓
setShowDiffModal(true) + setLoadingDiff(true)
    ↓
Promise.all([
    templateApi.getTemplateById(source...),
    templateApi.getTemplateById(target...)
])
    ↓
setDiffSourceTemplate(...) + setDiffTargetTemplate(...)
    ↓
setLoadingDiff(false)
    ↓
DiffViewerModal renders with data
```

## 🧪 Testing Scenarios

### Scenario 1: Content Drift

- **Setup**: Template with same version but different content
- **Expected**: Diff shows content changes clearly highlighted
- **Result**: ✅ Word-level highlighting works perfectly

### Scenario 2: Version Drift

- **Setup**: Template with different versions but same content
- **Expected**: Diff shows metadata differences (version, timestamps)
- **Result**: ✅ Clean diff shows no changes, Full diff shows metadata changes

### Scenario 3: Source Ahead

- **Setup**: Source v9, Target v1
- **Expected**: Diff shows all changes from v1 to v9
- **Result**: ✅ Large diffs are handled, scroll works well

### Scenario 4: New in Source

- **Setup**: Template only exists in source
- **Expected**: Diff shows source vs "Template not found"
- **Result**: ✅ Right side shows "Template not found" message

### Scenario 5: New in Target

- **Setup**: Template only exists in target
- **Expected**: Diff shows "Template not found" vs target
- **Result**: ✅ Left side shows "Template not found" message

### Scenario 6: Performance

- **Setup**: Large template (100+ lines)
- **Expected**: Smooth scrolling, no lag
- **Result**: ✅ React Diff Viewer handles large templates efficiently

## 🚀 Benefits

### For Users:

1. **Visual Clarity**: See exactly what changed between templates
2. **Quick Decision Making**: Understand differences before syncing
3. **Multiple Perspectives**: Switch between viewing modes as needed
4. **Confidence**: Review changes before syncing to production
5. **Debugging**: Full diff mode helps troubleshoot issues

### For Operations:

1. **Audit Trail**: Can review what was synced and why
2. **Quality Control**: Catch unintended changes before deployment
3. **Documentation**: Screenshots of diffs can be used in change requests
4. **Training**: New team members can learn by comparing templates

### For Developers:

1. **Debugging**: Quickly identify what's different between environments
2. **Testing**: Verify sync operations worked correctly
3. **Code Review**: Review template changes like code changes
4. **Version Control**: Understand template evolution over time

## 📝 Usage Examples

### Example 1: Reviewing Content Changes Before Sync

```
1. Compare Demo → Local Development
2. See "ai agent" template with CONTENT_DRIFT status
3. Click "Diff" button
4. Review changes in Clean Diff mode
5. Notice a message field changed from "what is 1+1" to "what is 2+2"
6. Decide to sync or not based on this information
```

### Example 2: Debugging Version Mismatch

```
1. Compare Demo → Production
2. See "ai agent fix" with VERSION_DRIFT status
3. Click "Diff" button
4. Switch to Full Diff mode
5. See metadata shows v7 vs v7 but different timestamps
6. Realize someone edited production directly
7. Sync from Demo to restore correct version
```

### Example 3: Reviewing New Template

```
1. Compare Demo → Local Development
2. See "new_template" with NEW_IN_SOURCE status
3. Click "Diff" button
4. Right side shows "Template not found"
5. Left side shows full template structure
6. Review the new template before syncing
7. Sync to Local Development
```

## 🎯 Next Steps

### Completed:

- ✅ Diff viewer modal with 3 viewing modes
- ✅ Diff button in comparison table
- ✅ Integration with ComparisonDashboard
- ✅ Parallel template fetching
- ✅ Error handling
- ✅ Loading states
- ✅ Word-level diffing
- ✅ Custom styling

### Potential Enhancements (Future):

- 🔮 Diff history: View past diffs from sync history
- 🔮 Export diff: Download diff as PDF or HTML
- 🔮 Inline comments: Add notes to specific changes
- 🔮 Approval workflow: Require approval before sync based on diff
- 🔮 Diff statistics: Show metrics (lines added/removed, files changed)
- 🔮 Syntax highlighting: JSON syntax highlighting in diffs
- 🔮 Collapsed sections: Collapse unchanged sections for large diffs

---

## 📚 Related Documentation

- `PHASE_2_PLAN.md` - Overall Phase 2 plan
- `BULK_SYNC_IMPROVEMENTS.md` - Sprint 1 bulk sync implementation
- `FINAL_ARCHITECTURE.md` - Complete system architecture

---

**Status**: ✅ **COMPLETE** - Diff viewer is fully functional and ready for use!

**Sprint Duration**: ~2-3 hours (as estimated in plan)

**Impact**: 🌟 High - Significantly improves user confidence when syncing templates by providing visual confirmation of changes.
