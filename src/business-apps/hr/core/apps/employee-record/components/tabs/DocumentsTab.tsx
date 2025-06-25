'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Employee } from '../../hooks/useEmployeeData';
import { Spin, Empty, Select, Drawer, Collapse, List } from 'antd';
import { Button } from '@newwork/gravity-ui-catalog';
import { SearchOutlined, CaretRightOutlined, FileOutlined, FilePdfOutlined, FileImageOutlined, FileExcelOutlined, FileWordOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/plugin/weekday';
import 'dayjs/plugin/localeData';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { useFileClient } from '@/common/network/files/useFileClient';
import { employeeDocumentsQuery, documentTypeCatalogQuery } from '../../queries/documentQueries';
import { startProcess } from '@/common/utils/start-process';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface DocumentsTabProps {
  employee: Employee;
  accessToken: string;
}

interface EmployeeDocument {
  id: string;
  name: string;
  file: string;
  type: string;
  mimeType: string;
  documentGroup: string;
  createdBy: string;
  description: string;
  employeeId: string;
  createdAt: string;
  validTo: string | null;
  url?: string; // Optional URL field
}

interface DocumentType {
  id: string;
  value: string;
  code: string;
}

interface Document {
  id: string;
  title: string;
  name?: string; // Document name
  type: string;
  typeValue: string;
  documentGroup?: string; // Document group
  description?: string; // Description
  createdBy?: string; // Upload by
  createdAt?: string; // Upload date
  uploadDate: string;
  validTo: string | null;
  size?: string;
  file: string;
  mimeType: string;
  fileId?: string;
}

/**
 * Documents Tab Component
 * Displays documents related to the employee
 */
const DocumentsTab: React.FC<DocumentsTabProps> = ({ employee, accessToken }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(680);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentBlob, setDocumentBlob] = useState<Blob | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  
  // Search functionality state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('all');
  
  // Document preview state
  const [documentPreviews, setDocumentPreviews] = useState<Record<string, string>>({});
  const [previewsLoading, setPreviewsLoading] = useState<Record<string, boolean>>({});
  
  // For tracking if the component is mounted (to prevent state updates after unmount)
  const isMounted = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      
      // Clean up any blob URLs when component unmounts
      if (documentUrl && documentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [documentUrl]);

  const graphQLClient = useGraphqlClient(accessToken);
  
  // FileClient hook with proper BusinessAppContext for authentication
  const fileClient = useFileClient({
    accessToken
  });

  // Using FileClient for document downloads
  // Note: We no longer need flowClient as we're using startProcess directly

  // Function to trigger startProcess directly for uploading documents
  const showUploadModal = () => {
    startProcess({
      domain: 'employee',
      processName: 'uploadEmployeeDocument',
      payload: {
        employeeDocument: {
          employeeId: employee.id
        }
      }
    });
  };

  // Function to fetch documents and document types/groups
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch employee documents using the first query
      const screenDataResponse = await graphQLClient.request(
        employeeDocumentsQuery,
        {
          employeeId: employee.id
        }
      );
      
      // Extract document data, document types, and document groups from the response
      const employeeDocuments: EmployeeDocument[] = screenDataResponse?.EmployeeDocument || [];
      const documentGroups = screenDataResponse?.documentGroup || [];
      
      // Create a map of document group ID to document group display value
      const documentGroupMap: Record<string, string> = {};
      documentGroups.forEach((group: any) => {
        // Check if there's a translation for the current locale
        const translation = group.translations && group.translations.length > 0 ? 
          group.translations[0].value : group.value;
        documentGroupMap[group.id] = translation;
      });
      
      // Get type references to fetch detailed type information with second query
      const documentTypeRefs = employeeDocuments
        .map(doc => doc.type)
        .filter(Boolean);
        
      let typeDetailsMap: Record<string, DocumentType> = {};
        
      if (documentTypeRefs.length > 0) {
        // Fetch document type details using the second query
        const catalogDataResponse = await graphQLClient.request(
          documentTypeCatalogQuery,
          {
            documentTypeRefs
          }
        );
        
        // Create a map of document type ID to document type details
        const catalogEntries: DocumentType[] = catalogDataResponse?.CatalogEntry || [];
        typeDetailsMap = catalogEntries.reduce((acc, entry) => {
          acc[entry.id] = entry;
          return acc;
        }, {} as Record<string, DocumentType>);
      }
      
      // Transform the API response to our Document interface
      const formattedDocuments: Document[] = employeeDocuments.map(doc => {
        // Extract fileId from file URL if present
        let fileId: string | undefined = undefined;
        if (doc.file) {
          const fileUrlMatch = doc.file.match(/files\/([\w\d-]+)/i);
          if (fileUrlMatch && fileUrlMatch[1]) {
            fileId = fileUrlMatch[1];
          }
        }
        
        return {
          id: doc.id,
          title: doc.name,
          name: doc.name,
          type: doc.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown',
          typeValue: typeDetailsMap[doc.type]?.value || 'Other',
          documentGroup: documentGroupMap[doc.documentGroup] || 'Other',
          description: doc.description,
          createdBy: doc.createdBy,
          createdAt: doc.createdAt,
          uploadDate: doc.createdAt,
          validTo: doc.validTo,
          file: doc.file,
          mimeType: doc.mimeType,
          fileId: fileId
        };
      });
      
      // Sort documents by upload date in descending order (newest first)
      const sortedDocuments = [...formattedDocuments].sort((a, b) => {
        // Convert dates to timestamps for comparison
        const dateA = new Date(a.uploadDate).getTime();
        const dateB = new Date(b.uploadDate).getTime();
        return dateB - dateA; // Descending order
      });
      
      setDocuments(sortedDocuments);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [employee?.id]);
  
  // Load document previews for visible documents
  useEffect(() => {
    const loadDocumentPreviews = async () => {
      // Only load previews for the first few documents to avoid performance issues
      const previewableDocuments = documents
        .filter(doc => isImageDocument(doc) || isPdfDocument(doc))
        .slice(0, 6); // Limit to 6 previews at a time
      
      if (previewableDocuments.length === 0) return;
      
      for (const doc of previewableDocuments) {
        // Skip if we already have a preview or are loading it
        if (documentPreviews[doc.id] || previewsLoading[doc.id]) continue;
        
        try {
          setPreviewsLoading(prev => ({ ...prev, [doc.id]: true }));
          
          if (doc.file) {
            const blob = await fileClient.getFile(
              { 
                accessScope: "tenant", 
                fileId: doc.file 
              },
              {
                appName: "employee-profile",
                folderPath: `/documents/${employee?.id}`
              }
            );
            
            if (blob && blob.size > 0) {
              let url;
              if (isPdfDocument(doc)) {
                const typedBlob = new Blob([blob], { type: 'application/pdf' });
                url = URL.createObjectURL(typedBlob);
              } else {
                url = URL.createObjectURL(blob);
              }
              
              if (isMounted.current) {
                setDocumentPreviews(prev => ({ ...prev, [doc.id]: url }));
              }
            }
          }
        } catch (err) {
          console.error(`Failed to load preview for document ${doc.id}:`, err);
        } finally {
          if (isMounted.current) {
            setPreviewsLoading(prev => ({ ...prev, [doc.id]: false }));
          }
        }
      }
    };
    
    loadDocumentPreviews();
    
    // Cleanup function to revoke object URLs
    return () => {
      Object.values(documentPreviews).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [documents, fileClient, employee?.id]);

  // Handle search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Handle search field changes
  const handleSearchFieldChange = (value: string) => {
    setSearchField(value);
  };

  // Group documents by document group
  const groupedDocuments = useMemo(() => {
    const groups: { [key: string]: Document[] } = {
      'Salary': [],
      'Expenses': [],
      'Development': [],
      'Personal': [],
      'Other': [] // For documents with undefined or other groups
    };
    
    // Group documents
    documents.forEach(doc => {
      const group = doc.documentGroup;
      if (group && ['Salary', 'Expenses', 'Development', 'Personal'].includes(group)) {
        groups[group].push(doc);
      } else {
        groups['Other'].push(doc);
      }
    });
    
    return groups;
  }, [documents]);
  
  // Filter documents based on search query and field
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    
    const query = searchQuery.toLowerCase().trim();
    
    return documents.filter(doc => {
      if (searchField === 'all') {
        // Search in all fields
        return (
          (doc.title?.toLowerCase().includes(query)) ||
          (doc.type?.toLowerCase().includes(query)) ||
          (doc.typeValue?.toLowerCase().includes(query)) ||
          (doc.documentGroup?.toLowerCase().includes(query)) ||
          (doc.description?.toLowerCase().includes(query)) ||
          (doc.createdBy?.toLowerCase().includes(query)) ||
          (doc.uploadDate && dayjs(doc.uploadDate).format('MMM D, YYYY').toLowerCase().includes(query)) ||
          (doc.validTo && dayjs(doc.validTo).format('MMM D, YYYY').toLowerCase().includes(query))
        );
      } else {
        // Search in specific field
        switch (searchField) {
          case 'title':
            return doc.title?.toLowerCase().includes(query);
          case 'type':
            return doc.type?.toLowerCase().includes(query) || doc.typeValue?.toLowerCase().includes(query);
          case 'documentGroup':
            return doc.documentGroup?.toLowerCase().includes(query);
          case 'description':
            return doc.description?.toLowerCase().includes(query);
          case 'createdBy':
            return doc.createdBy?.toLowerCase().includes(query);
          case 'uploadDate':
            return doc.uploadDate && dayjs(doc.uploadDate).format('MMM D, YYYY').toLowerCase().includes(query);
          case 'validTo':
            return doc.validTo && dayjs(doc.validTo).format('MMM D, YYYY').toLowerCase().includes(query);
          default:
            return false;
        }
      }
    });
  }, [documents, searchQuery, searchField]);
  
  // Filter and group documents based on search query
  const filteredGroupedDocuments = useMemo(() => {
    const groups: { [key: string]: Document[] } = {
      'Salary': [],
      'Expenses': [],
      'Development': [],
      'Personal': [],
      'Other': [] // For documents with undefined or other groups
    };
    
    // Group filtered documents
    filteredDocuments.forEach(doc => {
      const group = doc.documentGroup;
      if (group && ['Salary', 'Expenses', 'Development', 'Personal'].includes(group)) {
        groups[group].push(doc);
      } else {
        groups['Other'].push(doc);
      }
    });
    
    return groups;
  }, [filteredDocuments]);

  // Function to handle opening a document in the viewer
  const openDocumentViewer = async (document: Document) => {
    try {
      // Reset previous state
      setError(null);
      setDocumentBlob(null);
      setDocumentUrl(null);

      setCurrentDocument(document);
      
      // Set drawer width based on document type
      if (isPdfDocument(document)) {
        setDrawerWidth(800);
      } else if (isImageDocument(document)) {
        setDrawerWidth(680);
      } else {
        setDrawerWidth(680);
      }
      
      setIsViewerOpen(true);
      setDocumentLoading(true);

      if (document.file) {
        try {
          setDocumentBlob(null);
          setDocumentUrl(null);

          const blob = await fileClient.getFile(
            { 
              accessScope: "tenant", 
              fileId: document.file 
            },
            {
              appName: "employee-profile",
              folderPath: `/documents/${employee?.id}`
            }
          );

          if (blob && blob.size > 0) {
            if (blob.type && !document.mimeType) {
              document.mimeType = blob.type;
            }

            setDocumentBlob(blob);
          } else {
            throw new Error('Failed to retrieve document content or empty response');
          }
        } catch (fileClientErr) {
          try {
            if (document.file) {
              window.open(document.file, '_blank');
            } else {
              throw new Error('No document file ID available');
            }
          } catch (fallbackErr) {
            setError('Unable to display the document. Please try again later.');
          }
        }
      } else {
        throw new Error('No file information available');
      }
    } catch (err) {
      setError(`Could not load document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDocumentLoading(false);
    }
  };

  const closeDocumentViewer = () => {
    setIsViewerOpen(false);
    setCurrentDocument(null);
    setError(null);
    setDocumentBlob(null);
    setDocumentUrl(null);
  };

  useEffect(() => {
    if (documentBlob) {
      try {
        if (documentBlob.size === 0) {
          throw new Error('Empty blob received');
        }
        
        // Create a properly typed blob for PDFs to ensure correct rendering
        if (currentDocument && isPdfDocument(currentDocument)) {
          // Create a new blob with explicit PDF MIME type
          const typedBlob = new Blob([documentBlob], { type: 'application/pdf' });
          const url = URL.createObjectURL(typedBlob);
          setDocumentUrl(url);
        } else {
          // For other document types, use the original blob
          const url = URL.createObjectURL(documentBlob);
          setDocumentUrl(url);
        }

        return () => {
          if (documentUrl) {
            URL.revokeObjectURL(documentUrl);
            setDocumentUrl(null);
          }
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to create document preview: ${errorMessage}`);
      }
    } else {
      setDocumentUrl(null);
    }
  }, [documentBlob, currentDocument]);

  const isPdfDocument = (document: Document | null): boolean => {
    if (!document) return false;
    return Boolean(
      (document.mimeType && document.mimeType.includes('pdf')) ||
      (document.file && document.file.toLowerCase().endsWith('.pdf'))
    );
  };

  const isImageDocument = (document: Document | null): boolean => {
    if (!document) return false;
    return Boolean(
      (document.mimeType && document.mimeType.includes('image')) ||
      (document.file && /\.(jpe?g|gif|png|bmp|svg)$/i.test(document.file))
    );
  };

  // Format date helper function
  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('MMM D, YYYY');
  };

  // Get document type icon based on mime type or file extension
  const getDocumentTypeIcon = (document: Document) => {
    // Check if it's an image
    if (isImageDocument(document)) {
      return <FileImageOutlined className="gba:text-blue-500 gba:text-lg" />;
    }
    
    // Check if it's a PDF
    if (isPdfDocument(document)) {
      return <FilePdfOutlined className="gba:text-red-500 gba:text-lg" />;
    }
    
    // Check for Excel files
    if (document.mimeType?.includes('excel') || document.mimeType?.includes('spreadsheet') || 
        document.name?.toLowerCase().endsWith('.xlsx') || document.name?.toLowerCase().endsWith('.xls')) {
      return <FileExcelOutlined className="gba:text-green-600 gba:text-lg" />;
    }
    
    // Check for Word files
    if (document.mimeType?.includes('word') || document.mimeType?.includes('document') || 
        document.name?.toLowerCase().endsWith('.docx') || document.name?.toLowerCase().endsWith('.doc')) {
      return <FileWordOutlined className="gba:text-blue-700 gba:text-lg" />;
    }
    
    // Default file icon for other types
    return <FileOutlined className="gba:text-gray-500 gba:text-lg" />;
  };

  // Function to render a document list item
  const renderDocumentListItem = (document: Document) => {
    return (
      <List.Item
        key={document.id}
        className="gba:px-4 gba:py-3 gba:border-b gba:border-gray-100 gba:hover:bg-gray-50 gba:cursor-pointer gba:transition-colors"
        onClick={() => openDocumentViewer(document)}
        data-testid={`document-list-item-${document.id}`}
      >
        <div className="gba:flex gba:items-center gba:w-full">
          <div className="gba:mr-3">
            {getDocumentTypeIcon(document)}
          </div>
          <div className="gba:flex-grow gba:min-w-0">
            <div className="gba:font-medium gba:text-sm gba:truncate" title={document.title}>
              {document.title}
            </div>
            <div className="gba:text-xs gba:text-gray-500 gba:truncate" title={document.typeValue}>
              {document.typeValue}
            </div>
          </div>
          <div className="gba:ml-4 gba:flex gba:flex-col gba:items-end gba:text-xs gba:text-gray-500 gba:gap-2">
            <div>{formatDate(document.uploadDate)}</div>
            {document.validTo && (
              <div 
                className={`gba:px-2 gba:py-0.5 gba:rounded-md gba:text-xs gba:text-white gba:font-medium ${document.validTo < dayjs().format('YYYY-MM-DD') ? 'gba:bg-red-500' : 'gba:bg-green-500'}`}
                title={document.validTo < dayjs().format('YYYY-MM-DD') ? 'Document has expired' : 'Document is valid'}
                data-testid={`document-validity-indicator-${document.id}`}
              >
                {document.validTo < dayjs().format('YYYY-MM-DD') ? 'Expired' : 'Valid'}
              </div>
            )}
          </div>
        </div>
      </List.Item>
    );
  };

