/**
 * Shared preview types for DocumentFolderUploadPopup.
 *
 * The popup itself lives in {@link ./DocumentFolderUploadPopup}.  IRM and CRM
 * render thin wrappers around it (see
 * `src/business-apps/irm/core/popups/document-folder-upload-popup`
 * and `src/business-apps/crm/core/popups/document-folder-upload-popup`).
 */

export interface PreviewTreeNode {
  readonly name: string
  readonly isFolder: boolean
  readonly size: number
  readonly children: PreviewTreeNode[]
}

export interface PreviewRow {
  readonly path: string
  readonly name: string
  readonly isFolder: boolean
  readonly depth: number
  readonly size: number
}

export interface FolderSelectionSummary {
  readonly fileCount: number
  readonly totalBytes: number
  readonly rootName: string
}
