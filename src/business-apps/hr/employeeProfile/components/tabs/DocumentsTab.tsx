'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Employee } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';
import { DataCards } from '@/business-apps/hr/employeeProfile/components/DataCards';

interface DocumentsTabProps {
  employee: Employee;
}

interface Document {
  id: string;
  title: string;
  type: string;
  uploadDate: string;
  size: string;
  status: string;
}

/**
 * Documents Tab Component
 * Displays documents related to the employee
 */
const DocumentsTab: React.FC<DocumentsTabProps> = ({ employee }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch documents from an API
    // For now, we'll simulate with a timeout and mock data
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data for demonstration
        const mockDocuments: Document[] = [
          {
            id: '1',
            title: 'Employment Contract',
            type: 'PDF',
            uploadDate: dayjs().subtract(2, 'month').format('YYYY-MM-DD'),
            size: '2.4 MB',
            status: 'Approved'
          },
          {
            id: '2',
            title: 'ID Card',
            type: 'JPG',
            uploadDate: dayjs().subtract(2, 'month').format('YYYY-MM-DD'),
            size: '1.2 MB',
            status: 'Approved'
          },
          {
            id: '3',
            title: 'Tax Declaration',
            type: 'PDF',
            uploadDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
            size: '3.1 MB',
            status: 'Pending'
          }
        ];
        
        setDocuments(mockDocuments);
      } catch (err) {
        setError('Failed to load documents');
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    };

    if (employee?.id) {
      fetchDocuments();
    } else {
      setLoading(false);
      setDocuments([]);
    }
  }, [employee?.id]);

  // Function to render document cards
  const renderDocumentCard = (document: Document) => {
    return (
      <Card key={document.id} className="gba:p-4 gba:h-full gba:flex gba:flex-col">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
          <div className="gba:grow">
            <h3 className="gba:text-lg gba:font-medium">{document.title}</h3>
            <p className="gba:text-sm gba:text-gray-500">{document.type}</p>
          </div>
          <div className="gba:shrink-0">
            <span className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium ${
              document.status === 'Approved' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {document.status}
            </span>
          </div>
        </div>
        
        <div className="gba:mt-2 gba:text-sm gba:text-gray-500">
          <div className="gba:flex gba:justify-between">
            <span>Upload Date</span>
            <span>{dayjs(document.uploadDate).format('MMM D, YYYY')}</span>
          </div>
          <div className="gba:flex gba:justify-between gba:mt-1">
            <span>Size</span>
            <span>{document.size}</span>
          </div>
        </div>
        
        <div className="gba:mt-auto gba:pt-4">
          <button 
            className="gba:w-full gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors"
            onClick={() => {
              // In a real implementation, this would download the document
              alert(`Downloading ${document.title}`);
            }}
          >
            Download Document
          </button>
        </div>
      </Card>
    );
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600"></div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="gba:text-center gba:text-red-600 gba:py-8">
        <p>{error}</p>
      </div>
    );
  }

  // Handle empty state
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
        <h2 className="gba:text-xl gba:font-medium">
          Documents
        </h2>
        <button 
          className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors"
          onClick={() => {
            // Trigger flow to upload a document
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
        </button>
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
    </div>
  );
};

export default DocumentsTab;
