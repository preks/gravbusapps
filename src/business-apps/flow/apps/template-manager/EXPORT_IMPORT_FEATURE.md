# Template Export/Import Feature

## Overview

We've come full circle! 😄 The Template Manager now includes the basic backup/restore functionality that sparked this whole project. While we built a sophisticated instance-to-instance sync system, the simple export/import feature is still valuable for offline backups, version control, and template sharing.

---

## ✨ Features Implemented

### 1. **Export Template (Backup)**

- Download any template as a JSON file
- One-click export from the comparison table
- Includes complete template definition (name, steps, metadata)
- Auto-generated filenames with template name and timestamp

### 2. **Import Template (Restore)**

- Upload JSON template files
- Select target instance for import
- Validation of template structure
- Success/error feedback with clear messages

---

## 🎯 User Interface

### **Export Button**

Located in the comparison table actions column:

```
| Template Name | ... | Actions                    |
|---------------|-----|----------------------------|
| My Template   | ... | [⬇] [Diff] [Sync →]      |
```

**Button**: Download icon (ghost button)
**Location**: First action button (leftmost)
**Tooltip**: "Export template to JSON file"

### **Import Button**

Located in the comparison dashboard header:

```
┌────────────────────────────────────────┐
│ Source Instance → Target Instance      │
│ [Import Template] [Compare Templates]  │
└────────────────────────────────────────┘
```

**Button**: Upload icon with "Import Template" text
**Location**: Left of "Compare Templates" button

---

## 🔄 Workflows

### **Export Workflow**

1. Compare templates between two instances
2. Click the **Download icon** (⬇) on any template row
3. Template is downloaded as JSON file
4. File format: `template-{name}-{timestamp}.json`

### **Import Workflow**

1. Click **"Import Template"** button
2. **Upload JSON file** (drag & drop or click to browse)
3. **Select target instance** from dropdown
4. Click **"Import Template"** to confirm
5. Success message shows template name
6. Comparison refreshes automatically after 2 seconds

---

## 📦 File Format

### **Exported JSON Structure**

```json
{
  "name": "Employee Onboarding",
  "description": "Workflow for new employee onboarding",
  "version": 3,
  "steps": [...],
  "metadata": {...},
  "isDraft": false
}
```

**Required Fields**: `name`, `steps`
**Optional Fields**: `description`, `version`, `metadata`, `isDraft`

---

## 🔍 Validation

### **Import Validation**

- ✅ File must be valid JSON
- ✅ Must contain `name` field
- ✅ Must contain `steps` array
- ❌ Rejects non-JSON files
- ❌ Rejects malformed JSON

### **Error Messages**

- **File not JSON**: "Please select a valid JSON file"
- **Missing fields**: "Invalid template file: Missing required fields (name, steps)"
- **Target not selected**: "Please select both a file and target instance"

---

## 🎨 Components Created

### **TemplateExportImport.tsx** (~250 lines)

Main component handling both export and import functionality:

**Key Functions**:

- `TemplateExportImport` - React component for Import button and dialog
- `exportTemplateToJson` - Standalone function for exporting templates

**Features**:

- File upload with validation
- Instance selection dropdown
- Success/error alerts
- Auto-refresh after import

---

## 🔌 Integration Points

### **ComparisonDashboard**

```typescript
// Import button in header
<TemplateExportImport
  instances={instances}
  accessToken={context.accessToken}
  onImportSuccess={() => handleCompare()}
/>

// Export handler for table rows
const handleExport = async (comparison: TemplateComparison) => {
  await exportTemplateToJson(
    comparison.templateId,
    comparison.name,
    instance,
    context.accessToken
  )
}
```

### **TemplateComparisonTable**

```typescript
// Export button in actions column
{onExportClick && (
  <Button
    size="sm"
    variant="ghost"
    onClick={() => onExportClick(comparison)}
  >
    <Download className="gba:h-4 gba:w-4" />
  </Button>
)}
```

---

## 💡 Use Cases

### 1. **Backup & Restore**

- Export production templates before making changes
- Keep offline backups of critical workflows
- Restore templates after testing

### 2. **Version Control**

- Commit template JSON files to Git
- Track changes over time
- Review diffs in pull requests
- Rollback to previous versions

### 3. **Template Sharing**

- Export templates from one tenant
- Share via email or file transfer
- Import into another tenant
- Distribute template libraries

### 4. **Development Workflow**

- Export from DEV environment
- Test modifications locally
- Import into STAGING for QA
- Promote to PROD after approval

### 5. **Documentation**

- Include template JSON in documentation
- Share examples with team members
- Create template repositories

---

## 🎯 Benefits

| Feature          | Benefit                                         |
| ---------------- | ----------------------------------------------- |
| **Export**       | Quick backups without instance-to-instance sync |
| **Import**       | Restore from local files or Git                 |
| **JSON Format**  | Human-readable, version-control friendly        |
| **Validation**   | Prevents importing invalid templates            |
| **Auto-refresh** | Immediate feedback after import                 |
| **Simple UI**    | One-click export, guided import dialog          |

---

## 🔐 Security Considerations

### **API Keys**

- Uses instance API key or user access token
- No API keys stored in exported files
- Authentication required for both export and import

### **Validation**

- JSON structure validation before import
- Required fields checked
- Error messages don't expose sensitive data

---

## 🧪 Testing Checklist

- [x] Export template from source instance
- [x] Download creates valid JSON file
- [x] JSON file contains complete template definition
- [x] Import dialog opens
- [x] File upload validates JSON format
- [x] Instance dropdown shows all instances
- [x] Import with valid file succeeds
- [x] Import with invalid JSON shows error
- [x] Import with missing fields shows error
- [x] Success message displays template name
- [x] Comparison refreshes after import
- [x] Export/Import works across instances
- [x] Export works for templates with different statuses

---

## 📚 Examples

### **Export Example**

```typescript
// User clicks Download button
exportTemplateToJson('template-123', 'Employee Onboarding', sourceInstance, accessToken)

// Downloaded file: template-employee-onboarding-1703087234567.json
```

### **Import Example**

```typescript
// User uploads file and selects target
handleImport({
  file: template - employee - onboarding.json,
  targetInstanceId: 'instance:flow:staging'
})

// Template imported to staging instance
// Success: "Template 'Employee Onboarding' imported successfully!"
```

---

## 🎉 Summary

The Export/Import feature provides a simple, reliable way to backup and restore templates. Combined with the instance-to-instance sync, users now have:

1. **Sync**: Real-time comparison and synchronization between live instances
2. **Export**: Local backups as JSON files
3. **Import**: Restore from local files or version control

**Full circle from the original requirement!** 🎊
