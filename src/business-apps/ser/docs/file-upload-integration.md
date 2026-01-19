# File Upload Integration for Service Desk & Service Portal

This document explains how to use the file upload functionality in dynamic forms for service requests.

## Overview

The file upload system follows the same pattern as the Investment Report Upload Form, with a two-phase process:
1. **File Upload Phase**: Files are uploaded to the file service and receive file IDs
2. **Form Submission Phase**: File metadata and IDs are included in the form payload

## Components

### 1. `useServiceFileUpload` Hook

Located: `src/business-apps/ser/hooks/useServiceFileUpload.ts`

```typescript
const { uploadFiles, isUploading, uploadProgress, error } = useServiceFileUpload({
  accessToken: 'your-access-token',
  onSuccess: (fileIds) => console.log('Uploaded files:', fileIds),
  onError: (error) => console.error('Upload failed:', error)
});
```

**Features:**
- Uploads files to `/service-requests/{requestId}/attachments` folder structure
- Supports multiple files with progress tracking
- Automatic error handling and validation
- Returns complete upload metadata

### 2. `FileUploadField` Component

Located: `src/business-apps/ser/components/FileUploadField.tsx`

```typescript
<FileUploadField
  name="attachments"
  showLabel={false} // Label is handled by the form
  value={files}
  onChange={setFiles}
  onUploadComplete={(uploadResults) => {
    // Handle upload completion
    console.log('Files uploaded:', uploadResults);
  }}
  required={true}
  maxFiles={5}
  allowedFileTypes={['.pdf', '.doc', '.docx', '.jpg', '.png']}
  maxFileSize={10} // MB
  accessToken={accessToken}
  requestId={requestId} // Optional: for existing requests
/>
```

## Usage in Flow Templates

### 1. Define FILE Field in Flow Template

```json
{
  "type": "FILE",
  "name": "supportingDocuments",
  "label": "Supporting Documents",
  "required": false,
  "description": "Upload any supporting documents for your request",
  "placeholder": "Select files to upload",
  "fileUpload": {
    "maxFiles": 3,
    "allowedFileTypes": [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"],
    "maxFileSize": 5
  }
}
```

### 2. Form Data Structure

When files are uploaded, the form data will contain:

```javascript
{
  // Regular form fields
  "requestTitle": "Need new laptop",
  "description": "My current laptop is broken",
  
  // File field (UI state)
  "supportingDocuments": [
    {
      "uid": "1234567890-0",
      "name": "laptop-issue.jpg",
      "status": "done",
      "originFileObj": File
    }
  ],
  
  // Upload results (for submission)
  "supportingDocuments_uploadResults": [
    {
      "fileId": "file-uuid-123",
      "fileName": "laptop-issue.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 1024000,
      "uploadResult": {
        "fileInfo": {
          "fileId": "file-uuid-123",
          "fileMetadata": {
            "originalFileName": "laptop-issue.jpg",
            "mimeType": "image/jpeg",
            "size": 1024000
          }
        }
      }
    }
  ]
}
```

### 3. Processing in Workflow Engine

The workflow engine receives the complete form data including file upload results:

```javascript
// In your workflow process
const formData = taskInput.formData;
const attachments = formData.supportingDocuments_uploadResults || [];

// Process attachments
attachments.forEach(attachment => {
  console.log('File ID:', attachment.fileId);
  console.log('File Name:', attachment.fileName);
  console.log('MIME Type:', attachment.mimeType);
});
```

## Integration Examples

### Example 1: IT Support Request

```json
{
  "name": "IT Support Request",
  "description": "Request IT support with file attachments",
  "steps": [
    {
      "type": "TASK",
      "title": "Submit Request",
      "form": [
        {
          "type": "TEXT",
          "name": "issueTitle",
          "label": "Issue Title",
          "required": true
        },
        {
          "type": "TEXTAREA",
          "name": "description",
          "label": "Description",
          "required": true
        },
        {
          "type": "FILE",
          "name": "screenshots",
          "label": "Screenshots or Documents",
          "required": false,
          "description": "Upload screenshots or relevant documents",
          "fileUpload": {
            "maxFiles": 5,
            "allowedFileTypes": [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"],
            "maxFileSize": 10
          }
        }
      ]
    }
  ]
}
```

### Example 2: Document Review Request

```json
{
  "type": "FILE",
  "name": "documentsToReview",
  "label": "Documents for Review",
  "required": true,
  "description": "Upload documents that need to be reviewed",
  "fileUpload": {
    "maxFiles": 10,
    "allowedFileTypes": [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"],
    "maxFileSize": 25
  }
}
```

## File Storage Structure

Files are stored in the following folder structure:

```
/service-requests/{requestId}/attachments/
├── file-uuid-1.pdf
├── file-uuid-2.jpg
└── file-uuid-3.docx
```

For new requests (before requestId is available):
```
/service-requests/temp/{timestamp}/
├── file-uuid-1.pdf
└── file-uuid-2.jpg
```

## Error Handling

### File Validation Errors
- File size exceeds limit
- File type not allowed
- Too many files selected

### Upload Errors
- Network connectivity issues
- Authentication failures
- Server-side errors

### Form Validation
- Required file fields not filled
- Files selected but not uploaded

## Best Practices

### 1. File Size Limits
- Keep `maxFileSize` reasonable (5-25MB)
- Consider your users' upload bandwidth
- Provide clear size limit messaging

### 2. File Types
- Be specific about allowed file types
- Include common formats users expect
- Consider security implications

### 3. User Experience
- Show upload progress for large files
- Provide clear error messages
- Allow file removal before upload
- Indicate required vs optional file fields

### 4. Performance
- Upload files before form submission
- Show loading states during upload
- Handle upload failures gracefully

## API Integration

### File Service Endpoint
```
POST {FILES_ENDPOINT}/tenant/files?appName=serviceDesk&folderPath={path}&mimeType={type}
```

### Headers
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

### Response
```json
{
  "fileInfo": {
    "fileId": "uuid-string",
    "fileMetadata": {
      "originalFileName": "document.pdf",
      "mimeType": "application/pdf",
      "size": 1024000
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Files not uploading**
   - Check `accessToken` is provided
   - Verify `FILES_ENDPOINT` environment variable
   - Check network connectivity

2. **File validation failures**
   - Verify file size is within limits
   - Check file extension is in `allowedFileTypes`
   - Ensure file is not corrupted

3. **Form submission without files**
   - Files must be uploaded before form submission
   - Check `{fieldName}_uploadResults` exists in form data
   - Verify upload completion callback is working

### Debug Information

Enable console logging to see detailed upload information:
```javascript
// Upload process logs
console.log('Uploading service file: filename to endpoint');
console.log('Using folder structure: /service-requests/...');
console.log('Service file uploaded successfully:', result);
```

## Migration from Old File Upload

If you have existing file upload implementations, follow these steps:

1. Replace old file upload components with `FileUploadField`
2. Update form field definitions to use `type: "FILE"`
3. Add `fileUpload` configuration options
4. Update form submission handlers to process `_uploadResults` fields
5. Test file upload and form submission flow

## Security Considerations

- Files are uploaded to tenant-specific storage
- Access tokens are required for all uploads
- File type validation prevents malicious uploads
- File size limits prevent abuse
- Folder structure isolates request attachments
