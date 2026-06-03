'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Employee } from '../../hooks/useEmployeeData'
import {
  Button,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import { DeleteConfirmPopup } from '@/common/components/common-relations/popups/delete-confirm-popup'
import { Search, File, FileText, Image, FileSpreadsheet, Trash2, Download, ChevronDown } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/plugin/weekday'
import 'dayjs/plugin/localeData'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useFileClient } from '@/common/network/files/useFileClient'
import { employeeDocumentsQuery, documentTypeCatalogQuery } from '../../queries/documentQueries'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { formatDate as formatLocaleDate, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { EmployeeDocumentClient } from '../../services/employeeDocumentApi'
import documentsI18n from './_i18n'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

interface DocumentsTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
  userInfo?: UserInfoProps
  canEditDocuments?: boolean
}

interface EmployeeDocument {
  id: string
  version: number
  name: string
  file: string
  type: string
  mimeType: string
  documentGroup: string
  createdBy: string
  description: string
  employeeId: string
  createdAt: string
  validTo: string | null
  url?: string
  employee?: {
    firstName: string
    lastName: string
  }
}

interface DocumentType {
  id: string
  value: string
  code: string
  translations?: Array<{ localeCode: string; value: string }>
}

interface Document {
  id: string
  title: string
  name?: string
  type: string
  typeRef: string
  typeValue: string
  documentGroupKey?: string
  documentGroup?: string
  description?: string
  createdBy?: string
  createdAt?: string
  uploadDate: string
  validTo: string | null
  size?: string
  file: string
  mimeType: string
  fileId?: string
  employeeId: string
  version?: number
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ employee, accessToken, canEditDocuments = false }) => {
  const { t } = useTranslation(documentsI18n)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentBlob, setDocumentBlob] = useState<Blob | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchField, setSearchField] = useState<string>('all')
  const [documentPreviews, setDocumentPreviews] = useState<Record<string, string>>({})
  const [previewsLoading, setPreviewsLoading] = useState<Record<string, boolean>>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
      if (documentUrl && documentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(documentUrl)
      }
    }
  }, [documentUrl])

  const graphQLClient = useGraphqlClient(accessToken)
  const fileClient = useFileClient({ accessToken })

  const fetchDocuments = async () => {
    try {
      setLoading(true)

      const activeUserLocale = getCurrentActiveUserLocale()
      const screenDataResponse = await graphQLClient.request(employeeDocumentsQuery, {
        employeeId: employee.id,
        activeUserLocale
      })

      const employeeDocuments: EmployeeDocument[] = screenDataResponse?.EmployeeDocument || []
      const documentGroups = screenDataResponse?.documentGroup || []

      const documentGroupKeyMap: Record<string, string> = {}
      const documentGroupTranslationMap: Record<string, string> = {}
      documentGroups.forEach((group: any) => {
        const translation =
          group.translations && group.translations.length > 0 ? group.translations[0].value : group.value
        documentGroupKeyMap[group.id] = group.value
        documentGroupTranslationMap[group.id] = translation
      })

      const documentTypeRefs = employeeDocuments.map(doc => doc.type).filter(Boolean)
      let typeDetailsMap: Record<string, DocumentType> = {}

      if (documentTypeRefs.length > 0) {
        const catalogDataResponse = await graphQLClient.request(documentTypeCatalogQuery, {
          documentTypeRefs,
          activeUserLocale
        })

        const catalogEntries: DocumentType[] = catalogDataResponse?.CatalogEntry || []
        typeDetailsMap = catalogEntries.reduce(
          (acc, entry) => {
            acc[entry.id] = entry
            return acc
          },
          {} as Record<string, DocumentType>
        )
      }

      const formattedDocuments: Document[] = employeeDocuments.map(doc => {
        let fileId: string | undefined = undefined
        if (doc.file) {
          const fileUrlMatch = doc.file.match(/files\/([\w\d-]+)/i)
          if (fileUrlMatch && fileUrlMatch[1]) {
            fileId = fileUrlMatch[1]
          }
        }

        const createdByName = doc.employee
          ? `${doc.employee.firstName || ''} ${doc.employee.lastName || ''}`.trim()
          : doc.createdBy

        const typeEntry = typeDetailsMap[doc.type]
        const typeTranslatedValue =
          typeEntry?.translations && typeEntry.translations.length > 0
            ? typeEntry.translations[0].value
            : typeEntry?.value || t('documents-group-other')

        return {
          id: doc.id,
          title: doc.name,
          name: doc.name,
          type: doc.mimeType?.split('/')[1]?.toUpperCase() || t('documents-unknown'),
          typeRef: doc.type,
          typeValue: typeTranslatedValue,
          documentGroupKey: documentGroupKeyMap[doc.documentGroup] || 'Other',
          documentGroup: documentGroupTranslationMap[doc.documentGroup] || t('documents-group-other'),
          description: doc.description,
          createdBy: createdByName,
          createdAt: doc.createdAt,
          uploadDate: doc.createdAt,
          validTo: doc.validTo,
          file: doc.file,
          mimeType: doc.mimeType,
          fileId: fileId,
          employeeId: doc.employeeId,
          version: doc.version
        }
      })

      const sortedDocuments = [...formattedDocuments].sort((a, b) => {
        const dateA = new Date(a.uploadDate).getTime()
        const dateB = new Date(b.uploadDate).getTime()
        return dateB - dateA
      })

      setDocuments(sortedDocuments)
    } catch (err) {
      setError(t('documents-error-load-failed'))
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [employee?.id])

  useProcessCompletion({
    onSuccess: () => {
      void fetchDocuments()
    }
  })

  useEffect(() => {
    const loadDocumentPreviews = async () => {
      const previewableDocuments = documents.filter(doc => isImageDocument(doc) || isPdfDocument(doc)).slice(0, 6)

      if (previewableDocuments.length === 0) return

      for (const doc of previewableDocuments) {
        if (documentPreviews[doc.id] || previewsLoading[doc.id]) continue

        try {
          setPreviewsLoading(prev => ({ ...prev, [doc.id]: true }))

          if (doc.file) {
            const blob = await fileClient.getFile(
              {
                accessScope: 'tenant',
                fileId: doc.file
              },
              {
                appName: 'employee-profile',
                folderPath: `/documents/${employee?.id}`
              }
            )

            if (blob && blob.size > 0) {
              let url
              if (isPdfDocument(doc)) {
                const typedBlob = new Blob([blob], { type: 'application/pdf' })
                url = URL.createObjectURL(typedBlob)
              } else {
                url = URL.createObjectURL(blob)
              }

              if (isMounted.current) {
                setDocumentPreviews(prev => ({ ...prev, [doc.id]: url }))
              }
            }
          }
        } catch (err) {
          console.error(`Failed to load preview for document ${doc.id}:`, err)
        } finally {
          if (isMounted.current) {
            setPreviewsLoading(prev => ({ ...prev, [doc.id]: false }))
          }
        }
      }
    }

    loadDocumentPreviews()

    return () => {
      Object.values(documentPreviews).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [documents, fileClient, employee?.id])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleSearchFieldChange = (value: string) => {
    setSearchField(value)
  }

  const handleDeleteClick = (doc: Document, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setDocumentToDelete(doc)
    setDeleteConfirmOpen(true)
  }

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
    setDocumentToDelete(null)
  }

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return

    setIsDeleting(true)
    try {
      const documentClient = new EmployeeDocumentClient()
      documentClient.setAccessToken(accessToken)

      await documentClient.deleteEmployeeDocument({
        employeeDocument: {
          id: documentToDelete.id,
          version: documentToDelete.version ?? 0,
          employeeId: documentToDelete.employeeId,
          type: documentToDelete.typeRef,
          name: documentToDelete.name || documentToDelete.title,
          file: documentToDelete.file,
          mimeType: documentToDelete.mimeType
        }
      })

      toast.success(t('documents-delete-success'))

      if (currentDocument?.id === documentToDelete.id) {
        closeDocumentViewer()
      }

      await fetchDocuments()
    } catch (err) {
      console.error('Error deleting document:', err)
      toast.error(t('documents-delete-error'))
    } finally {
      setIsDeleting(false)
      setDeleteConfirmOpen(false)
      setDocumentToDelete(null)
    }
  }

  // Helper function to get translated group name
  const getTranslatedGroupName = (groupKey: string, documentGroup?: string): string => {
    // First, check if documentGroup matches English values and translate them
    if (documentGroup) {
      const normalized = documentGroup.trim()
      if (normalized === 'Salary') return t('documents-group-salary')
      if (normalized === 'Expenses') return t('documents-group-expenses')
      if (normalized === 'Development') return t('documents-group-development')
      if (normalized === 'Personal') return t('documents-group-personal')
      if (normalized === 'Other') return t('documents-group-other')
    }

    // Then translate by the key
    switch (groupKey) {
      case 'Salary':
        return t('documents-group-salary')
      case 'Expenses':
        return t('documents-group-expenses')
      case 'Development':
        return t('documents-group-development')
      case 'Personal':
        return t('documents-group-personal')
      case 'Other':
        return t('documents-group-other')
      default:
        // If it's already translated or doesn't match, use documentGroup or groupKey
        return documentGroup || groupKey
    }
  }

  const groupedDocuments = useMemo(() => {
    const groups: { [key: string]: Document[] } = {}

    documents.forEach(doc => {
      const groupKey = doc.documentGroupKey || 'Other'
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(doc)
    })

    return groups
  }, [documents])

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents

    const query = searchQuery.toLowerCase().trim()

    return documents.filter(doc => {
      if (searchField === 'all') {
        return (
          doc.title?.toLowerCase().includes(query) ||
          doc.type?.toLowerCase().includes(query) ||
          doc.typeValue?.toLowerCase().includes(query) ||
          doc.documentGroup?.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.createdBy?.toLowerCase().includes(query) ||
          (doc.uploadDate && formatDate(doc.uploadDate).toLowerCase().includes(query)) ||
          (doc.validTo && formatDate(doc.validTo).toLowerCase().includes(query))
        )
      } else {
        switch (searchField) {
          case 'title':
            return doc.title?.toLowerCase().includes(query)
          case 'type':
            return doc.type?.toLowerCase().includes(query) || doc.typeValue?.toLowerCase().includes(query)
          case 'documentGroup':
            return doc.documentGroup?.toLowerCase().includes(query)
          case 'description':
            return doc.description?.toLowerCase().includes(query)
          case 'createdBy':
            return doc.createdBy?.toLowerCase().includes(query)
          case 'uploadDate':
            return doc.uploadDate && formatDate(doc.uploadDate).toLowerCase().includes(query)
          case 'validTo':
            return doc.validTo && formatDate(doc.validTo).toLowerCase().includes(query)
          default:
            return false
        }
      }
    })
  }, [documents, searchQuery, searchField])

  const filteredGroupedDocuments = useMemo(() => {
    const groups: { [key: string]: Document[] } = {}

    filteredDocuments.forEach(doc => {
      const groupKey = doc.documentGroupKey || 'Other'
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(doc)
    })

    return groups
  }, [filteredDocuments])

  const loadDocumentBlob = async (fileId: string): Promise<Blob> => {
    const blob = await fileClient.getFile(
      {
        accessScope: 'tenant',
        fileId
      },
      {
        appName: 'employee-profile',
        folderPath: `/documents/${employee?.id}`
      }
    )

    if (!blob || blob.size === 0) {
      throw new Error(t('documents-error-load-document'))
    }

    return blob
  }

  const handleFileLoadFallback = (fileId: string) => {
    try {
      if (fileId) {
        window.open(fileId, '_blank')
      } else {
        throw new Error(t('documents-error-no-file-id'))
      }
    } catch {
      setError(t('documents-error-load-document'))
    }
  }

  const openDocumentViewer = async (document: Document) => {
    try {
      setError(null)
      setDocumentBlob(null)
      setDocumentUrl(null)
      setCurrentDocument(document)
      setIsViewerOpen(true)
      setDocumentLoading(true)

      if (!document.file) {
        throw new Error(t('documents-error-no-file-info'))
      }

      try {
        setDocumentBlob(null)
        setDocumentUrl(null)

        const blob = await loadDocumentBlob(document.file)

        if (blob.type && !document.mimeType) {
          document.mimeType = blob.type
        }

        setDocumentBlob(blob)
      } catch {
        handleFileLoadFallback(document.file)
      }
    } catch (err) {
      setError(`${t('documents-error-load-document')}: ${err instanceof Error ? err.message : t('documents-unknown')}`)
    } finally {
      setDocumentLoading(false)
    }
  }

  const closeDocumentViewer = () => {
    setIsViewerOpen(false)
    setCurrentDocument(null)
    setError(null)
    setDocumentBlob(null)
    setDocumentUrl(null)
  }

  useEffect(() => {
    if (documentBlob) {
      try {
        if (documentBlob.size === 0) {
          throw new Error(t('documents-error-empty-blob'))
        }

        if (currentDocument && isPdfDocument(currentDocument)) {
          const typedBlob = new Blob([documentBlob], { type: 'application/pdf' })
          const url = URL.createObjectURL(typedBlob)
          setDocumentUrl(url)
        } else {
          const url = URL.createObjectURL(documentBlob)
          setDocumentUrl(url)
        }

        return () => {
          if (documentUrl) {
            URL.revokeObjectURL(documentUrl)
            setDocumentUrl(null)
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(`Failed to create document preview: ${errorMessage}`)
      }
    } else {
      setDocumentUrl(null)
    }
  }, [documentBlob, currentDocument])

  const isPdfDocument = (document: Document | null): boolean => {
    if (!document) return false
    return Boolean(
      (document.mimeType && document.mimeType.includes('pdf')) ||
        (document.file && document.file.toLowerCase().endsWith('.pdf'))
    )
  }

  const isImageDocument = (document: Document | null): boolean => {
    if (!document) return false
    return Boolean(
      (document.mimeType && document.mimeType.includes('image')) ||
        (document.file && /\.(jpe?g|gif|png|bmp|svg)$/i.test(document.file))
    )
  }

  const formatDate = (dateString: string): string => {
    return formatLocaleDate(dateString, 'date.medium') ?? dayjs(dateString).format('MMM D, YYYY')
  }

  const getDocumentTypeIcon = (document: Document) => {
    if (isImageDocument(document)) {
      return <Image className="gba:text-decorative-on-card gba:w-5 gba:h-5" />
    }

    if (isPdfDocument(document)) {
      return <FileText className="gba:text-decorative-on-card gba:w-5 gba:h-5" />
    }

    if (
      document.mimeType?.includes('excel') ||
      document.mimeType?.includes('spreadsheet') ||
      document.name?.toLowerCase().endsWith('.xlsx') ||
      document.name?.toLowerCase().endsWith('.xls')
    ) {
      return <FileSpreadsheet className="gba:text-decorative-on-card gba:w-5 gba:h-5" />
    }

    if (
      document.mimeType?.includes('word') ||
      document.mimeType?.includes('document') ||
      document.name?.toLowerCase().endsWith('.docx') ||
      document.name?.toLowerCase().endsWith('.doc')
    ) {
      return <FileText className="gba:text-decorative-on-card gba:w-5 gba:h-5" />
    }

    return <File className="gba:text-decorative-on-card gba:w-5 gba:h-5" />
  }

  const renderDocumentListItem = (document: Document) => {
    return (
      <div
        key={document.id}
        className="gba:px-4 gba:py-3 gba:border-b gba:border-border gba:hover:bg-muted gba:cursor-pointer gba:transition-colors"
        onClick={() => openDocumentViewer(document)}
        data-testid={`document-list-item-${document.id}`}
      >
        <div className="gba:flex gba:items-center gba:w-full">
          <div className="gba:mr-3">{getDocumentTypeIcon(document)}</div>
          <div className="gba:flex-grow gba:min-w-0">
            <div className="gba:font-medium gba:text-sm gba:truncate" title={document.title}>
              {document.title}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:truncate" title={document.typeValue}>
              {document.typeValue}
            </div>
          </div>
          <div className="gba:ml-4 gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:flex-col gba:items-end gba:text-xs gba:text-muted-foreground gba:gap-2">
              <div>{formatDate(document.uploadDate)}</div>
              {document.validTo && (
                <div
                  className={`gba:px-2 gba:py-0.5 gba:rounded-md gba:text-xs gba:text-white gba:font-medium ${document.validTo < dayjs().format('YYYY-MM-DD') ? 'gba:bg-destructive' : 'gba:bg-success'}`}
                  title={
                    document.validTo < dayjs().format('YYYY-MM-DD')
                      ? t('documents-expired-tooltip')
                      : t('documents-valid-tooltip')
                  }
                  data-testid={`document-validity-indicator-${document.id}`}
                >
                  {document.validTo < dayjs().format('YYYY-MM-DD')
                    ? t('documents-status-expired')
                    : t('documents-status-valid')}
                </div>
              )}
            </div>
            {canEditDocuments && (
              <button
                onClick={e => handleDeleteClick(document, e)}
                className="gba:p-2 gba:rounded-md gba:text-destructive gba:hover:bg-destructive-secondary gba:transition-colors"
                title={t('documents-delete')}
                data-testid={`document-delete-button-${document.id}`}
              >
                <Trash2 className="gba:w-4 gba:h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:text-center gba:text-destructive gba:py-8">
        <p>{error}</p>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="gba:space-y-4" data-testid="documents-tab-container">
        <div className="gba:flex gba:justify-between gba:items-start" data-testid="documents-header">
          <div className="gba:documents-header">
            <div className="gba:font-bold gba:text-2xl" data-testid="documents-title">
              {t('documents-title')}
            </div>
            <div className="gba:text-muted-foreground gba:text-lg" data-testid="documents-description">
              {t('documents-description')}
            </div>
          </div>

          <AppAction
            variant="update-primary"
            data-testid="employee-document-upload-button"
            contexts={[{ context: FlowContextName.documentPersonal, contextData: { employeeId: employee?.id } }]}
            prefixDataTestId="employee-document-upload"
            accessToken={accessToken}
            autoExecute={true}
          >
            {t('documents-upload-button')}
          </AppAction>
        </div>

        <div className="gba:py-10 gba:text-center gba:text-muted-foreground" data-testid="empty-documents-state">
          <File className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
          <p>{t('documents-empty')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid="documents-tab-container">
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="documents-header">
        <div className="gba:documents-header">
          <div className="gba:font-bold gba:text-2xl" data-testid="documents-title">
            {t('documents-title')}
          </div>
          <div className="gba:text-muted-foreground gba:text-lg" data-testid="documents-description">
            {t('documents-description')}
          </div>
        </div>

        <div>
          <AppAction
            variant="update-secondary"
            data-testid="employee-document-upload-button"
            contexts={[{ context: FlowContextName.documentPersonal, contextData: { employeeId: employee?.id } }]}
            prefixDataTestId="employee-document-upload"
            accessToken={accessToken}
            autoExecute={true}
          />
        </div>
      </div>

      <div className="gba:flex gba:justify-start gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:md:w-auto">
          <div className="gba:flex gba:items-center gba:gap-3 gba:w-full">
            <div className="gba:flex gba:items-center gba:w-full gba:border gba:border-border gba:rounded-md gba:bg-background gba:transition-all gba:duration-200 gba:focus-within:ring-2 gba:focus-within:ring-primary gba:focus-within:border-primary">
              <div className="gba:flex gba:items-center gba:justify-center gba:pl-3 gba:w-10 gba:text-decorative-on-card">
                <Search className="gba:w-5 gba:h-5" />
              </div>
              <DebouncedInput
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t('documents-search-placeholder')}
                className="gba:w-full gba:py-2.5 gba:pr-3 gba:border-0 gba:focus:outline-none gba:focus:ring-0 gba:focus:shadow-none gba:text-base"
                ariaLabel={t('documents-search-placeholder')}
                data-testid="document-search-input"
              />
            </div>
            <Select
              value={searchField}
              onValueChange={handleSearchFieldChange}
              data-testid="document-search-field-select"
            >
              <SelectTrigger className="gba:w-[140px]">
                <SelectValue placeholder={t('documents-search-all-fields')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('documents-search-all-fields')}</SelectItem>
                <SelectItem value="title">{t('documents-search-name')}</SelectItem>
                <SelectItem value="type">{t('documents-search-type')}</SelectItem>
                <SelectItem value="documentGroup">{t('documents-search-group')}</SelectItem>
                <SelectItem value="description">{t('documents-search-description')}</SelectItem>
                <SelectItem value="createdBy">{t('documents-search-created-by')}</SelectItem>
                <SelectItem value="uploadDate">{t('documents-search-upload-date')}</SelectItem>
                <SelectItem value="validTo">{t('documents-search-valid-to')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {searchQuery && (
        <div className="gba:text-sm gba:text-muted-foreground gba:mb-4">
          {t('documents-search-results-found')} {filteredDocuments.length}{' '}
          {filteredDocuments.length === 1 ? t('documents-count-one') : t('documents-count-other')}{' '}
          {t('documents-search-results-matching')} "{searchQuery}"
        </div>
      )}

      {(() => {
        if (loading) {
          return (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
              <Spinner size="lg" />
            </div>
          )
        }

        if (error) {
          return <div className="gba:text-center gba:py-8 gba:text-destructive">{error}</div>
        }

        const getGroupBgClass = (): string => {
          return 'gba:bg-secondary'
        }

        if (searchQuery) {
          if (filteredDocuments.length === 0) {
            return (
              <div className="gba:py-10 gba:text-center gba:text-muted-foreground">
                <Search className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
                <p>{t('documents-search-empty')}</p>
              </div>
            )
          }

          return (
            <div className="gba:space-y-2" data-testid="documents-accordion">
              {Object.entries(filteredGroupedDocuments).map(([group, docs]) => {
                if (docs.length === 0) return null

                const bgClass = getGroupBgClass()

                const displayGroupName = getTranslatedGroupName(
                  docs[0]?.documentGroupKey || group,
                  docs[0]?.documentGroup
                )

                return (
                  <Collapsible
                    key={group}
                    defaultOpen
                    className={`gba:rounded-md gba:overflow-hidden ${bgClass}`}
                    data-testid={`document-group-${group.toLowerCase()}`}
                  >
                    <CollapsibleTrigger className="gba:flex gba:items-center gba:justify-between gba:w-full gba:px-4 gba:py-3 gba:cursor-pointer gba:hover:opacity-80 gba:transition-opacity [&[data-state=open]>svg]:gba:rotate-180">
                      <span className="gba:font-medium gba:text-secondary-foreground">{displayGroupName}</span>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:text-sm gba:text-muted-foreground">
                          {docs.length} {docs.length === 1 ? t('documents-count-one') : t('documents-count-other')}
                        </span>
                        <ChevronDown className="gba:w-4 gba:h-4 gba:transition-transform gba:duration-200" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent data-testid={`document-list-${group.toLowerCase()}`}>
                      <div className="gba:bg-background">{docs.map(renderDocumentListItem)}</div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          )
        }

        return (
          <div className="gba:space-y-2" data-testid="documents-accordion">
            {Object.entries(groupedDocuments).map(([group, docs]) => {
              if (docs.length === 0) return null

              const bgClass = getGroupBgClass()

              const displayGroupName = getTranslatedGroupName(
                docs[0]?.documentGroupKey || group,
                docs[0]?.documentGroup
              )

              return (
                <Collapsible
                  key={group}
                  defaultOpen
                  className={`gba:rounded-md gba:overflow-hidden ${bgClass}`}
                  data-testid={`document-group-${group.toLowerCase()}`}
                >
                  <CollapsibleTrigger className="gba:flex gba:items-center gba:justify-between gba:w-full gba:px-4 gba:py-3 gba:cursor-pointer gba:hover:opacity-80 gba:transition-opacity [&[data-state=open]>svg]:gba:rotate-180">
                    <span className="gba:font-medium gba:text-secondary-foreground">{displayGroupName}</span>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:text-sm gba:text-muted-foreground">
                        {docs.length} {docs.length === 1 ? t('documents-count-one') : t('documents-count-other')}
                      </span>
                      <ChevronDown className="gba:w-4 gba:h-4 gba:transition-transform gba:duration-200" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent data-testid={`document-list-${group.toLowerCase()}`}>
                    <div className="gba:bg-background">{docs.map(renderDocumentListItem)}</div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )
      })()}

      <Sheet open={isViewerOpen} onOpenChange={open => !open && closeDocumentViewer()}>
        <SheetContent
          side="right"
          className="gba:w-[680px] gba:max-w-[680px] gba:sm:max-w-[680px] gba:p-0 gba:flex gba:flex-col"
          data-testid="document-viewer-drawer"
        >
          <SheetHeader className="gba:px-6 gba:py-4 gba:border-b gba:border-border">
            <SheetTitle>{currentDocument?.title || ''}</SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-auto">
            {(() => {
              if (documentLoading) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
                    <div className="gba:text-center">
                      <Spinner size="lg" />
                      <div className="gba:mt-2">{t('documents-loading')}</div>
                    </div>
                  </div>
                )
              }

              if (error) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-destructive">
                    <p>{error}</p>
                  </div>
                )
              }

              if (!documentUrl) {
                return null
              }

              const renderDocumentViewer = () => {
                if (isPdfDocument(currentDocument)) {
                  return (
                    <div className="gba:w-full gba:overflow-hidden gba:rounded-md gba:shadow-sm">
                      <object
                        data={documentUrl}
                        type="application/pdf"
                        className="gba:w-full gba:h-[500px] gba:block gba:border-0 gba:rounded-md"
                        data-testid="pdf-viewer"
                      >
                        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:p-4">
                          <p className="gba:mb-4 gba:text-center">{t('documents-browser-no-pdf')}</p>
                          <Button
                            onClick={() => {
                              if (documentUrl && currentDocument) {
                                const a = document.createElement('a')
                                a.href = documentUrl

                                let filename = ''

                                if (currentDocument.file) {
                                  const filePathMatch = currentDocument.file.match(/[^\/]+$/)
                                  if (filePathMatch && filePathMatch[0]) {
                                    filename = decodeURIComponent(filePathMatch[0])
                                  }
                                }

                                if (!filename) {
                                  filename = currentDocument.title || 'document'

                                  if (!filename.match(/\.[a-z0-9]+$/i)) {
                                    if (currentDocument.mimeType) {
                                      if (currentDocument.mimeType.includes('pdf')) {
                                        filename += '.pdf'
                                      } else if (
                                        currentDocument.mimeType.includes('jpeg') ||
                                        currentDocument.mimeType.includes('jpg')
                                      ) {
                                        filename += '.jpg'
                                      } else if (currentDocument.mimeType.includes('png')) {
                                        filename += '.png'
                                      } else if (
                                        currentDocument.mimeType.includes('word') ||
                                        currentDocument.mimeType.includes('doc')
                                      ) {
                                        filename += '.docx'
                                      } else if (
                                        currentDocument.mimeType.includes('excel') ||
                                        currentDocument.mimeType.includes('sheet')
                                      ) {
                                        filename += '.xlsx'
                                      } else if (currentDocument.mimeType.includes('text/plain')) {
                                        filename += '.txt'
                                      } else {
                                        const fileType = currentDocument.mimeType.split('/')?.[1]
                                        if (fileType) {
                                          filename += '.' + fileType.split(';')[0]
                                        }
                                      }
                                    } else if (isPdfDocument(currentDocument)) {
                                      filename += '.pdf'
                                    } else if (isImageDocument(currentDocument)) {
                                      filename += '.jpg'
                                    } else {
                                      filename += '.dat'
                                    }
                                  }
                                }

                                a.download = filename
                                a.click()
                              }
                            }}
                            className="gba:w-auto gba:flex gba:items-center gba:gap-2"
                            data-testid="pdf-download-link"
                            variant="secondary"
                          >
                            <Download className="gba:h-4 gba:w-4" />
                            {t('documents-download-pdf')}
                          </Button>
                        </div>
                      </object>
                    </div>
                  )
                }

                if (isImageDocument(currentDocument)) {
                  return (
                    <>
                      <div className="gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-md gba:shadow-sm gba:p-4 gba:w-full">
                        <img
                          src={documentUrl}
                          alt={currentDocument?.title || t('documents-count-one')}
                          className="gba:max-w-full gba:max-h-[500px] gba:object-contain gba:rounded-md"
                          onError={() => {
                            setError(t('documents-error-image-display'))
                          }}
                          data-testid="image-viewer"
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (documentUrl) {
                            const a = document.createElement('a')
                            a.href = documentUrl
                            a.download = currentDocument?.title || 'document'
                            a.click()
                          }
                        }}
                        className="gba:mt-4 gba:flex gba:items-center gba:gap-2"
                        data-testid="image-download-button"
                        variant="default"
                        size="sm"
                      >
                        <Download className="gba:h-4 gba:w-4" />
                        {t('documents-download-image')}
                      </Button>
                    </>
                  )
                }

                return (
                  <>
                    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:bg-muted gba:rounded-md gba:shadow-sm gba:min-h-[300px] gba:w-full">
                      <div className="gba:mb-6">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="gba:h-24 gba:w-24 gba:text-muted-foreground"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
                          <path d="M7 2v20"></path>
                          <path d="M17 2v20"></path>
                          <path d="M2 12h20"></path>
                          <path d="M2 7h5"></path>
                          <path d="M2 17h5"></path>
                          <path d="M17 17h5"></path>
                          <path d="M17 7h5"></path>
                        </svg>
                      </div>
                      <p className="gba:mb-4 gba:text-center gba:text-muted-foreground gba:text-base">
                        {t('documents-preview-not-available')}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        if (documentUrl) {
                          const a = document.createElement('a')
                          a.href = documentUrl
                          a.download = currentDocument?.title || 'document'
                          a.click()
                        }
                      }}
                      className="gba:mt-4 gba:flex gba:items-center gba:gap-2"
                      data-testid="document-download-button"
                      variant="default"
                      size="sm"
                    >
                      <Download className="gba:h-4 gba:w-4" />
                      {t('documents-download')}
                    </Button>
                  </>
                )
              }

              return (
                <div className="gba:flex gba:flex-col gba:w-full">
                  {/* Document viewer - top */}
                  <div className="gba:w-full gba:min-h-[400px] gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-6">
                    {renderDocumentViewer()}
                  </div>

                  <div className="gba:w-full gba:p-6 gba:bg-muted gba:border-t gba:border-border gba:mt-2">
                    <div className="gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-5">
                      <div>
                        <div className="gba:font-medium gba:text-sm gba:text-muted-foreground">
                          {t('documents-detail-name')}
                        </div>
                        <div className="gba:mt-1 gba:text-sm">{currentDocument?.title || t('documents-detail-na')}</div>
                      </div>

                      <div>
                        <div className="gba:font-medium gba:text-sm gba:text-muted-foreground">
                          {t('documents-detail-group')}
                        </div>
                        <div className="gba:mt-1 gba:text-sm">
                          {currentDocument?.documentGroup || t('documents-detail-na')}
                        </div>
                      </div>

                      <div>
                        <div className="gba:font-medium gba:text-sm gba:text-muted-foreground">
                          {t('documents-detail-type')}
                        </div>
                        <div className="gba:mt-1 gba:text-sm">{currentDocument?.type || t('documents-detail-na')}</div>
                      </div>

                      <div>
                        <div className="gba:font-medium gba:text-sm gba:text-muted-foreground">
                          {t('documents-detail-upload-date')}
                        </div>
                        <div className="gba:mt-1 gba:text-sm">
                          {currentDocument?.createdAt
                            ? formatDate(currentDocument.createdAt)
                            : currentDocument?.uploadDate
                              ? formatDate(currentDocument.uploadDate)
                              : t('documents-detail-na')}
                        </div>
                      </div>

                      <div>
                        <div className="gba:font-medium gba:text-sm gba:text-muted-foreground">
                          {t('documents-detail-uploaded-by')}
                        </div>
                        <div className="gba:mt-1 gba:text-sm">
                          {currentDocument?.createdBy || t('documents-detail-na')}
                        </div>
                      </div>

                      <div>
                        <div className="gba:font-medium gba:text-sm gba:text-muted-foreground">
                          {t('documents-detail-expiration-date')}
                        </div>
                        <div className="gba:mt-1 gba:text-sm">
                          {currentDocument?.validTo ? (
                            <span
                              className={`gba:px-2 gba:py-1 gba:rounded-full gba:text-xs ${currentDocument.validTo < dayjs().format('YYYY-MM-DD') ? 'gba:bg-warning-secondary gba:text-warning' : 'gba:bg-success-secondary gba:text-success-secondary-foreground'}`}
                            >
                              {formatDate(currentDocument.validTo)}
                            </span>
                          ) : (
                            t('documents-detail-na')
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="gba:mt-6">
                      <div className="gba:font-medium gba:text-sm gba:text-muted-foreground">
                        {t('documents-detail-description')}
                      </div>
                      <div className="gba:mt-1 gba:text-sm gba:bg-primary-foreground gba:p-3 gba:rounded gba:border gba:border-border">
                        {currentDocument?.description || t('documents-detail-no-description')}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
          {canEditDocuments && currentDocument && (
            <SheetFooter className="gba:px-6 gba:py-4 gba:border-t gba:border-border">
              <Button
                variant="destructive"
                onClick={() => handleDeleteClick(currentDocument)}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid="document-drawer-delete-button"
              >
                <Trash2 className="gba:w-4 gba:h-4" />
                {t('documents-delete-title')}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirmPopup
        isOpen={deleteConfirmOpen}
        onClose={handleCancelDelete}
        itemTitle={documentToDelete?.title || ''}
        itemType={t('documents-count-one')}
        customTitle={t('documents-delete-title')}
        customMessage={t('documents-delete-confirm-message', { documentName: documentToDelete?.title || '' })}
        warningText={t('documents-delete-warning')}
        confirmButtonText={t('documents-delete-confirm-button')}
        cancelButtonText={t('documents-delete-cancel-button')}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        data-testid="document-delete-confirmation"
      />
    </div>
  )
}

export default DocumentsTab
