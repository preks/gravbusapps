import {
  FileUpload,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Spinner
} from '@newwork/nw-design-system'

interface EmployeeDocumentUploadFieldProps {
  label: string
  name?: string
  isLoading?: boolean
  isResolvingInitialDocuments?: boolean
  hasExistingDocumentHint?: boolean
  hasInitialDocumentCandidates?: boolean
  loadingMessage?: string
  initialFiles?: Array<{ id: string; name: string; size?: number; type?: string; url?: string }>
  /** Called when the selected files change (wired to design-system FileUpload `onChange`). */
  onFilesChange: (files: any[]) => void
  accept: string
  maxFiles?: number
  multiple?: boolean
  dataTestId: string
}

function normalizeInitialFiles(
  files: Array<{ id: string; name: string; size?: number; type?: string; url?: string }>
): Array<{ id: string; name: string; size: number; type: string; url: string }> {
  return files.map(file => ({
    id: file.id,
    name: file.name,
    size: Number(file.size || 0),
    type: file.type || '',
    url: file.url || ''
  }))
}

export function EmployeeDocumentUploadField(props: Readonly<EmployeeDocumentUploadFieldProps>) {
  const {
    label,
    name = 'employeeDocumentUpload',
    isLoading = false,
    isResolvingInitialDocuments = false,
    hasExistingDocumentHint = false,
    hasInitialDocumentCandidates = false,
    loadingMessage = 'Loading document...',
    initialFiles = [],
    onFilesChange,
    accept,
    maxFiles = 1,
    multiple = false,
    dataTestId
  } = props
  const shouldShowLoading =
    (hasExistingDocumentHint || hasInitialDocumentCandidates) && (isResolvingInitialDocuments || isLoading)

  return (
    <FormField
      name={name}
      render={() => (
        <FormItem>
          <FormLabel className="gba:text-sm gba:font-medium gba:text-foreground">{label}</FormLabel>
          <FormControl>
            {shouldShowLoading ? (
              <div
                className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:min-h-20 gba:px-4 gba:rounded-md gba:border gba:border-border gba:bg-muted/30"
                data-testid={`${dataTestId}-loading`}
              >
                <Spinner size="sm" />
                <span className="gba:text-sm gba:text-muted-foreground">{loadingMessage}</span>
              </div>
            ) : (
              <div className="gba:min-w-0 gba:[&_span]:gba:whitespace-normal gba:[&_span]:gba:break-all gba:[&_p]:gba:whitespace-normal gba:[&_p]:gba:break-all">
                <FileUpload
                  multiple={multiple}
                  maxFiles={maxFiles}
                  accept={accept}
                  layout="list"
                  preview="icon"
                  initialFiles={normalizeInitialFiles(initialFiles)}
                  onChange={onFilesChange}
                  data-testid={dataTestId}
                />
              </div>
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