// ... (rest of the code remains the same)
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:text-center gba:text-red-600 gba:py-8">
        <p>{error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="gba:space-y-4" data-testid="documents-tab-container">
        {/* Documents Overview Headline with Action Button */}
        <div className="gba:flex gba:justify-between gba:items-start" data-testid="documents-header">
          <div className="gba:documents-header">
            <div
              className="gba:font-bold gba:text-2xl"
              data-testid="documents-title"
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:hr_documents.documents_overview",
                "Documents Overview"
              )}
            </div>
            <div
              className="gba:text-gray-500 gba:text-lg"
              data-testid="documents-description"
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:hr_documents.documents_description",
                "View and manage employee documents"
              )}
            </div>
          </div>
          
          {/* Upload document button */}
          <div>
            <AppActionButton
              data-testid="upload-document-button"
              variant="primary"
              contextsArray={[FlowContextName.documentPersonal]}
              externalContextData={{
                employeeId: employee?.id
              }}
              prefixDataTestId="upload-document"
              accessToken={accessToken}
              autoExecuteSingleAction={true}
            >
              Upload Document
            </AppActionButton>
          </div>
        </div>

        <Empty 
          description="No documents available" 
          className="gba:py-10" 
          data-testid="empty-documents-state"
        />
      </div>
    );
  }

  return (
    <div className="gba:space-y-4" data-testid="documents-tab-container">
      {/* Documents Overview Headline with Action Button */}
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="documents-header">
        <div className="gba:documents-header">
          <div
            className="gba:font-bold gba:text-2xl"
            data-testid="documents-title"
          >
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_documents.documents_overview",
              "Documents Overview"
            )}
          </div>
          <div
            className="gba:text-gray-500 gba:text-lg"
            data-testid="documents-description"
          >
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_documents.documents_description",
              "View and manage employee documents"
            )}
          </div>
        </div>
        
        {/* Upload button */}
        <div>
          <AppActionButton
            onClick={showUploadModal}
            data-testid="upload-document-button"
            variant="primary"
            contextsArray={[FlowContextName.documentPersonal]}
            externalContextData={{
              employeeId: employee?.id
            }}
            prefixDataTestId="upload-document"
            accessToken={accessToken}
            autoExecuteSingleAction={true}
          >
            Upload Document
          </AppActionButton>
        </div>
      </div>
      
      {/* Search section */}
      <div className="gba:flex gba:justify-start gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:md:w-auto">
          <div className="gba:flex gba:items-center gba:gap-3 gba:w-full">
            <div className="gba:flex gba:items-center gba:w-full gba:border gba:border-gray-200 gba:rounded-md gba:shadow-md gba:bg-white gba:transition-all gba:duration-200 gba:hover:shadow-lg gba:focus-within:ring-2 gba:focus-within:ring-blue-500 gba:focus-within:border-blue-500">
              <div className="gba:flex gba:items-center gba:justify-center gba:pl-3 gba:w-10 gba:text-blue-500">
                <SearchOutlined className="gba:text-lg" />
              </div>
              <DebouncedInput
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search documents..."
                className="gba:w-full gba:py-2.5 gba:pr-3 gba:border-0 gba:focus:outline-none gba:focus:ring-0 gba:focus:shadow-none gba:text-base"
                ariaLabel="Search documents"
                data-testid="document-search-input"
              />
            </div>
            <Select
              value={searchField}
              onChange={handleSearchFieldChange}
              style={{ width: 140, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
              options={[
                { value: 'all', label: 'All Fields' },
                { value: 'title', label: 'Name' },
                { value: 'type', label: 'Type' },
                { value: 'documentGroup', label: 'Group' },
                { value: 'description', label: 'Description' },
                { value: 'createdBy', label: 'Created By' },
                { value: 'uploadDate', label: 'Upload Date' },
                { value: 'validTo', label: 'Valid To' }
              ]}
              data-testid="document-search-field-select"
            />
          </div>
        </div>
      </div>

      {/* Search results info */}
      {searchQuery && (
        <div className="gba:text-sm gba:text-gray-500 gba:mb-4">
          Found {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
          {searchField !== 'all' ? ` with ${searchField}` : ''} matching "{searchQuery}"
        </div>
      )}
      
      {loading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="gba:text-center gba:py-8 gba:text-red-500">
          {error}
        </div>
      ) : searchQuery ? (
        filteredDocuments.length === 0 ? (
          <Empty description="No documents match your search" />
        ) : (
          <Collapse 
            expandIcon={({ isActive }) => (
              <CaretRightOutlined rotate={isActive ? 90 : 0} className="gba:text-blue-600" />
            )}
            className="gba:bg-white gba:border-0 gba:shadow-sm"
            defaultActiveKey={['Salary', 'Expenses', 'Development', 'Personal', 'Other']}
            data-testid="documents-accordion"
          >
            {Object.entries(filteredGroupedDocuments).map(([group, docs]) => {
              if (docs.length === 0) return null;
              
              return (
                <Collapse.Panel 
                  key={group} 
                  header={
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <span className="gba:font-medium">{group}</span>
                      <span className="gba:text-sm gba:text-gray-500">{docs.length} {docs.length === 1 ? 'document' : 'documents'}</span>
                    </div>
                  }
                  className="gba:border-0 gba:mb-2 gba:rounded-md gba:overflow-hidden"
                  data-testid={`document-group-${group.toLowerCase()}`}
                >
                  <List
                    className="gba:border-0"
                    dataSource={docs}
                    renderItem={renderDocumentListItem}
                    data-testid={`document-list-${group.toLowerCase()}`}
                  />
                </Collapse.Panel>
              );
            })}
          </Collapse>
        )
      ) : (
        <Collapse 
          expandIcon={({ isActive }) => (
            <CaretRightOutlined rotate={isActive ? 90 : 0} className="gba:text-blue-600" />
          )}
          className="gba:bg-white gba:border-0 gba:shadow-sm"
          defaultActiveKey={['Salary', 'Expenses', 'Development', 'Personal', 'Other']}
          data-testid="documents-accordion"
        >
          {Object.entries(groupedDocuments).map(([group, docs]) => {
            if (docs.length === 0) return null;
            
            return (
              <Collapse.Panel 
                key={group} 
                header={
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:font-medium">{group}</span>
                    <span className="gba:text-sm gba:text-gray-500">{docs.length} {docs.length === 1 ? 'document' : 'documents'}</span>
                  </div>
                }
                className="gba:border-0 gba:mb-2 gba:rounded-md gba:overflow-hidden"
                data-testid={`document-group-${group.toLowerCase()}`}
              >
                <List
                  className="gba:border-0"
                  dataSource={docs}
                  renderItem={renderDocumentListItem}
                  data-testid={`document-list-${group.toLowerCase()}`}
                />
              </Collapse.Panel>
            );
          })}
        </Collapse>
      )}

        <Drawer
          title={currentDocument?.title || ''}
          open={isViewerOpen}
          onClose={closeDocumentViewer}
          width={drawerWidth}
          styles={{
            body: { 
              padding: 0,
              overflow: 'auto',
              height: 'calc(100% - 55px)'
            },
            header: {
              padding: '16px 24px',
              borderBottom: '1px solid #f0f0f0'
            }
          }}
          placement="right"
          destroyOnClose
          data-testid="document-viewer-drawer"
          maskClosable
          footer={null}
        >
        {documentLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <div className="gba:text-center">
              <Spin size="large" />
              <div className="gba:mt-2">Loading document...</div>
            </div>
          </div>
        ) : error ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-red-600">
            <p>{error}</p>
          </div>
        ) : documentUrl ? (
          <div className="gba:flex gba:flex-col gba:w-full">
            {/* Document viewer - top */}
            <div className="gba:w-full gba:min-h-[400px] gba:flex gba:items-center gba:justify-center gba:p-6 gba:pb-8">
            {isPdfDocument(currentDocument) ? (
                <div className="gba:w-full gba:overflow-hidden gba:rounded-md gba:shadow-sm">
                  <object
                    data={documentUrl}
                    type="application/pdf"
                    className="gba:w-full gba:border-0 gba:rounded-md"
                    style={{ width: '100%', height: '500px', display: 'block', border: 'none' }}
                    data-testid="pdf-viewer"
                  >
                    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:p-4">
                      <p className="gba:mb-4 gba:text-center">
                        Your browser cannot display the PDF inline.
                        <br />
                        Please download the document to view it.
                      </p>
                      <Button 
                        onClick={() => {
                          if (documentUrl && currentDocument) {
                            const a = document.createElement('a');
                            a.href = documentUrl;
                            
                            // More robust file extension handling
                            let filename = '';
                            
                            // Option 1: Try to extract original filename from file path if exists
                            if (currentDocument.file) {
                              const filePathMatch = currentDocument.file.match(/[^\/]+$/); // Extract filename from path
                              if (filePathMatch && filePathMatch[0]) {
                                filename = decodeURIComponent(filePathMatch[0]);
                              }
                            }
                            
                            // Option 2: If no path or couldn't extract, build filename from title and type
                            if (!filename) {
                              filename = currentDocument.title || 'document';
                              
                              // Add extension if missing
                              if (!filename.match(/\.[a-z0-9]+$/i)) {
                                // Check document mime type
                                if (currentDocument.mimeType) {
                                  if (currentDocument.mimeType.includes('pdf')) {
                                    filename += '.pdf';
                                  } else if (currentDocument.mimeType.includes('jpeg') || currentDocument.mimeType.includes('jpg')) {
                                    filename += '.jpg';
                                  } else if (currentDocument.mimeType.includes('png')) {
                                    filename += '.png';
                                  } else if (currentDocument.mimeType.includes('word') || currentDocument.mimeType.includes('doc')) {
                                    filename += '.docx';
                                  } else if (currentDocument.mimeType.includes('excel') || currentDocument.mimeType.includes('sheet')) {
                                    filename += '.xlsx';
                                  } else if (currentDocument.mimeType.includes('text/plain')) {
                                    filename += '.txt';
                                  } else {
                                    // Fallback to generic extension from mime type
                                    const fileType = currentDocument.mimeType.split('/')?.[1];
                                    if (fileType) {
                                      filename += '.' + fileType.split(';')[0]; // Remove any parameters from mime type
                                    }
                                  }
                                } else if (isPdfDocument(currentDocument)) {
                                  filename += '.pdf';
                                } else if (isImageDocument(currentDocument)) {
                                  filename += '.jpg'; // Default image extension
                                } else {
                                  filename += '.dat'; // Generic binary data
                                }
                              }
                            }
                            
                            a.download = filename;
                            a.click();
                          }
                        }}
                        className="gba:w-auto"
                        data-testid="pdf-download-link"
                        variant="secondary"
                        iconPosition="start"
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        }
                      >
                        Download PDF
                      </Button>
                    </div>
                  </object>
                </div>
              ) : isImageDocument(currentDocument) ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:bg-gray-50 gba:rounded-md gba:shadow-sm gba:p-4">
                  <img 
                    src={documentUrl}
                    alt={currentDocument?.title || 'Document'}
                    className="gba:max-w-full gba:object-contain gba:rounded-md"
                    style={{ maxWidth: '100%', maxHeight: '500px' }}
                    onError={() => {
                      setError('The image could not be displayed. It may be in an unsupported format.');
                    }}
                    data-testid="image-viewer"
                  />
                </div>
              ) : (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:bg-gray-50 gba:rounded-md gba:shadow-sm gba:min-h-[300px]">
                  <div className="gba:mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-24 gba:w-24 gba:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
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
                  <p className="gba:mb-4 gba:text-center gba:text-gray-500 gba:text-base">This document type cannot be previewed directly.</p>
                  <Button 
                    onClick={() => {
                      if (documentUrl) {
                        const a = document.createElement('a');
                        a.href = documentUrl;
                        a.download = currentDocument?.title || 'document';
                        a.click();
                      }
                    }}
                    className="gba:mt-2"
                    data-testid="document-download-button-preview"
                    variant="primary"
                    size="small"
                    iconPosition="start"
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    }
                  >
                    Download
                  </Button>
                </div>
              )}
            </div>
            
            {/* Document details - bottom */}
            <div className="gba:w-full gba:p-6 gba:bg-gray-50 gba:border-t gba:border-gray-200 gba:mt-2">
              {/* Details section */}
              
              <div className="gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-5">
                <div>
                  <div className="gba:font-medium gba:text-sm gba:text-gray-500">Document Name</div>
                  <div className="gba:mt-1 gba:text-sm">{currentDocument?.title || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="gba:font-medium gba:text-sm gba:text-gray-500">Document Group</div>
                  <div className="gba:mt-1 gba:text-sm">{currentDocument?.documentGroup || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="gba:font-medium gba:text-sm gba:text-gray-500">Document Type</div>
                  <div className="gba:mt-1 gba:text-sm">{currentDocument?.type || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="gba:font-medium gba:text-sm gba:text-gray-500">Upload Date</div>
                  <div className="gba:mt-1 gba:text-sm">
                    {currentDocument?.createdAt ? dayjs(currentDocument.createdAt).format('MMM D, YYYY') : 
                     currentDocument?.uploadDate ? dayjs(currentDocument.uploadDate).format('MMM D, YYYY') : 'N/A'}
                  </div>
                </div>
                
                <div>
                  <div className="gba:font-medium gba:text-sm gba:text-gray-500">Uploaded By</div>
                  <div className="gba:mt-1 gba:text-sm">{currentDocument?.createdBy || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="gba:font-medium gba:text-sm gba:text-gray-500">Expiration Date</div>
                  <div className="gba:mt-1 gba:text-sm">
                    {currentDocument?.validTo ? (
                      <span className={`gba:px-2 gba:py-1 gba:rounded-full gba:text-xs ${currentDocument.validTo < dayjs().format('YYYY-MM-DD') ? 'gba:bg-yellow-100 gba:text-yellow-800' : 'gba:bg-green-100 gba:text-green-800'}`}>
                        {dayjs(currentDocument.validTo).format('MMM D, YYYY')}
                      </span>
                    ) : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="gba:mt-6">
                <div className="gba:font-medium gba:text-sm gba:text-gray-500">Description</div>
                <div className="gba:mt-1 gba:text-sm gba:bg-white gba:p-3 gba:rounded gba:border gba:border-gray-200">
                  {currentDocument?.description || 'No description provided'}
                </div>
              </div>
              
              <div className="gba:mt-6 gba:flex gba:flex-row gba:gap-4">
                <Button 
                  onClick={() => {
                    if (documentUrl) {
                      const a = document.createElement('a');
                      a.href = documentUrl;
                      a.download = currentDocument?.title || 'document';
                      a.click();
                    }
                  }}
                  className="gba:flex-1"
                  data-testid="document-download-button"
                  variant="primary"
                  iconPosition="start"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  }
                >
                  Download
                </Button>
                <Button 
                  onClick={closeDocumentViewer}
                  className="gba:flex-1"
                  data-testid="document-close-button"
                  variant="secondary"
                  iconPosition="start"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  }
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <p>No document content available</p>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DocumentsTab;
