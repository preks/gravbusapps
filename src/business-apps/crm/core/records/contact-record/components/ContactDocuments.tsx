import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Spinner, Alert, Badge, Button } from '@newwork/nw-design-system'
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
  EyeOutlined,
  CaretRightOutlined,
  AppstoreOutlined,
  BarsOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  FolderAddOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { Modal, message, Input as AntdInput } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { DataContainer } from '@/components/layout/dataContainer'
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData'
import { startProcess } from '@/common/utils/start-process'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable
} from '@dnd-kit/core'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface Document {
  id: string
  version: number
  name?: string | null
  createdAt: string
  expirationDate?: string | null
  documentType?: {
    id: string
    value: string
    code?: string
  } | null
  documentGroup?: {
    id: string
    value: string
    code?: string
  } | null
  file?: string | null
  mimeType?: string | null
  fileSize?: number
  createdBy?: string | null
  format?: string | null
  parentDocument?: string | null
}

interface DocumentFolder {
  name: string
  count: number
  documents: Document[]
  folderId?: string
  folderVersion?: number
  children?: DocumentFolder[]
}

interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  disabled?: boolean
}

interface FilterOption {
  id: string
  label: string
  selected: boolean
  value: any
}

interface FilterGroup {
  id: string
  title: string
  filters: FilterOption[]
  searchTerm?: string
  backendSearch?: (search: string) => { filters: FilterOption[]; loading: boolean; error: any }
}

interface ContactDocumentsProps {
  contactId: string
  context: BusinessAppContextProps
}

