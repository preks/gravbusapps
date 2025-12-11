# Template Manager - Phase 2 Implementation Plan

## 🎯 Phase 2 Goals

Build advanced features that enhance productivity and provide deeper insights into template differences.

## 📋 Features to Implement

### 1. **Bulk Sync Operations** 🔄

**Priority**: HIGH  
**Complexity**: Medium  
**Estimated Time**: 2-3 hours

#### Features:

- Select multiple templates from comparison table
- Batch sync configuration dialog
- Progress tracking for multiple templates
- Summary report after completion
- Pause/resume capability
- Error handling with partial success

#### Components:

- `components/comparison/BulkSelectionControls.tsx` - Checkbox controls
- `components/sync/BulkSyncDialog.tsx` - Configure bulk sync
- `components/sync/BulkSyncProgress.tsx` - Track multiple syncs
- Updated `TemplateComparisonTable.tsx` - Add checkboxes

#### Changes to Existing:

- `useTemplateSync.ts` - Already has `syncMultiple` function! ✅
- `ComparisonDashboard.tsx` - Add bulk sync state management

---

### 2. **Template Diff Viewer** 🔍

**Priority**: HIGH  
**Complexity**: High  
**Estimated Time**: 3-4 hours

#### Features:

- Side-by-side template comparison
- Step-by-step differences highlighting
- JSON field-level diff
- Expand/collapse sections
- Copy to clipboard
- Export diff report

#### Components:

- `components/diff/DiffViewerDialog.tsx` - Main diff dialog
- `components/diff/TemplateDiffView.tsx` - Side-by-side view
- `components/diff/StepDiffCard.tsx` - Individual step comparison
- `components/diff/JsonDiffViewer.tsx` - JSON diff with highlighting

#### Utilities:

- `utils/templateDiff.ts` - Calculate detailed differences
- `utils/jsonDiff.ts` - JSON diff algorithm

#### Libraries to Consider:

- `react-diff-viewer` - For diff visualization
- `diff` - For text comparison
- Or build custom diff using existing nw-design-system components

---

### 3. **Sync History UI** 📊

**Priority**: MEDIUM  
**Complexity**: Medium  
**Estimated Time**: 2-3 hours

#### Features:

- Browse past sync operations
- Filter by date, source, target, status
- View sync details
- Retry failed syncs
- Export history as CSV/JSON
- Clear history

#### Components:

- `components/history/SyncHistoryPanel.tsx` - Main history view
- `components/history/SyncHistoryTable.tsx` - Table of past syncs
- `components/history/SyncHistoryFilters.tsx` - Filter controls
- `components/history/SyncHistoryDetails.tsx` - Detailed view of one sync

#### Integration:

- Add new tab to TemplateManager
- Update localStorage structure for better querying
- Add pagination for large histories

---

### 4. **Enhanced Error Reporting** ⚠️

**Priority**: MEDIUM  
**Complexity**: Low  
**Estimated Time**: 1-2 hours

#### Features:

- Detailed error messages with causes
- Suggested fixes for common errors
- Copy error details to clipboard
- Link to relevant documentation
- Error categorization (network, auth, validation, etc.)

#### Components:

- `components/common/ErrorDetails.tsx` - Rich error display
- `components/common/ErrorSuggestions.tsx` - Suggested fixes

#### Utilities:

- `utils/errorParser.ts` - Parse and categorize errors
- `utils/errorSuggestions.ts` - Map errors to suggestions

---

## 🔧 Implementation Order

### Sprint 1: Bulk Sync (Day 1)

1. ✅ Add selection state to comparison table
2. ✅ Build BulkSelectionControls component
3. ✅ Build BulkSyncDialog component
4. ✅ Build BulkSyncProgress component
5. ✅ Wire up useTemplateSync.syncMultiple
6. ✅ Test with 2, 5, 10 templates

### Sprint 2: Diff Viewer (Day 2)

1. ✅ Build template diff algorithm
2. ✅ Build DiffViewerDialog shell
3. ✅ Build TemplateDiffView with side-by-side layout
4. ✅ Build StepDiffCard with highlighting
5. ✅ Build JsonDiffViewer for raw JSON
6. ✅ Add diff viewer button to comparison table
7. ✅ Test with various template differences

### Sprint 3: Sync History UI (Day 3)

1. ✅ Design improved localStorage schema
2. ✅ Build SyncHistoryPanel layout
3. ✅ Build SyncHistoryTable with sorting
4. ✅ Build SyncHistoryFilters
5. ✅ Build SyncHistoryDetails modal
6. ✅ Add retry functionality
7. ✅ Add export functionality
8. ✅ Test with mock history data

### Sprint 4: Error Enhancements (Day 3 afternoon)

1. ✅ Build error parser utility
2. ✅ Create error suggestion mapping
3. ✅ Build ErrorDetails component
4. ✅ Build ErrorSuggestions component
5. ✅ Integrate into existing error displays
6. ✅ Test with various error scenarios

---

## 📁 New File Structure

