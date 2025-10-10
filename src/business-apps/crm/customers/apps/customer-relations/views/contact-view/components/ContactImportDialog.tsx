import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Alert,
  AlertDescription,
  Spinner,
  Card,
  Badge
} from '@newwork/nw-design-system';
import { Upload, DownloadSimple, X } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useContactImport } from '../hooks/useContactImport';
import { useContactCsvTemplate } from '../hooks/useContactCsvTemplate';

interface ContactImportDialogProps extends BusinessAppContextProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ContactImportDialog: React.FC<ContactImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
  ...context
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { downloadTemplate } = useContactCsvTemplate();
  const { progress, importResult, processImport, resetImport } = useContactImport(context);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const result = await processImport(selectedFile);
      
      if (result.successful > 0) {
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    resetImport();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-3xl" data-testid="contact-import-dialog">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import contacts. Download the template to see the expected format.
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Download Template Button */}
          <div className="gba:flex gba:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadTemplate}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="download-template-button"
            >
              <DownloadSimple className="gba:h-4 gba:w-4" />
              Download CSV Template
            </Button>
          </div>

          {/* File Upload Area */}
          {!selectedFile && progress.status === 'idle' && (
            <Card
              className={`gba:p-8 gba:border-2 gba:border-dashed gba:cursor-pointer gba:transition-colors ${
                dragActive ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-muted'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              data-testid="file-upload-area"
            >
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:text-center">
                <Upload className="gba:h-12 gba:w-12 gba:text-muted-foreground" />
                <div>
                  <p className="gba:text-sm gba:font-medium">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    Maximum file size: 5MB
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="gba:hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                data-testid="file-input"
              />
            </Card>
          )}

          {/* Selected File Info */}
          {selectedFile && progress.status === 'idle' && (
            <Card className="gba:p-4">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Upload className="gba:h-8 gba:w-8 gba:text-primary" />
                  <div>
                    <p className="gba:text-sm gba:font-medium">{selectedFile.name}</p>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  data-testid="remove-file-button"
                >
                  <X className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Progress Indicator */}
          {progress.status !== 'idle' && progress.status !== 'completed' && (
            <Alert data-testid="import-progress-alert">
              <Spinner className="gba:h-4 gba:w-4" />
              <AlertDescription>
                {progress.message} ({progress.progress}%)
              </AlertDescription>
            </Alert>
          )}

          {/* Import Results */}
          {progress.status === 'completed' && importResult && (
            <Alert variant="default" data-testid="import-results-alert">
              <AlertDescription>
                <div className="gba:space-y-2">
                  <p className="gba:font-medium">Import Completed</p>
                  <div className="gba:flex gba:gap-2">
                    <Badge variant="success">
                      {importResult.successful} Successful
                    </Badge>
                    {importResult.failed > 0 && (
                      <Badge variant="destructive">
                        {importResult.failed} Failed
                      </Badge>
                    )}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="gba:mt-2 gba:max-h-40 gba:overflow-y-auto">
                      <p className="gba:text-xs gba:font-medium gba:mb-1">Errors:</p>
                      {importResult.errors.slice(0, 5).map((err, idx) => (
                        <p key={idx} className="gba:text-xs gba:text-destructive">
                          Row {err.row}: {err.error}
                        </p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="gba:text-xs gba:text-muted-foreground">
                          ... and {importResult.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {progress.status === 'error' && (
            <Alert variant="destructive" data-testid="import-error-alert">
              <AlertDescription>{progress.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="cancel-import-button">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || progress.status !== 'idle'}
            data-testid="confirm-import-button"
          >
            {progress.status === 'uploading' ? (
              <>
                <Spinner className="gba:h-4 gba:w-4 gba:mr-2" />
                Importing...
              </>
            ) : (
              'Import Contacts'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

