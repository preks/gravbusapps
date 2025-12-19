/**
 * TemplateExportImport Component
 * Handles export and import of flow templates as JSON files
 */

import React, { useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Alert,
  AlertDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label
} from '@newwork/nw-design-system'
import { Upload, FileJson, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { FlowEngineInstance } from '../../types/instance'
import { templateApi } from '../../services/templateApi'

interface TemplateExportImportProps {
  instances: FlowEngineInstance[]
  accessToken: string
  onImportSuccess?: () => void
}

export const TemplateExportImport: React.FC<TemplateExportImportProps> = ({
  instances,
  accessToken,
  onImportSuccess
}) => {
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [targetInstanceId, setTargetInstanceId] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    setShowImportDialog(true)
    setSelectedFile(null)
    setTargetInstanceId('')
    setImportSuccess(null)
    setImportError(null)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file)
        setImportError(null)
      } else {
        setImportError('Please select a valid JSON file')
        setSelectedFile(null)
      }
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !targetInstanceId) {
      setImportError('Please select both a file and target instance')
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      // Read the file
      const fileContent = await selectedFile.text()
      const templateData = JSON.parse(fileContent)

      // Validate template structure
      if (!templateData.name || !templateData.steps) {
        throw new Error('Invalid template file: Missing required fields (name, steps)')
      }

      // Get target instance
      const targetInstance = instances.find(i => i.id === targetInstanceId)
      if (!targetInstance) {
        throw new Error('Target instance not found')
      }

      // Import the template
      const authToken = targetInstance.apiKey || accessToken
      await templateApi.createOrUpdateTemplate(targetInstance.baseUrl, templateData, authToken)

      setImportSuccess(`Template "${templateData.name}" imported successfully!`)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Notify parent to refresh
      setTimeout(() => {
        onImportSuccess?.()
        setShowImportDialog(false)
      }, 2000)
    } catch (err) {
      console.error('Import failed:', err)
      setImportError(err instanceof Error ? err.message : 'Failed to import template')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleImportClick} data-testid="template-import-button">
        <Upload className="gba:h-4 gba:w-4 gba:mr-2" />
        Import Template
      </Button>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="gba:max-w-md">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <FileJson className="gba:h-5 gba:w-5" />
              Import Template
            </DialogTitle>
            <DialogDescription>
              Upload a JSON template file and select the target instance where it should be imported.
            </DialogDescription>
          </DialogHeader>

          <div className="gba:space-y-4 gba:py-4">
            {/* File Upload */}
            <div className="gba:space-y-2">
              <Label htmlFor="template-file">Template File (JSON)</Label>
              <input
                ref={fileInputRef}
                id="template-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="gba:block gba:w-full gba:text-sm gba:file:mr-4 gba:file:py-2 gba:file:px-4 gba:file:rounded gba:file:border-0 gba:file:text-sm gba:file:font-medium gba:file:bg-primary gba:file:text-primary-foreground hover:gba:file:bg-primary/90 gba:file:cursor-pointer"
                disabled={isImporting}
              />
              {selectedFile && (
                <p className="gba:text-sm gba:text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Target Instance */}
            <div className="gba:space-y-2">
              <Label htmlFor="target-instance">Target Instance</Label>
              <Select value={targetInstanceId} onValueChange={setTargetInstanceId} disabled={isImporting}>
                <SelectTrigger id="target-instance">
                  <SelectValue placeholder="Select instance..." />
                </SelectTrigger>
                <SelectContent>
                  {instances.map(instance => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.icon} {instance.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Success Message */}
            {importSuccess && (
              <Alert className="gba:border-success gba:bg-success-secondary">
                <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-success" />
                <AlertDescription>{importSuccess}</AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {importError && (
              <Alert variant="destructive">
                <AlertCircle className="gba:h-4 gba:w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || !targetInstanceId || isImporting}
              data-testid="template-import-confirm"
            >
              {isImporting ? (
                <>
                  <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="gba:mr-2 gba:h-4 gba:w-4" />
                  Import Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Export a template to JSON file
 */
export const exportTemplateToJson = async (
  templateId: string,
  templateName: string,
  instance: FlowEngineInstance,
  accessToken: string
) => {
  try {
    const authToken = instance.apiKey || accessToken
    const template = await templateApi.getTemplateById(instance.baseUrl, templateId, authToken)

    // Create JSON blob
    const dataStr = JSON.stringify(template, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    // Trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = `template-${templateName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`
    link.click()

    // Cleanup
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export failed:', err)
    throw err
  }
}
