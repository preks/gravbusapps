'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';
import { DataCards } from '@/business-apps/hr/employeeProfile/components/DataCards';
import { Modal, Spin, Divider } from 'antd';
import { Button } from '@newwork/gravity-ui-catalog';
import dayjs from 'dayjs';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { useFileClient } from '@/common/network/files/useFileClient';
import { employeeDocumentsQuery, documentTypeCatalogQuery } from '../../queries/documentQueries';

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
  const [modalWidth, setModalWidth] = useState("70%");
  const [modalHeight, setModalHeight] = useState("80%");
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentBlob, setDocumentBlob] = useState<Blob | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  
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

  useEffect(() => {
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
        
        // Extract document data and document types from the response
        const employeeDocuments: EmployeeDocument[] = screenDataResponse?.EmployeeDocument || [];
        
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
            type: doc.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown',
            typeValue: typeDetailsMap[doc.type]?.value || 'Other',
            uploadDate: doc.createdAt,
            validTo: doc.validTo,
            file: doc.file,
            mimeType: doc.mimeType,
            fileId: fileId
          };
        });
        
        setDocuments(formattedDocuments);
      } catch (err) {
        setError('Failed to load documents');
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    };

    if (employee?.id && accessToken) {
      fetchDocuments();
    } else {
      setLoading(false);
      setDocuments([]);
    }
  }, [employee?.id]);

  // Function to handle opening a document in the viewer
  const openDocumentViewer = async (document: Document) => {
    try {
      // Reset previous state
      setError(null);
      setDocumentBlob(null);
      setDocumentUrl(null);

      setCurrentDocument(document);
      
      // Set modal width and height based on document type
      if (isPdfDocument(document)) {
        setModalWidth("80%");
        setModalHeight("85vh");
      } else if (isImageDocument(document)) {
        setModalWidth("50%");
        setModalHeight("75%");
      } else {
        setModalWidth("70%");
        setModalHeight("70%");
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

        const url = URL.createObjectURL(documentBlob);
        setDocumentUrl(url);

        return () => {
          if (url) {
            URL.revokeObjectURL(url);
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
  }, [documentBlob]);

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

  const renderDocumentCard = (document: Document) => {
    return (
      <Card key={document.id} className="gba:p-4 gba:h-full gba:flex gba:flex-col" data-testid={`document-card-${document.id}`}>
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
          <div className="gba:grow">
            <h3 className="gba:text-lg gba:font-medium">{document.title}</h3>
            <p className="gba:text-sm gba:text-gray-500">{document.type || 'Unknown'}</p>
          </div>
          <div className="gba:shrink-0">
            <span className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium ${
              document.validTo ? document.validTo > dayjs().format('YYYY-MM-DD') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
            }`}>
              {document.validTo && document.validTo < dayjs().format('YYYY-MM-DD') ? 'Expired' : 'Valid'}
            </span>
          </div>
        </div>
        
        <div className="gba:mt-2 gba:text-sm gba:text-gray-500">
          <div className="gba:flex gba:justify-between">
            <span>Type</span>
            <span>{document.typeValue}</span>
        </div>
          <div className="gba:flex gba:justify-between">
            <span>Upload Date</span>
            <span>{dayjs(document.uploadDate).format('MMM D, YYYY')}</span>
        </div>
          {document.validTo && (
            <div className="gba:flex gba:justify-between gba:mt-1">
              <span>Valid To</span>
              <span>{dayjs(document.validTo).format('MMM D, YYYY')}</span>
        </div>
          )}
        </div>
        
        <div className="gba:mt-auto gba:pt-4">
          <Button 
            className="gba:w-full"
            onClick={() => openDocumentViewer(document)}
            data-testid={`view-button-${document.id}`}
            variant="primary"
          >
            View Document
          </Button>
        </div>
      </Card>
    );
  };

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
      <div className="gba:text-center gba:text-gray-500 gba:py-8">
        <p>No documents found.</p>
      </div>
    );
  }

  return (
    <div className="gba:documents-tab">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <h2 className="gba:text-xl gba:font-medium" data-testid="documents-heading">
          Documents
        </h2>
        <Button 
          data-testid="upload-document-button"
          variant="primary"
          onClick={() => {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(
                new CustomEvent('com.newwork.process.start', {
                  detail: {
                    domain: 'employee',
                    processName: 'uploadEmployeeDocument',
                    startProcessBody: {
                      employeeId: employee.id
                    }
                  }
                })
              );
            }
          }}
        >
          Upload Document
        </Button>
      </div>

      <DataCards
        data={documents}
        renderItem={renderDocumentCard}
        columnMinWidth={300}
        gap={16}
        loading={loading}
        error={error}
        emptyMessage="No documents found."
      />

        <Modal
          title={currentDocument?.title || 'Document Viewer'}
          open={isViewerOpen}
          onCancel={closeDocumentViewer}
          width={modalWidth}
          style={{ top: 20 }}
          styles={{
            body: { 
              height: modalHeight, 
              padding: 0,
              overflow: 'hidden',
              maxHeight: 'calc(95vh - 60px)' 
            },
            mask: {
              backgroundColor: 'rgba(0, 0, 0, 0.75)'
            }
          }}
          footer={null}
          destroyOnHidden
          data-testid="document-viewer-modal"
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
          <div className="gba:flex gba:h-full gba:w-full">
            {/* Document viewer - left side */}
            <div className="gba:h-full gba:flex-1 gba:border-r gba:border-gray-200 gba:overflow-hidden">
            {isPdfDocument(currentDocument) ? (
                <div className="gba:w-full gba:h-full gba:overflow-hidden">
                  <object
                    data={documentUrl}
                    type="application/pdf"
                    className="gba:w-full gba:h-full gba:border-0"
                    style={{ width: '100%', height: '100%', display: 'block' }}
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
                <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:bg-gray-50">
                  <img 
                    src={documentUrl}
                    alt={currentDocument?.title || 'Document'}
                    className="gba:max-w-full gba:max-h-full gba:object-contain"
                    style={{ maxHeight: 'calc(70vh - 140px)' }}
                    onError={() => {
                      setError('The image could not be displayed. It may be in an unsupported format.');
                    }}
                    data-testid="image-viewer"
                  />
                </div>
              ) : (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full">
                  <p className="gba:mb-4">This document type cannot be previewed directly.</p>
                  <Button 
                    onClick={() => {
                      if (documentUrl) {
                        const a = document.createElement('a');
                        a.href = documentUrl;
                        a.download = currentDocument?.title || 'document';
                        a.click();
                      }
                    }}
                    className="gba:w-auto"
                    data-testid="document-download-link"
                    variant="secondary"
                    iconPosition="start"
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    }
                  >
                    Download Document
                  </Button>
                </div>
              )}
            </div>
            
            {/* Document details - right side */}
            <div className="gba:w-72 gba:p-4 gba:h-full gba:overflow-y-auto">
              <h3 className="gba:font-medium gba:text-base gba:mb-4">Document Details</h3>
              
              <div className="gba:mt-4">
                <div className="gba:font-medium gba:text-sm gba:text-gray-500">Document Name</div>
                <div className="gba:mt-1">{currentDocument?.title || 'N/A'}</div>
              </div>
              
              <Divider className="gba:my-3" />
              
              <div className="gba:mt-2">
                <div className="gba:font-medium gba:text-sm gba:text-gray-500">Document Group</div>
                <div className="gba:mt-1">{currentDocument?.documentGroup || 'N/A'}</div>
              </div>
              
              <Divider className="gba:my-3" />
              
              <div className="gba:mt-2">
                <div className="gba:font-medium gba:text-sm gba:text-gray-500">Document Type</div>
                <div className="gba:mt-1">{currentDocument?.type || 'N/A'}</div>
              </div>
              
              <Divider className="gba:my-3" />
              
              <div className="gba:mt-2">
                <div className="gba:font-medium gba:text-sm gba:text-gray-500">Description</div>
                <div className="gba:mt-1">{currentDocument?.description || 'N/A'}</div>
              </div>
              
              <Divider className="gba:my-3" />
              
              <div className="gba:mt-2">
                <div className="gba:font-medium gba:text-sm gba:text-gray-500">Upload Date</div>
                <div className="gba:mt-1">{
                  currentDocument?.createdAt ? new Date(currentDocument.createdAt).toLocaleDateString() : 
                  currentDocument?.uploadDate ? new Date(currentDocument.uploadDate).toLocaleDateString() : 'N/A'
                }</div>
              </div>
              
              <Divider className="gba:my-3" />
              
              <div className="gba:mt-2">
                <div className="gba:font-medium gba:text-sm gba:text-gray-500">Uploaded By</div>
                <div className="gba:mt-1">{currentDocument?.createdBy || 'N/A'}</div>
              </div>
              
              <Divider className="gba:my-3" />
              
              <div className="gba:mt-2">
                <div className="gba:font-medium gba:text-sm gba:text-gray-500">Expiration Date</div>
                <div className="gba:mt-1">{currentDocument?.validTo ? new Date(currentDocument.validTo).toLocaleDateString() : 'N/A'}</div>
              </div>
              
              <div className="gba:mt-6">
                <Button 
                  onClick={() => {
                    if (documentUrl) {
                      const a = document.createElement('a');
                      a.href = documentUrl;
                      a.download = currentDocument?.title || 'document';
                      a.click();
                    }
                  }}
                  className="gba:w-full"
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
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <p>No document content available</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentsTab;
