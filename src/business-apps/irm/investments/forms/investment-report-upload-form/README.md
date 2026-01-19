# Investment Document Upload Form

A reusable React component for uploading investment documents to the NEWWORK platform. Designed to work with the platform's flow system for seamless integration.

## Features

- ✅ **Standalone Form**: Clean, standalone form without modal dependencies
- ✅ **Investment Selection**: Optional dropdown for selecting investments
- ✅ **File Upload**: Drag & drop support with file type validation
- ✅ **Progress Tracking**: Real-time upload progress indicators
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Internationalization**: Full i18n support with translations
- ✅ **Type Safety**: Complete TypeScript definitions
- ✅ **Reusable Hook**: Extracted upload logic for custom implementations
- ✅ **Flow Integration**: Works seamlessly with platform's AppAction flow system

## Basic Usage

### As Standalone Form

```typescript
import { InvestmentDocumentUploadForm } from '@/business-apps/crm/investments/forms/upload-investment-report-form';

const MyComponent = () => {
  return (
    <InvestmentDocumentUploadForm
      onSuccess={(fileIds) => {
        console.log('Uploaded files:', fileIds);
        setIsOpen(false);
      }}
      showInvestmentSelector={true}
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
    />
  );
};
```

### As Inline Form

```typescript
import { InvestmentDocumentUploadForm } from '@/business-apps/crm/investments/forms/investment-document-upload-form';

const MyComponent = () => {
  return (
    <div className="gba:p-6">
      <InvestmentDocumentUploadForm
        mode="inline"
        onSuccess={(fileIds) => {
          console.log('Uploaded files:', fileIds);
          // Handle success
        }}
        showInvestmentSelector={true}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
      />
    </div>
  );
};
```

### With Pre-selected Investment

```typescript
<InvestmentDocumentUploadForm
  investmentId="specific-investment-id"
  showInvestmentSelector={false} // Hide selector since investment is pre-selected
  onSuccess={(fileIds) => console.log('Uploaded:', fileIds)}
  accessToken={accessToken}
  userInfo={userInfo}
  additionalData={additionalData}
/>
```

## Props

### InvestmentDocumentUploadFormProps

| Prop                     | Type                          | Default         | Description                   |
| ------------------------ | ----------------------------- | --------------- | ----------------------------- |
| `onSuccess`              | `(fileIds: string[]) => void` | -               | Called when upload succeeds   |
| `onCancel`               | `() => void`                  | -               | Called when form is cancelled |
| `investmentId`           | `string`                      | -               | Pre-selected investment ID    |
| `showInvestmentSelector` | `boolean`                     | `true`          | Show investment dropdown      |
| `title`                  | `string`                      | Auto-translated | Custom form title             |
| `description`            | `string`                      | Auto-translated | Custom form description       |
| `maxFiles`               | `number`                      | `5`             | Maximum number of files       |
| `allowedFileTypes`       | `string[]`                    | PDF, DOC, etc.  | Allowed file extensions       |

Plus all `BusinessAppContextProps`:

- `accessToken` (required)
- `userInfo`
- `additionalData`

## Custom Hook Usage

For advanced use cases, you can use the underlying hook directly:

```typescript
import { useInvestmentFileUpload } from '@/business-apps/crm/investments/forms/investment-document-upload-form';

const MyCustomComponent = () => {
  const {
    uploadFiles,
    isUploading,
    uploadProgress,
    error,
    clearError
  } = useInvestmentFileUpload({
    accessToken,
    onSuccess: (fileIds) => console.log('Success:', fileIds),
    onError: (error) => console.error('Error:', error)
  });

  const handleUpload = async () => {
    const files = [/* File objects */];
    const investmentId = 'inv-123';
    await uploadFiles(files, investmentId);
  };

  return (
    <div>
      <button onClick={handleUpload} disabled={isUploading}>
        Upload Files
      </button>
      {uploadProgress && (
        <div>Progress: {uploadProgress.current}/{uploadProgress.total}</div>
      )}
      {error && <div>Error: {error}</div>}
    </div>
  );
};
```

## File Structure

The form uses the following folder structure for uploaded files:

```
/investment/{investmentId}/financial/fundPerformanceReport/
```

Where:

- `investmentId`: The selected investment's ID
- `financial`: Document group (camelCase alternativeCode from InvestmentDocumentGroup catalog)
- `fundPerformanceReport`: Document type (camelCase alternativeCode from InvestmentDocumentType catalog)

## File IDs

After successful upload, the form displays file IDs which can be used to reference the uploaded files:

**Response Structure:**

```typescript
{
  fileInfo: {
    fileId: "unique-file-identifier",  // This is the "table ID"
    fileMetadata: {
      originalFileName: "document.pdf",
      mimeType: "application/pdf"
    }
  }
}
```

**ID Extraction Priority:**

1. `response.fileInfo.fileId` (primary)
2. `response.fileId` (fallback)
3. `response.id` (fallback)
4. `FILE_${timestamp}_${index}` (generated fallback)

## Publishing

To publish this form as a standalone screen:

```bash
npm run publish:screen -- /crm/investments/forms/investment-document-upload-form
```

## Examples in Codebase

- **Modal Usage**: `src/business-apps/crm/investments/apps/investment-management/views/report-view/ReportView.tsx`
- **Component**: `src/business-apps/crm/investments/forms/investment-document-upload-form/InvestmentDocumentUploadForm.tsx`
- **Types**: `src/business-apps/crm/investments/forms/investment-document-upload-form/types.ts`
- **Upload Hook**: `src/business-apps/crm/investments/forms/investment-document-upload-form/hooks/useInvestmentFileUpload.ts`
