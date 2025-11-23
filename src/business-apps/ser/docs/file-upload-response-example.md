# File Upload Response Processing Example

## Raw NEWWORK File Service Response

Based on the actual response from [https://newwork-dev.newwork.com/files/api/v1/tenant/files](https://newwork-dev.newwork.com/files/api/v1/tenant/files):

```json
{
  "fileInfo": {
    "appName": "serviceDesk",
    "fileId": "cf2cd92f-a53e-437f-9517-7d2d7b12102e.png",
    "folderPath": "/service-requests/temp/1759764756135",
    "accessScope": "tenant",
    "path": "/api/v1/tenant/downloads/serviceDesk/service-requests/temp/1759764756135/cf2cd92f-a53e-437f-9517-7d2d7b12102e.png",
    "fileMetadata": {
      "mimeType": "image/png",
      "originalFileName": "Screenshot_38.png",
      "keyValues": [],
      "updatedAt": "2025-10-06T15:32:37.321816065Z"
    },
    "uploadedAt": "2025-10-06T15:32:37.537195038Z"
  }
}
```

## Processed Upload Results

After processing through `serializeUploadResults()`, the form data will contain:

```json
{
  "field5_uploadResults": [
    {
      "fileId": "cf2cd92f-a53e-437f-9517-7d2d7b12102e.png",
      "fileName": "Screenshot_38.png",
      "mimeType": "image/png",
      "fileSize": null,
      "uploadTimestamp": "2025-10-06T15:32:37.537195038Z",
      "folderPath": "/service-requests/temp/1759764756135",
      "downloadPath": "/api/v1/tenant/downloads/serviceDesk/service-requests/temp/1759764756135/cf2cd92f-a53e-437f-9517-7d2d7b12102e.png",
      "appName": "serviceDesk",
      "accessScope": "tenant",
      "summary": "Screenshot_38.png",
      "_debug": {
        "originalResponse": "{\n  \"fileInfo\": {\n    \"appName\": \"serviceDesk\",\n    \"fileId\": \"cf2cd92f-a53e-437f-9517-7d2d7b12102e.png\",\n    ...\n  }\n}",
        "parsedAt": "2025-10-06T15:32:38.000Z"
      }
    }
  ]
}
```

## Key Improvements

### ✅ **No More `[object Object]`**
- Upload results are now properly serialized
- All nested objects are flattened into readable properties
- Original response is preserved as stringified JSON in `_debug`

### 🎯 **Structured Data**
- **`fileId`**: Unique identifier for the uploaded file
- **`fileName`**: Original filename from user
- **`downloadPath`**: Full path to download the file
- **`folderPath`**: Organized folder structure
- **`uploadTimestamp`**: When the file was uploaded
- **`summary`**: Human-readable description

### 🔍 **Debug Information**
- **`_debug.originalResponse`**: Complete original response as JSON string
- **`_debug.parsedAt`**: When the processing occurred

## Console Logs You'll See

When uploading a file, you'll see these debug logs:

```
🔍 [RequestForm] Raw upload results: [{ fileInfo: { ... } }]
🔍 [FileUploadUtils] Processing upload result 0: { fileInfo: { ... } }
🔍 [FileUploadUtils] Processed result 0: { fileId: "cf2cd92f...", fileName: "Screenshot_38.png", ... }
🔍 [RequestForm] Serialized upload results: [{ fileId: "cf2cd92f...", ... }]
🔍 [RequestForm] Serialized as JSON: { "fileId": "cf2cd92f...", ... }
🔍 [RequestForm] Complete form data before submission: { field5_uploadResults: [...], ... }
```

## Workflow Engine Processing

In your workflow engine, you can now access the file information like this:

```javascript
// Access the upload results
const uploadResults = formData.field5_uploadResults;

if (uploadResults && uploadResults.length > 0) {
  uploadResults.forEach(file => {
    console.log('File ID:', file.fileId);
    console.log('File Name:', file.fileName);
    console.log('Download Path:', file.downloadPath);
    console.log('MIME Type:', file.mimeType);
    console.log('Upload Time:', file.uploadTimestamp);
    console.log('Summary:', file.summary);
  });
}
```

## File Download URL

To download the uploaded file, use the `downloadPath`:

```
https://newwork-dev.newwork.com/files/api/v1/tenant/downloads/serviceDesk/service-requests/temp/1759764756135/cf2cd92f-a53e-437f-9517-7d2d7b12102e.png
```

## Notes

- **File Size**: The NEWWORK file service doesn't return file size in the response, so it will be `null`
- **Temporary Folder**: Files uploaded before form submission go to `/service-requests/temp/{timestamp}`
- **Final Folder**: After form submission, files should be moved to `/service-requests/{requestId}/attachments`
- **File ID Format**: Uses UUID format with file extension: `{uuid}.{ext}`