export const ContactDocuments: React.FC<ContactDocumentsProps> = ({ contactId, context }) => {
  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [renameModal, setRenameModal] = useState<{ open: boolean; node?: DocumentFolder; name: string }>({
    open: false,
    name: ''
  })
  const [activeDragItem, setActiveDragItem] = useState<{
    itemType: 'document' | 'folder'
    name: string
    mimeType?: string | null
  } | null>(null)

  // Column configuration with default visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: 'name', label: 'Name', visible: true, disabled: true }, // Always visible
    { id: 'group', label: 'Group', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'size', label: 'Size', visible: true },
    { id: 'uploadDate', label: 'Upload Date', visible: true },
    { id: 'expirationDate', label: 'Expiration Date', visible: false },
    { id: 'uploadedBy', label: 'Uploaded By', visible: true },
    { id: 'actions', label: 'Actions', visible: true, disabled: true } // Always visible
  ])

  const graphQLClient = useGraphQLClient(context.accessToken)
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken)

  const openRenameFolder = (node: DocumentFolder) => {
    setRenameModal({ open: true, node, name: node.name })
  }

  const confirmRenameFolder = async () => {
    const newName = renameModal.name?.trim()
    const node = renameModal.node
    if (!node || !newName) {
      message.error('Please enter a folder name')
      return
    }
    // Mock rename
    if (node.folderId?.startsWith('mock-')) {
      setDocuments(prev => prev.map(d => (d.id === node.folderId ? { ...d, name: newName } : d)))
      setRenameModal({ open: false, name: '', node: undefined })
      message.success('Folder renamed (mock)')
      return
    }
    try {
      await restClient.post(
        '/customer-relations/saveCrmDocument',
        {
          changeMode: 'UPDATE',
          crmDocument: {
            id: node.folderId,
            version: node.folderVersion,
            name: newName,
            contact: contactId
          }
        },
        { headers: { Authorization: `Bearer ${context.accessToken}` } }
      )
      message.success('Folder renamed')
      setRenameModal({ open: false, name: '', node: undefined })
      await fetchDocuments()
    } catch (e: any) {
      console.error('Error renaming folder', e)
      message.error(e?.message || 'Failed to rename folder')
    }
  }

  const openEditDocument = (doc: Document) => {
    startProcess({
      domain: 'customer-relations',
      processName: 'saveCrmDocument',
      payload: {
        contactId,
        crmDocument: {
          id: doc.id,
          version: doc.version,
          name: doc.name,
          documentGroupRef: doc.documentGroup?.id,
          documentTypeRef: doc.documentType?.id,
          parentDocument: doc.parentDocument || undefined
        }
      },
      builderType: 'NATIVE_SCREEN'
    })
  }

  // Compute visible columns
  const visibleColumns = useMemo(() => {
    return columnConfig.filter(column => column.visible).map(column => column.id)
  }, [columnConfig])

  // Column visibility helper
  const isColumnVisible = useCallback(
    (columnId: string) => {
      return visibleColumns.includes(columnId)
    },
    [visibleColumns]
  )

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
  }, [])

  // Handle filter changes
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev => {
      if (selected) {
        return [...prev, filterId]
      } else {
        return prev.filter(id => id !== filterId)
      }
    })
  }, [])

  // Create filter groups from documents
  const filterGroups = useMemo((): FilterGroup[] => {
    if (!documents.length) return []

    // Get unique document types
    const documentTypes = Array.from(
      new Set(documents.filter(doc => doc.documentType?.value).map(doc => doc.documentType?.value))
    ).map(type => ({
      id: `doctype-${type!}`,
      label: type!,
      selected: selectedFilters.includes(`doctype-${type!}`),
      value: type!
    }))

    // Get unique document groups
    const documentGroups = Array.from(
      new Set(documents.filter(doc => doc.documentGroup?.value).map(doc => doc.documentGroup?.value))
    ).map(group => ({
      id: `docgroup-${group!}`,
      label: group!,
      selected: selectedFilters.includes(`docgroup-${group!}`),
      value: group!
    }))

    // Get unique file types (mime types)
    const fileTypes = Array.from(
      new Set(
        documents
          .filter(doc => doc.mimeType)
          .map(doc => {
            const mainType = doc.mimeType?.split('/')[0]
            return mainType?.toUpperCase()
          })
          .filter(Boolean)
      )
    ).map(type => ({
      id: `filetype-${type!}`,
      label: type!,
      selected: selectedFilters.includes(`filetype-${type!}`),
      value: type!
    }))

    // Get unique uploaders
    const uploaders = Array.from(new Set(documents.filter(doc => doc.createdBy).map(doc => doc.createdBy))).map(
      uploaderId => {
        const displayName = getEmployeeDisplayName(uploaderId!) || 'Unknown'
        return {
          id: `uploader-${uploaderId!}`,
          label: displayName,
          selected: selectedFilters.includes(`uploader-${uploaderId!}`),
          value: uploaderId!
        }
      }
    )

    return [
      {
        id: 'documentType',
        title: 'Document Type',
        filters: documentTypes
      },
      {
        id: 'documentGroup',
        title: 'Document Group',
        filters: documentGroups
      },
      {
        id: 'fileType',
        title: 'File Type',
        filters: fileTypes
      },
      {
        id: 'uploadedBy',
        title: 'Uploaded By',
        filters: uploaders
      }
    ]
  }, [documents, selectedFilters, getEmployeeDisplayName])

  // Apply filters to documents for enhanced List View
  const documentsWithFilters = useMemo(() => {
    let filtered = documents

    // Apply search filter
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase()
      filtered = filtered.filter(
        doc =>
          doc.name?.toLowerCase().includes(search) ||
          doc.documentType?.value?.toLowerCase().includes(search) ||
          doc.documentGroup?.value?.toLowerCase().includes(search)
      )
    }

    // Apply selected filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(doc => {
        // Check if document matches any of the selected filters
        const matchesDocType = selectedFilters.some(
          filterId => filterId.startsWith('doctype-') && filterId === `doctype-${doc.documentType?.value}`
        )
        const matchesDocGroup = selectedFilters.some(
          filterId => filterId.startsWith('docgroup-') && filterId === `docgroup-${doc.documentGroup?.value}`
        )
        const matchesFileType = selectedFilters.some(filterId => {
          const mainType = doc.mimeType?.split('/')[0]?.toUpperCase()
          return filterId.startsWith('filetype-') && filterId === `filetype-${mainType}`
        })
        const matchesUploader = selectedFilters.some(
          filterId => filterId.startsWith('uploader-') && filterId === `uploader-${doc.createdBy}`
        )

        // Document matches if it matches any selected filter from each active filter group
        const hasDocTypeFilters = selectedFilters.some(f => f.startsWith('doctype-'))
        const hasDocGroupFilters = selectedFilters.some(f => f.startsWith('docgroup-'))
        const hasFileTypeFilters = selectedFilters.some(f => f.startsWith('filetype-'))
        const hasUploaderFilters = selectedFilters.some(f => f.startsWith('uploader-'))

        return (
          (!hasDocTypeFilters || matchesDocType) &&
          (!hasDocGroupFilters || matchesDocGroup) &&
          (!hasFileTypeFilters || matchesFileType) &&
          (!hasUploaderFilters || matchesUploader)
        )
      })
    }

    return filtered
  }, [documents, searchQuery, selectedFilters])

  const fetchDocuments = async () => {
    if (!contactId || !context.accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const GET_CONTACT_DOCUMENTS = `
        query GetContactDocuments($contactId: uuid!) {
          CrmDocument(where: {contact: {id: {_eq: $contactId}}, isDeleted: {_eq: false}}) {
            id
            version
            name
            createdAt
            expirationDate
            format
            parentDocument { id }
            documentType {
              id
              value
              code
            }
            documentGroup {
              id
              value
              code
            }
            file
            mimeType
            fileSize
            createdBy
          }
        }
      `

      const result = await graphQLClient.request<{ CrmDocument: any[] }>(GET_CONTACT_DOCUMENTS, { contactId })

      const raw = Array.isArray(result?.CrmDocument) ? result.CrmDocument : []
      const mapped: Document[] = raw.map((d: any) => ({
        ...d,
        parentDocument: d?.parentDocument?.id ?? null
      }))
      setDocuments(mapped)
    } catch (err) {
      console.error('Error fetching contact documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [contactId, context.accessToken])

  // Listen for process completion to refetch documents after upload
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed, refreshing contact documents')
      fetchDocuments()
    },
    onFailure: () => {
      console.log('Document upload process failed')
    }
  })

  // Column Visibility Dropdown Component
  const ColumnVisibilityDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <div className="gba:relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gba:flex gba:items-center gba:gap-2"
          data-testid="column-visibility-dropdown"
        >
          <SettingOutlined />
          <span className="gba:text-sm">Columns</span>
        </Button>
        {isOpen && (
          <div className="gba:absolute gba:top-full gba:right-0 gba:mt-1 gba:bg-hsl(var(--background)) gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg gba:p-2 gba:min-w-[200px] gba:z-50">
            {columnConfig.map(column => (
              <label
                key={column.id}
                className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:hover:bg-gray-50 gba:cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={column.visible}
                  disabled={column.disabled}
                  onChange={e => handleColumnVisibilityChange(column.id, e.target.checked)}
                  className="gba:rounded"
                />
                <span className="gba:text-sm">{column.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return <FileOutlined />

    if (mimeType.includes('pdf')) return <FilePdfOutlined />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileWordOutlined />
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return <FileExcelOutlined />
    if (mimeType.includes('image')) return <FileImageOutlined />
    return <FileTextOutlined />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `${dateStr}, ${timeStr}`
  }

  const filteredDocuments = Array.isArray(documents)
    ? documents.filter(
        doc =>
          !searchQuery ||
          (doc.name && doc.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (doc.documentType?.value && doc.documentType.value.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (doc.createdBy && getEmployeeDisplayName(doc.createdBy)?.toLowerCase()?.includes(searchQuery.toLowerCase()))
      )
    : []

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) newExpanded.delete(folderId)
    else newExpanded.add(folderId)
    setExpandedFolders(newExpanded)
  }

  const documentFolders: DocumentFolder[] = useMemo(() => {
    const allDocs = Array.isArray(documents) ? documents : []
    const allFolders = allDocs.filter(d => {
      const fmt = (d.format || '').toUpperCase()
      const looksLikeFile = fmt === 'FILE' || !!d.mimeType || !!d.file
      return !looksLikeFile
    })
    const docsForFilter = Array.isArray(filteredDocuments) ? filteredDocuments : []

    const foldersById: Record<string, Document> = {}
    for (const f of allFolders) foldersById[f.id] = f

    const docsByFolder: Record<string, Document[]> = {}
    for (const doc of docsForFilter) {
      if ((doc.format || '').toUpperCase() === 'FILE' && doc.parentDocument) {
        if (!docsByFolder[doc.parentDocument]) docsByFolder[doc.parentDocument] = []
        docsByFolder[doc.parentDocument].push(doc)
      }
    }

    const folderNodeCache: Record<string, DocumentFolder> = {}
    const buildNode = (f: Document): DocumentFolder => {
      if (folderNodeCache[f.id]) return folderNodeCache[f.id]
      const node: DocumentFolder = {
        name: f.name || 'Unnamed Folder',
        count: docsByFolder[f.id]?.length || 0,
        documents: docsByFolder[f.id] || [],
        folderId: f.id,
        folderVersion: f.version,
        children: []
      }
      folderNodeCache[f.id] = node
      const childFolders = allFolders.filter(cf => cf.parentDocument === f.id)
      node.children = childFolders.map(cf => buildNode(cf))
      return node
    }

    const rootFolders = allFolders.filter(f => !f.parentDocument)
    return rootFolders.map(buildNode)
  }, [documents, filteredDocuments])

  const rootLevelFiles: Document[] = useMemo(() => {
    const docsForFilter = Array.isArray(filteredDocuments) ? filteredDocuments : []
    return docsForFilter.filter(d => {
      const fmt = (d.format || '').toUpperCase()
      const isFile = fmt === 'FILE' || !!d.mimeType || !!d.file
      return isFile && !d.parentDocument
    })
  }, [filteredDocuments])

  const getFileExtension = (document: Document) => {
    // Try to get extension from file name first
    if (document.name && document.name.includes('.')) {
      return document.name.split('.').pop()
    }

    // Fallback to mimeType mapping
    const mimeTypeExtensions: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'text/plain': 'txt'
    }

    return (document.mimeType && mimeTypeExtensions[document.mimeType]) || 'pdf'
  }

  const constructDocumentUrl = (document: Document) => {
    // Check if document.file already has an extension
    if (document.file && document.file.includes('.')) {
      // File already has extension, use as is
      return `/files/api/v1/public/downloads/crm/contacts/${contactId}/documents/${document.file}`
    } else {
      // File doesn't have extension, add one
      const fileExtension = getFileExtension(document)
      return `/files/api/v1/public/downloads/crm/contacts/${contactId}/documents/${document.file}.${fileExtension}`
    }
  }

  const handleViewDocument = (document: Document) => {
    if (!document.file) {
      console.error('No file ID available for document:', document)
      return
    }

    const documentUrl = constructDocumentUrl(document)
    window.open(documentUrl, '_blank')
  }

  const handleDownloadDocument = (document: Document) => {
    if (!document.file) {
      console.error('No file ID available for document:', document)
      return
    }

    const documentUrl = constructDocumentUrl(document)
    const link = window.document.createElement('a')
    link.href = documentUrl
    link.download = document.name || `document.${getFileExtension(document)}`
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }

  const handleDeleteDocument = (document: Document) => {
    if (document.id?.startsWith('mock-')) {
      setDocuments(prev => prev.filter(d => d.id !== document.id))
      message.success('Document deleted (mock)')
      return
    }
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete "${document.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post(
            '/customer-relations/saveCrmDocument',
            {
              changeMode: 'DELETE',
              crmDocument: { id: document.id, version: document.version, contact: contactId }
            },
            { headers: { Authorization: `Bearer ${context.accessToken}` } }
          )
          message.success('Document deleted')
          await fetchDocuments()
        } catch (e: any) {
          console.error('Error deleting document', e)
          message.error(e?.message || 'Failed to delete document')
        }
      }
    })
  }

  const isFileDocument = (d: Document): boolean => {
    const fmt = (d.format || '').toUpperCase()
    return fmt === 'FILE' || !!d.mimeType || !!d.file
  }

  const hasDescendantFiles = (startFolderId: string): boolean => {
    if (!startFolderId) return false
    const toVisit: string[] = [startFolderId]
    const safetyLimit = 5000
    let visited = 0
    while (toVisit.length && visited < safetyLimit) {
      const currentId = toVisit.pop() as string
      for (const d of documents) {
        if (d.parentDocument === currentId) {
          if (isFileDocument(d)) return true
          toVisit.push(d.id)
        }
      }
      visited += 1
    }
    return false
  }

  const handleDeleteFolder = (node: DocumentFolder) => {
    if (!node.folderId || node.folderVersion == null) return
    if (hasDescendantFiles(node.folderId)) {
      message.warning('Cannot delete a folder that contains files. Move or delete files first.')
      return
    }
    if (node.folderId.startsWith('mock-')) {
      message.warning('Cannot delete a folder that contains files.')
      return
    }
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the folder "${node.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post(
            '/customer-relations/saveCrmDocument',
            {
              changeMode: 'DELETE',
              crmDocument: { id: node.folderId, version: node.folderVersion, contact: contactId }
            },
            { headers: { Authorization: `Bearer ${context.accessToken}` } }
          )
          message.success('Folder deleted')
          await fetchDocuments()
        } catch (e: any) {
          console.error('Error deleting folder', e)
          message.error(e?.message || 'Failed to delete folder')
        }
      }
    })
  }

  // DnD helpers
  const Draggable: React.FC<{ id: string; data: any; className?: string; children: React.ReactNode }> = ({
    id,
    data,
    className,
    children
  }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data })
    const style: React.CSSProperties = transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : {}
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={className}
        style={style}
        data-dragging={isDragging}
      >
        {children}
      </div>
    )
  }

  const Droppable: React.FC<{
    id: string
    data: any
    className?: string
    children: React.ReactNode
    disabled?: boolean
  }> = ({ id, data, className, children, disabled }) => {
    const { setNodeRef, isOver } = useDroppable({ id, data, disabled })
    const combinedClass = `${className || ''} ${isOver ? 'gba:ring-2 gba:ring-blue-500 gba:bg-blue-50' : ''}`
    return (
      <div ref={setNodeRef} className={combinedClass} data-over={isOver}>
        {children}
      </div>
    )
  }

  const updateParentDocumentLocal = (docId: string, parentId: string | null) => {
    setDocuments(prev => prev.map(d => (d.id === docId ? { ...d, parentDocument: parentId } : d)))
  }

  const isFolderAncestor = useCallback(
    (ancestorId: string, folderId: string): boolean => {
      if (!ancestorId || !folderId || ancestorId === folderId) return false
      const docById: Record<string, Document> = Object.fromEntries(documents.map(d => [d.id, d]))
      let current: Document | undefined = docById[folderId]
      const maxHops = 1000
      let hops = 0
      while (current && hops < maxHops) {
        const currentParentId: string | undefined = current.parentDocument || undefined
        if (!currentParentId) return false
        if (currentParentId === ancestorId) return true
        current = docById[currentParentId]
        hops += 1
      }
      return false
    },
    [documents]
  )

  const persistParentDocumentUpdate = async (
    docId: string,
    version: number,
    newParentId: string | null,
    previousParentId: string | null | undefined
  ) => {
    try {
      await restClient.post(
        '/customer-relations/saveCrmDocument',
        {
          changeMode: 'UPDATE',
          crmDocument: {
            id: docId,
            version: version,
            parentDocument: newParentId ?? '',
            folder:
              !documents.find(d => d.id === docId)?.format ||
              documents.find(d => d.id === docId)?.format?.toUpperCase() !== 'FILE', // Preserve folder status
            contact: contactId
          }
        },
        { headers: { Authorization: `Bearer ${context.accessToken}` } }
      )
      message.success('Document moved')
    } catch (e: any) {
      console.error('Error moving document', e)
      setDocuments(prev => prev.map(d => (d.id === docId ? { ...d, parentDocument: previousParentId || null } : d)))
      message.error(e?.message || 'Failed to move document')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null)
    const active = event.active?.data?.current as any
    const over = event.over?.data?.current as any
    if (!active || !over) return
    const targetFolderId: string | null | undefined =
      over.targetFolderId === '' ? null : (over.targetFolderId as string | null | undefined)
    if (typeof targetFolderId === 'undefined') return
    if ((active.itemType === 'document' || active.itemType === 'folder') && active.id && active.version != null) {
      const previousParentId = documents.find(d => d.id === active.id)?.parentDocument || null
      if (previousParentId === targetFolderId) return
      if (
        active.itemType === 'folder' &&
        typeof targetFolderId === 'string' &&
        isFolderAncestor(active.id as string, targetFolderId)
      ) {
        message.warning('Cannot move a folder into its own subfolder')
        return
      }
      updateParentDocumentLocal(active.id, targetFolderId)
      if (typeof targetFolderId === 'string') {
        setExpandedFolders(prev => {
          const next = new Set(prev)
          next.add(targetFolderId)
          return next
        })
      }
      if (
        String(active.id).startsWith('mock-') ||
        (typeof targetFolderId === 'string' && String(targetFolderId).startsWith('mock-'))
      ) {
        return
      }
      void persistParentDocumentUpdate(active.id, active.version, targetFolderId, previousParentId)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const current = event.active?.data?.current as any
    if (!current) return
    if (current.itemType === 'document' && current.id) {
      const doc = documents.find(d => d.id === current.id)
      if (doc) setActiveDragItem({ itemType: 'document', name: doc.name || 'Document', mimeType: doc.mimeType })
    } else if (current.itemType === 'folder' && current.id) {
      const folderDoc = documents.find(d => d.id === current.id)
      if (folderDoc) setActiveDragItem({ itemType: 'folder', name: folderDoc.name || 'Folder' })
    }
  }

  const isFile = (doc: Document) => (doc.format || '').toUpperCase() === 'FILE'
  const totalDocuments = documents.filter(isFile).length
  const totalSize = documents.filter(isFile).reduce((sum, doc) => sum + (doc.fileSize || 0), 0)

  // Removed unused sortedDocuments

  // Removed unused renderDocumentIcon

  // Removed unused renderDocumentListItem

  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Documents</CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              onClick={() =>
                startProcess({
                  domain: 'customer-relations',
                  processName: 'createCrmDocument',
                  payload: {
                    contactId
                  },
                  builderType: 'NATIVE_SCREEN'
                })
              }
              className="gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:border-blue-600 gba:text-blue-600 gba:hover:bg-blue-50 gba:hover:border-blue-700 gba:transition-colors"
            >
              <FileOutlined className="gba:mr-2" />
              Upload Document
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                startProcess({
                  domain: 'customer-relations',
                  processName: 'createCrmDocument',
                  payload: {
                    contactId,
                    createFolder: true
                  },
                  builderType: 'NATIVE_SCREEN'
                })
              }
              className="gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:border-gray-600 gba:text-gray-700 gba:hover:bg-gray-50 gba:hover:border-gray-700 gba:transition-colors"
              data-testid="create-folder-button"
            >
              <FolderAddOutlined className="gba:mr-2" />
              Create Folder
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Input and View Toggle */}
        <div className="gba:mb-4 gba:space-y-3">
          <DebouncedInput
            placeholder="Search documents..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="gba:w-full"
            data-testid="documents-search-input"
          />

          {/* View Mode Toggle */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-4">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">View:</span>
              <div className="gba:flex gba:bg-gray-100 gba:rounded-lg gba:p-1 gba:gap-1">
                <Button
                  variant={viewMode === 'icon' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('icon')}
                  className="gba:px-3 gba:py-1.5"
                  data-testid="tree-view-toggle"
                >
                  <AppstoreOutlined className="gba:mr-1.5" />
                  Tree
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gba:px-3 gba:py-1.5"
                  data-testid="list-view-toggle"
                >
                  <BarsOutlined className="gba:mr-1.5" />
                  List
                </Button>
              </div>
            </div>

            {/* Document Statistics */}
            <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-gray-600">
              <Badge variant="secondary" className="gba:bg-blue-50 gba:text-blue-700">
                {totalDocuments} document{totalDocuments !== 1 ? 's' : ''}
              </Badge>
              <span>{formatFileSize(totalSize)} total</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="gba:mb-4">
            <div>
              <h4 className="gba:font-medium">Error loading documents</h4>
              <p className="gba:text-sm">{error}</p>
            </div>
          </Alert>
        ) : documentFolders.length === 0 && rootLevelFiles.length === 0 ? (
          <div className="gba:text-center gba:py-10">
            <FolderOpenOutlined className="gba:text-6xl gba:text-gray-300 gba:mb-4" />
            <p className="gba:text-gray-500 gba:text-lg">No documents found</p>
            <p className="gba:text-gray-400 gba:text-sm">Documents will appear here once uploaded</p>
          </div>
        ) : viewMode === 'icon' ? (
          // TREE VIEW with DnD and folder/file actions
          <div className="gba:w-full">
            <div className="gba:bg-hsl(var(--background)) gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden">
              <div className="gba:flex gba:items-center gba:py-3 gba:px-4 gba:bg-gray-50 gba:border-b gba:border-gray-200 gba:font-medium gba:text-sm gba:text-gray-700">
                <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                  <div className="gba:w-6"></div>
                  <div className="gba:flex-1 gba:min-w-0">Name</div>
                </div>
                <div className="gba:w-44 gba:text-right gba:mr-4">Modified</div>
                <div className="gba:w-20 gba:text-right gba:mr-4">Size</div>
                <div className="gba:w-16 gba:text-right gba:mr-4">Type</div>
                <div className="gba:w-16"></div>
              </div>

              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div>
                  <Droppable id={`drop-root`} data={{ targetFolderId: '' }} className="gba:w-full">
                    <div className="gba:h-4 gba:bg-transparent" />
                  </Droppable>

                  {/* Root-level files */}
                  {rootLevelFiles.map(document => (
                    <Droppable key={`drop-doc-root-${document.id}`} id={`drop-doc-root-${document.id}`} data={{}}>
                      <Draggable
                        id={`drag-doc-${document.id}`}
                        data={{ itemType: 'document', id: document.id, version: document.version }}
                      >
                        <div
                          key={document.id}
                          className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-blue-50 gba:cursor-pointer gba:border-b gba:border-gray-50 gba:group"
                          style={{ paddingLeft: '32px' }}
                          data-testid={`document-tree-root-${document.id}`}
                          onClick={() => handleViewDocument(document)}
                        >
                          <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                            <div className="gba:w-6"></div>
                            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                              <div className="gba:text-blue-600 gba:text-sm">{getFileIcon(document.mimeType)}</div>
                              <span
                                className="gba:text-sm gba:text-gray-900 gba:truncate"
                                title={document.name || 'Unnamed Document'}
                              >
                                {document.name || 'Unnamed Document'}
                              </span>
                            </div>
                          </div>
                          <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                            {formatDate(document.createdAt)}
                          </div>
                          <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                            {formatFileSize(document.fileSize || 0)}
                          </div>
                          <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                            {document.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                          </div>
                          <div className="gba:w-28 gba:flex gba:items-center gba:justify-end gba:gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                openEditDocument(document)
                              }}
                              data-testid={`edit-tree-document-${document.id}`}
                              className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100"
                              title="Edit"
                            >
                              <EditOutlined style={{ fontSize: '10px' }} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                handleViewDocument(document)
                              }}
                              data-testid={`view-tree-document-${document.id}`}
                              className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100"
                              title="View"
                            >
                              <EyeOutlined style={{ fontSize: '10px' }} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                handleDeleteDocument(document)
                              }}
                              data-testid={`delete-tree-document-${document.id}`}
                              className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100"
                              title="Delete"
                            >
                              <DeleteOutlined style={{ fontSize: '10px' }} />
                            </Button>
                          </div>
                        </div>
                      </Draggable>
                    </Droppable>
                  ))}

                  {documentFolders.map(folder => {
                    const renderFolder = (node: DocumentFolder, depth: number) => {
                      const isExpanded = node.folderId ? expandedFolders.has(node.folderId) : false
                      const indentPx = 16 * depth
                      return (
                        <React.Fragment key={node.folderId || node.name}>
                          <Droppable
                            id={`drop-folder-${node.folderId || node.name}`}
                            data={{ targetFolderId: node.folderId }}
                            className="gba:w-full"
                            disabled={!node.folderId}
                          >
                            <Draggable
                              id={`drag-folder-${node.folderId || node.name}`}
                              data={{ itemType: 'folder', id: node.folderId, version: node.folderVersion }}
                            >
                              <div
                                className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-gray-50 gba:cursor-pointer gba:border-b gba:border-gray-100"
                                onClick={() => node.folderId && toggleFolder(node.folderId)}
                                data-testid={`folder-tree-${node.folderId || node.name}`}
                                style={{ paddingLeft: `${indentPx}px` }}
                              >
                                <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                                  <div className="gba:w-6 gba:flex gba:items-center gba:justify-center">
                                    <CaretRightOutlined
                                      className={`gba:text-xs gba:text-gray-400 gba:transition-transform ${isExpanded ? 'gba:rotate-90' : ''}`}
                                    />
                                  </div>
                                  <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                                    <FolderOpenOutlined className="gba:text-blue-600 gba:text-sm" />
                                    <span className="gba:text-sm gba:text-gray-900 gba:truncate">{node.name}</span>
                                  </div>
                                </div>
                                <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                                  {node.documents && node.documents.length > 0
                                    ? formatDate(
                                        new Date(
                                          Math.max(...node.documents.map(doc => new Date(doc.createdAt).getTime()))
                                        ).toISOString()
                                      )
                                    : '-'}
                                </div>
                                <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">-</div>
                                <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                                  Folder
                                </div>
                                <div className="gba:w-28 gba:flex gba:items-center gba:justify-end gba:gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={e => {
                                      e.stopPropagation()
                                      startProcess({
                                        domain: 'customer-relations',
                                        processName: 'createCrmDocument',
                                        payload: {
                                          contactId,
                                          ...(node.folderId ? { parentDocument: node.folderId } : {})
                                        },
                                        builderType: 'NATIVE_SCREEN'
                                      })
                                    }}
                                    className="gba:p-1 gba:h-6 gba:w-6"
                                    data-testid={`new-document-icon-${node.folderId || node.name}`}
                                    title="New Document"
                                  >
                                    <FileOutlined className="gba:text-xs" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={e => {
                                      e.stopPropagation()
                                      startProcess({
                                        domain: 'customer-relations',
                                        processName: 'createCrmDocument',
                                        payload: {
                                          contactId,
                                          createFolder: true,
                                          ...(node.folderId ? { parentDocument: node.folderId } : {})
                                        },
                                        builderType: 'NATIVE_SCREEN'
                                      })
                                    }}
                                    className="gba:p-1 gba:h-6 gba:w-6"
                                    data-testid={`new-subfolder-icon-${node.folderId || node.name}`}
                                    title="New Subfolder"
                                  >
                                    <FolderAddOutlined className="gba:text-xs" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={e => {
                                      e.stopPropagation()
                                      openRenameFolder(node)
                                    }}
                                    className="gba:p-1 gba:h-6 gba:w-6"
                                    data-testid={`rename-folder-icon-${node.folderId || node.name}`}
                                    title="Rename Folder"
                                    disabled={!node.folderId}
                                  >
                                    <EditOutlined className="gba:text-xs" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleDeleteFolder(node)
                                    }}
                                    className="gba:p-1 gba:h-6 gba:w-6"
                                    data-testid={`delete-folder-icon-${node.folderId || node.name}`}
                                    title="Delete Folder"
                                    disabled={!node.folderId}
                                  >
                                    <DeleteOutlined className="gba:text-xs" />
                                  </Button>
                                </div>
                              </div>
                            </Draggable>
                          </Droppable>

                          {isExpanded && (
                            <>
                              <Droppable
                                id={`drop-root-inline-${node.folderId}`}
                                data={{ targetFolderId: null }}
                                className="gba:w-full"
                              >
                                <div className="gba:h-0.5" />
                              </Droppable>
                              {Array.isArray(node.children) &&
                                node.children.map(child => renderFolder(child, depth + 1))}
                              {Array.isArray(node.documents) &&
                                node.documents.map(document => (
                                  <Droppable
                                    key={`drop-doc-row-${document.id}`}
                                    id={`drop-doc-row-${document.id}`}
                                    data={{}}
                                  >
                                    <Draggable
                                      id={`drag-doc-${document.id}`}
                                      data={{ itemType: 'document', id: document.id, version: document.version }}
                                    >
                                      <div
                                        key={document.id}
                                        className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-blue-50 gba:cursor-pointer gba:border-b gba:border-gray-50 gba:group"
                                        style={{ paddingLeft: `${16 * (depth + 1) + 16}px` }}
                                        data-testid={`document-tree-${document.id}`}
                                        onClick={() => handleViewDocument(document)}
                                      >
                                        <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                                          <div className="gba:w-6"></div>
                                          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                                            <div className="gba:text-blue-600 gba:text-sm">
                                              {getFileIcon(document.mimeType)}
                                            </div>
                                            <span
                                              className="gba:text-sm gba:text-gray-900 gba:truncate"
                                              title={document.name || 'Unnamed Document'}
                                            >
                                              {document.name || 'Unnamed Document'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                                          {formatDate(document.createdAt)}
                                        </div>
                                        <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                                          {formatFileSize(document.fileSize || 0)}
                                        </div>
                                        <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                                          {document.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                                        </div>
                                        <div className="gba:w-16 gba:flex gba:items-center gba:justify-end gba:gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={e => {
                                              e.stopPropagation()
                                              openEditDocument(document)
                                            }}
                                            data-testid={`edit-tree-document-${document.id}`}
                                            className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100"
                                            title="Edit"
                                          >
                                            <EditOutlined style={{ fontSize: '10px' }} />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={e => {
                                              e.stopPropagation()
                                              handleViewDocument(document)
                                            }}
                                            data-testid={`view-tree-document-${document.id}`}
                                            className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100"
                                            title="View"
                                          >
                                            <EyeOutlined style={{ fontSize: '10px' }} />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={e => {
                                              e.stopPropagation()
                                              handleDeleteDocument(document)
                                            }}
                                            data-testid={`delete-tree-document-${document.id}`}
                                            className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100"
                                            title="Delete"
                                          >
                                            <DeleteOutlined style={{ fontSize: '10px' }} />
                                          </Button>
                                        </div>
                                      </div>
                                    </Draggable>
                                  </Droppable>
                                ))}
                            </>
                          )}
                        </React.Fragment>
                      )
                    }
                    return renderFolder(folder, 0)
                  })}

                  <Droppable id={`drop-root-bottom`} data={{ targetFolderId: '' }} className="gba:w-full">
                    <div className="gba:h-6 gba:bg-transparent" />
                  </Droppable>
                </div>
                <DragOverlay>
                  {activeDragItem ? (
                    <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-hsl(var(--background)) gba:border gba:rounded gba:shadow-md">
                      <div className="gba:text-blue-600">
                        {activeDragItem.itemType === 'document' ? (
                          getFileIcon(activeDragItem.mimeType)
                        ) : (
                          <FolderOpenOutlined />
                        )}
                      </div>
                      <div
                        className="gba:text-sm gba:text-gray-800 gba:max-w-[240px] gba:truncate"
                        title={activeDragItem.name}
                      >
                        {activeDragItem.name}
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        ) : (
          // LIST VIEW - Enhanced flat list with filters and column management
          <DataContainer
            dataControllerProps={{
              search: searchQuery,
              setSearch: setSearchQuery,
              debounceDelay: 500,
              filter: selectedFilters,
              setFilter: setSelectedFilters,
              filterLabelMap: {},
              listTitle: (
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span>Documents</span>
                    <span className="gba:text-gray-500">({documentsWithFilters.length})</span>
                  </div>
                </div>
              ),
              addButton: {
                onClick: () =>
                  startProcess({
                    domain: 'customer-relations',
                    processName: 'createCrmDocument',
                    payload: {
                      contactId
                    },
                    builderType: 'NATIVE_SCREEN'
                  }),
                label: 'Add Document',
                'data-testid': 'add-document-button'
              },
              actions: [<ColumnVisibilityDropdown key="column-visibility" />]
            }}
            dataFilterProps={{
              filterGroups,
              onFilterChange: handleFilterChange
            }}
            dataBody={
              <div className="gba:w-full">
                <div className="gba:bg-hsl(var(--background)) gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden">
                  {/* Enhanced Table Header */}
                  <div className="gba:flex gba:items-center gba:p-4 gba:bg-gray-50 gba:border-b gba:border-gray-200 gba:font-medium gba:text-sm gba:text-gray-700">
                    <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
                      <div className="gba:w-8 gba:flex-shrink-0"></div>
                      {isColumnVisible('name') && <div className="gba:flex-1 gba:min-w-0">Name</div>}
                      {isColumnVisible('group') && (
                        <div className="gba:w-32 gba:flex-shrink-0">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <FolderOpenOutlined />
                            <span>Group</span>
                          </div>
                        </div>
                      )}
                      {isColumnVisible('type') && <div className="gba:w-32 gba:flex-shrink-0">Type</div>}
                      {isColumnVisible('size') && <div className="gba:w-24 gba:flex-shrink-0">Size</div>}
                      {isColumnVisible('uploadDate') && (
                        <div className="gba:w-44 gba:flex-shrink-0">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <CalendarOutlined />
                            <span>Upload Date</span>
                          </div>
                        </div>
                      )}
                      {isColumnVisible('expirationDate') && (
                        <div className="gba:w-44 gba:flex-shrink-0">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <CalendarOutlined />
                            <span>Expiration Date</span>
                          </div>
                        </div>
                      )}
                      {isColumnVisible('uploadedBy') && (
                        <div className="gba:w-32 gba:flex-shrink-0">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <UserOutlined />
                            <span>Uploaded By</span>
                          </div>
                        </div>
                      )}
                      {isColumnVisible('actions') && (
                        <div className="gba:w-20 gba:flex-shrink-0 gba:text-right">Actions</div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Table Body */}
                  <div className="gba:divide-y gba:divide-gray-200">
                    {documentsWithFilters.map(document => (
                      <div
                        key={document.id}
                        className="gba:flex gba:items-center gba:p-4 gba:bg-hsl(var(--background)) gba:border-b gba:border-gray-200 gba:hover:bg-gray-50 gba:transition-colors"
                        data-testid={`document-list-${document.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
                          <div className="gba:text-lg gba:flex-shrink-0">{getFileIcon(document.mimeType)}</div>
                          {isColumnVisible('name') && (
                            <div className="gba:flex-1 gba:min-w-0">
                              <div
                                className="gba:font-medium gba:text-gray-900 gba:text-sm gba:truncate"
                                title={document.name || 'Unnamed Document'}
                              >
                                {document.name || 'Unnamed Document'}
                              </div>
                            </div>
                          )}
                          {isColumnVisible('group') && (
                            <div className="gba:w-32 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {document.documentGroup?.value || '-'}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('type') && (
                            <div className="gba:w-32 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {document.documentType?.value || '-'}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('size') && (
                            <div className="gba:w-24 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {formatFileSize(document.fileSize || 0)}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('uploadDate') && (
                            <div className="gba:w-44 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">{formatDate(document.createdAt)}</span>
                            </div>
                          )}
                          {isColumnVisible('expirationDate') && (
                            <div className="gba:w-44 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {document.expirationDate ? formatDate(document.expirationDate) : '-'}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('uploadedBy') && (
                            <div className="gba:w-32 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {getEmployeeDisplayName(document.createdBy || '') || 'Unknown'}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('actions') && (
                            <div className="gba:w-20 gba:flex-shrink-0 gba:text-right">
                              <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDocument(document)}
                                  data-testid={`view-list-document-${document.id}`}
                                  className="gba:p-1 gba:h-7 gba:w-7"
                                  title="View"
                                >
                                  <EyeOutlined className="gba:text-xs" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(document)}
                                  data-testid={`download-list-document-${document.id}`}
                                  className="gba:p-1 gba:h-7 gba:w-7"
                                  title="Download"
                                >
                                  <DownloadOutlined className="gba:text-xs" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        )}
      </CardContent>
      {/* Rename Folder Modal */}
      <Modal
        open={renameModal.open}
        title="Rename Folder"
        onOk={confirmRenameFolder}
        onCancel={() => setRenameModal({ open: false, name: '', node: undefined })}
        okText="Save"
        data-testid="rename-folder-modal"
      >
        <AntdInput
          value={renameModal.name}
          onChange={e => setRenameModal(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter new folder name"
          data-testid="rename-folder-input"
        />
      </Modal>
    </Card>
  )
}

export default ContactDocuments