```
src/business-apps/flow/apps/template-manager/
├── components/
│   ├── comparison/
│   │   ├── BulkSelectionControls.tsx      # NEW
│   │   ├── ComparisonDashboard.tsx         # UPDATED
│   │   └── TemplateComparisonTable.tsx     # UPDATED
│   ├── sync/
│   │   ├── BulkSyncDialog.tsx             # NEW
│   │   └── BulkSyncProgress.tsx           # NEW
│   ├── diff/
│   │   ├── DiffViewerDialog.tsx           # NEW
│   │   ├── TemplateDiffView.tsx           # NEW
│   │   ├── StepDiffCard.tsx               # NEW
│   │   └── JsonDiffViewer.tsx             # NEW
│   ├── history/
│   │   ├── SyncHistoryPanel.tsx           # NEW
│   │   ├── SyncHistoryTable.tsx           # NEW
│   │   ├── SyncHistoryFilters.tsx         # NEW
│   │   └── SyncHistoryDetails.tsx         # NEW
│   └── common/
│       ├── ErrorDetails.tsx               # NEW
│       └── ErrorSuggestions.tsx           # NEW
├── utils/
│   ├── templateDiff.ts                    # NEW
│   ├── jsonDiff.ts                        # NEW
│   ├── errorParser.ts                     # NEW
│   └── errorSuggestions.ts                # NEW
└── types/
    ├── diff.ts                            # NEW
    └── history.ts                         # NEW
```

---

## 🎨 UI/UX Considerations

### Bulk Sync

- Show selection count in UI (e.g., "3 templates selected")
- Disable conflicting actions when templates selected
- Clear selection after sync or cancel
- Progress bars for each template in batch
- Allow cancellation mid-sync

### Diff Viewer

- Modal that takes up most of screen (90% width)
- Collapsible sections for better navigation
- Color coding: 🟢 additions, 🔴 deletions, 🟡 modifications
- Line numbers for reference
- Syntax highlighting for JSON

### Sync History

- Default to showing last 7 days
- Paginate if more than 50 entries
- Visual timeline for sync operations
- Status icons: ✅ success, ❌ failed, ⏭️ skipped
- Quick filters: Today, This Week, Failed Only

### Error Display

- Expandable error details
- Categorized by severity
- Include error codes if available
- Link to troubleshooting docs
- "Copy error details" button for support

---

## 🧪 Testing Strategy

### Bulk Sync Testing

- [ ] Select 2 templates, sync both
- [ ] Select 10 templates, sync all
- [ ] Mix of new, updates, and conflicts
- [ ] Cancel mid-sync
- [ ] Network failure during bulk sync
- [ ] One template fails, others succeed

### Diff Viewer Testing

- [ ] Templates with identical content
- [ ] Templates with version difference only
- [ ] Templates with step additions
- [ ] Templates with step deletions
- [ ] Templates with step modifications
- [ ] Templates with metadata changes
- [ ] Very large templates (10+ steps)

### Sync History Testing

- [ ] View empty history
- [ ] View history with 1 entry
- [ ] View history with 100+ entries
- [ ] Filter by date range
- [ ] Filter by status
- [ ] Export history as CSV
- [ ] Export history as JSON
- [ ] Retry failed sync
- [ ] Clear history

### Error Handling Testing

- [ ] Network timeout
- [ ] 401 Unauthorized
- [ ] 403 Forbidden
- [ ] 404 Not Found
- [ ] 500 Server Error
- [ ] Validation errors
- [ ] Dependency missing
- [ ] Concurrent modification

---

## 📊 Success Metrics

### Performance

- Bulk sync of 10 templates: < 30 seconds
- Diff viewer opens: < 500ms
- History UI loads 100 entries: < 1 second

### User Experience

- Bulk sync reduces time by 80% vs individual syncs
- Diff viewer reduces support questions by 50%
- History UI enables self-service troubleshooting

### Code Quality

- 0 TypeScript errors
- 0 linter warnings
- 90%+ test coverage for new utilities
- Comprehensive documentation

---

## 🚀 Rollout Strategy

### Phase 2a: Bulk Sync (Week 1)

- Deploy bulk sync feature
- Monitor usage and performance
- Gather user feedback
- Fix any issues

### Phase 2b: Diff Viewer (Week 2)

- Deploy diff viewer
- Create user guide with screenshots
- Collect feedback on diff accuracy
- Refine highlighting and formatting

### Phase 2c: History & Errors (Week 3)

- Deploy history UI and enhanced errors
- Train users on history features
- Document error resolution patterns
- Finalize Phase 2

---

## 📝 Documentation to Create

1. **BULK_SYNC_GUIDE.md** - How to use bulk sync effectively
2. **DIFF_VIEWER_GUIDE.md** - Understanding template differences
3. **SYNC_HISTORY_GUIDE.md** - Using sync history for troubleshooting
4. **ERROR_RESOLUTION.md** - Common errors and how to fix them
5. **PHASE_2_CHANGELOG.md** - All changes and new features

---

## 🔮 Future Considerations (Phase 3)

- Drift monitoring with automated alerts
- Scheduled sync jobs
- Template dependency validation
- Approval workflows for prod syncs
- Template versioning and rollback
- Audit logging to backend
- Real-time collaboration features

---

**Start Date**: December 9, 2024  
**Target Completion**: December 12, 2024  
**Status**: Planning Complete - Ready to Implement 🚀
