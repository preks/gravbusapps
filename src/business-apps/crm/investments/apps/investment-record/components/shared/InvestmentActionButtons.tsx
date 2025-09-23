import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system';
import { FileText, Upload, Eye } from 'lucide-react';
import { Alert, message, Spin } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useInvestmentReportClient } from '@/common/network/investment-reports';
import { useInvestmentReportData, BaseInvestment } from '../../hooks/useInvestmentReportData';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface InvestmentData {
  investmentGroup?: {
    code: string;
    childEntries?: Array<{
      code: string;
      objectValue?: {
        tileFields?: any[];
      };
    }>;
  };
  investmentType?: {
    code: string;
  };
}

interface CatalogData {
  investmentGroups?: Array<{
    code: string;
    objectValue?: {
      tileFields?: any[];
    };
    childEntries?: Array<{
      code: string;
      objectValue?: {
        tileFields?: any[];
      };
    }>;
  }>;
  investmentTypes?: Array<{
    code: string;
    objectValue?: {
      tileFields?: any[];
    };
  }>;
}

// =============================================================================
// INVESTMENT REPORT PDF MODAL
// =============================================================================

interface InvestmentReportPdfModalProps {
  isVisible: boolean;
  reportUrl: string;
  reportFileName: string;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  accessToken?: string;
}

const InvestmentReportPdfModal: React.FC<InvestmentReportPdfModalProps> = ({
  isVisible,
  reportUrl,
  reportFileName,
  isLoading,
  error,
  onClose,
  accessToken
}) => {
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [documentError, setDocumentError] = useState<string>('');
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  // Fetch document with authentication when modal opens
  useEffect(() => {

    if (!isVisible || !reportUrl || !accessToken) {

      return;
    }

    const fetchDocument = async () => {
      setIsLoadingDocument(true);
      setDocumentError('');
      
      try {
        
        // Try primary URL first
        let response = await fetch(reportUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/pdf, application/octet-stream, */*',
          },
        });

        // If primary URL fails, try fallback URL
        if (!response.ok && (window as any).investmentReportUrls?.fallback) {
          const fallbackUrl = (window as any).investmentReportUrls.fallback;
          
          response = await fetch(fallbackUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/pdf, application/octet-stream, */*',
            },
          });
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} (tried both URL formats)`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setDocumentUrl(objectUrl);
      } catch (err) {
        setDocumentError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoadingDocument(false);
      }
    };

    fetchDocument();
  }, [isVisible, reportUrl, accessToken]);

  const handleClose = () => {
    // Clean up the object URL when closing
    if (documentUrl) {
      URL.revokeObjectURL(documentUrl);
      setDocumentUrl('');
    }
    setDocumentError('');
    onClose();
  };


  const loading = isLoading || isLoadingDocument;
  const hasError = error || documentError;
  const canShowDocument = documentUrl && !loading && !hasError;

  return (
    <Dialog open={isVisible} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-[90vw] gba:max-h-[90vh] gba:w-full">
        <DialogHeader className="gba:flex gba:flex-row gba:items-center gba:justify-center gba:space-y-0 gba:pb-4">
          <DialogTitle className="gba:text-lg gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('investment.reports.pdfViewer', 'Investment Report')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="gba:mt-4 gba:bg-white gba:min-h-[80vh]">
          {loading ? (
            <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-96 gba:gap-4">
              <Spin size="large" />
              <div className="gba:text-sm gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('investment.reports.loading', 'Loading investment report...')}
              </div>
            </div>
          ) : hasError ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
              <Alert
                message={getTranslationFromI18nKeyAndLabel('investment.reports.error', 'Error Loading Report')}
                description={hasError}
                type="error"
                showIcon
                className="gba:max-w-md"
              />
            </div>
          ) : canShowDocument ? (
            <iframe
              src={documentUrl}
              className="gba:w-full gba:h-[calc(90vh-120px)] gba:border-0"
              title={reportFileName}
              data-testid="investment-report-pdf-iframe"
            />
          ) : (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
              <div className="gba:text-center">
                <div className="gba:text-lg gba:font-medium gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel('investment.reports.noUrl', 'No report URL available')}
                </div>
                <div className="gba:text-sm gba:text-gray-500">
                  {getTranslationFromI18nKeyAndLabel('investment.reports.noUrlDesc', 'Report URL could not be constructed')}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// =============================================================================
// GENERATE ONE-PAGER BUTTON
// =============================================================================

export interface GenerateOnePagerButtonProps extends Partial<BusinessAppContextProps> {
  /**
   * Investment ID to generate report for
   */
  investmentId?: string;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Use direct API approach instead of flow-based approach
   * When true: calls /generateInvestmentReport API directly with proper payload
   * When false/undefined: uses existing flow-based approach (default behavior)
   */
  useDirectApi?: boolean;

  /**
   * Pre-loaded investment data to avoid duplicate API calls
   * When provided, this data will be used instead of fetching it again
   */
  investmentData?: BaseInvestment;
}

/**
 * Helper function to check if investment has tiles defined in catalog objectValue
 */
const hasInvestmentTilesConfiguration = (investment: InvestmentData | undefined, catalogData: CatalogData | undefined): boolean => {
  if (!investment || !catalogData) {
    return false;
  }

  const investmentGroupCode = investment?.investmentGroup?.code;
  const investmentTypeCode = investment?.investmentType?.code;

  // Check investment group for tile configuration
  const investmentGroups = catalogData.investmentGroups || [];
  const matchingGroup = investmentGroups.find((group) => group.code === investmentGroupCode);
  
  if (matchingGroup?.objectValue?.tileFields && matchingGroup.objectValue.tileFields.length > 0) {
    return true; // Group has tile fields defined
  }

  // Check investment type for tile configuration
  const investmentTypes = catalogData.investmentTypes || [];
  const matchingType = investmentTypes.find((type) => type.code === investmentTypeCode);
  
  if (matchingType?.objectValue?.tileFields && matchingType.objectValue.tileFields.length > 0) {
    return true; // Type has tile fields defined
  }

  // Also check nested types in groups (for flipped relationships)
  if (matchingGroup?.childEntries && matchingGroup.childEntries.length > 0) {
    const nestedType = matchingGroup.childEntries.find((type) => type.code === investmentTypeCode);
    if (nestedType?.objectValue?.tileFields && nestedType.objectValue.tileFields.length > 0) {
      return true; // Nested type has tile fields defined
    }
  }

  return false; // No tile configuration found
};

/**
 * Generate One-Pager Button Component
 * Reusable button for generating investment one-pager reports across different investment record types
 * Only appears if the investment has tiles defined in its group and/or type catalog objectValue
 */
export const GenerateOnePagerButton: React.FC<GenerateOnePagerButtonProps> = ({
  investmentId,
  investment,
  catalogData,
  variant = 'default',
  size = 'default',
  accessToken,
  userInfo,
  useDirectApi = false,
  investmentData
}) => {
  if (!investmentId) {
    return null; // Don't render if no investment ID
  }

  // ORIGINAL FLOW-BASED APPROACH (default behavior) - Enhanced with complete payload
  if (!useDirectApi) {
    return (
      <FlowBasedGenerateButton
        investmentId={investmentId}
        variant={variant}
        size={size}
        accessToken={accessToken}
        userInfo={userInfo}
        investmentData={investmentData}
      />
    );
  }

  // NEW DIRECT API APPROACH (opt-in with useDirectApi=true)
  return (
    <DirectApiGenerateButton
      investmentId={investmentId}
      variant={variant}
      size={size}
      accessToken={accessToken}
      userInfo={userInfo}
      investmentData={investmentData}
    />
  );
};

// =============================================================================
// DIRECT API GENERATE BUTTON (Internal Component)
// =============================================================================

interface DirectApiGenerateButtonProps extends Partial<BusinessAppContextProps> {
  investmentId: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg';
  investmentData?: BaseInvestment;
}

const DirectApiGenerateButton: React.FC<DirectApiGenerateButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken,
  userInfo,
  investmentData
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize hooks for direct API approach
  const reportClient = useInvestmentReportClient(accessToken || '');
  const { fetchInvestmentReportData, transformInvestmentToPayload } = useInvestmentReportData({ 
    accessToken: accessToken || '', 
    userInfo 
  } as BusinessAppContextProps);

  if (!accessToken) {
    return null; // Don't render if no access token
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // 🔥 ALWAYS USE PRE-LOADED DATA - NO ADDITIONAL API CALLS
      if (!investmentData) {
        throw new Error('Investment data not available. Please refresh the page.');
      }
      
      // Use existing investment data instead of fetching
      const reportPayload = transformInvestmentToPayload(investmentData);

      // Generate the report
      const response = await reportClient.generateInvestmentReport(reportPayload);

      if (response.success) {
        message.success(
          getTranslationFromI18nKeyAndLabel('investment.reports.generateSuccess', 'One-pager report generated successfully!')
        );

        // If the API returns a download URL, open it
        if (response.reportUrl) {
          window.open(response.reportUrl, '_blank');
        }
      } else {
        throw new Error(response.message || 'Report generation failed');
      }
    } catch (err) {
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      message.error(
        getTranslationFromI18nKeyAndLabel('investment.reports.generateError', 'Failed to generate report: ') + errorMessage
      );
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="gba:space-y-2" data-testid="generate-investment-one-pager-container">
      {error && (
        <Alert
          message="Report Generation Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          data-testid="generate-investment-one-pager-error"
        />
      )}
      
      <Button
        variant={variant}
        size={size}
        className="gba:flex gba:items-center gba:gap-2"
        onClick={handleGenerateReport}
        disabled={isGenerating}
        data-testid="generate-investment-one-pager-button"
      >
        <FileText className="gba:h-4 gba:w-4" />
        {isGenerating 
          ? getTranslationFromI18nKeyAndLabel('investment.reports.generating', 'Generating...') 
          : getTranslationFromI18nKeyAndLabel('investment.reports.generateOnePager', 'Generate One-Pager')
        }
      </Button>
    </div>
  );
};

// =============================================================================
// FLOW-BASED GENERATE BUTTON (Enhanced with Complete Payload)
// =============================================================================

interface FlowBasedGenerateButtonProps extends Partial<BusinessAppContextProps> {
  investmentId: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg';
  investmentData?: BaseInvestment;
}

const FlowBasedGenerateButton: React.FC<FlowBasedGenerateButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken,
  userInfo,
  investmentData
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfModalData, setPdfModalData] = useState<{
    url: string;
    fileName: string;
  } | null>(null);


  // Initialize hooks to prepare complete payload
  const { transformInvestmentToPayload } = useInvestmentReportData({ 
    accessToken: accessToken || '', 
    userInfo 
  } as BusinessAppContextProps);

  // Extract file path from FileInfo string and construct proper URL with fallback options
  const extractFilePathFromReportPath = (reportPath: string): string | null => {
    try {
      // Parse FileInfo string to get the path
      // Example: "FileInfo(appName=investment_relations, fileId=investment-report-Existing_Properties-1758549109766.pdf, folderPath=/generated-reports, accessScope=null, path=/api/v1/tenant/downloads/investment_relations/generated-reports/investment-report-Existing_Properties-1758549109766.pdf, fileMetadata=null)"
      const pathMatch = reportPath.match(/path=([^,\s)]+)/);
      if (pathMatch) {
        const extractedPath = pathMatch[1];
        
        // Construct the proper URL based on NEWWORK platform format
        const baseUrl = 'https://newwork-dev.newwork.com';
        
        // Primary format: Add /files prefix if not present
        let primaryUrl = extractedPath;
        if (!primaryUrl.startsWith('/files/') && primaryUrl.startsWith('/api/')) {
          primaryUrl = '/files' + primaryUrl;
        }
        const fullPrimaryUrl = baseUrl + primaryUrl;
        
        // Alternative format: Direct API path (fallback)
        const fallbackUrl = baseUrl + extractedPath;
        
        // Store both URLs for potential fallback use
        (window as any).investmentReportUrls = {
          primary: fullPrimaryUrl,
          fallback: fallbackUrl
        };
        
        return fullPrimaryUrl;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Extract filename from FileInfo string
  const extractFileNameFromReportPath = (reportPath: string): string => {
    try {
      const fileIdMatch = reportPath.match(/fileId=([^,\s)]+)/);
      return fileIdMatch ? fileIdMatch[1] : 'investment-report.pdf';
    } catch (error) {
      return 'investment-report.pdf';
    }
  };

  // Show generated report in PDF modal viewer
  const handleShowGeneratedReport = (downloadPath: string, fileName: string) => {

    try {
      if (!accessToken) {
        message.error(
          getTranslationFromI18nKeyAndLabel('investment.reports.viewerError', 'Authentication required to view report')
        );
        return;
      }

      // Set modal data and show it
      const modalData = {
        url: downloadPath,
        fileName: fileName
      };
      
      setPdfModalData(modalData);
      setShowPdfModal(true);
      setIsGenerating(false);

    } catch (error) {
      console.error('❌ Error in handleShowGeneratedReport:', error);
      message.error(
        getTranslationFromI18nKeyAndLabel('investment.reports.viewerError', 'Failed to open report viewer: ' + (error as Error).message)
      );
      setIsGenerating(false);
    }
  };

  // Listen for process completion events
  useEffect(() => {
    const globalEventHandler = (event: any) => {

      // Check for any event that might contain our response
      if (event.type && (event.type.includes('process') || event.type.includes('task') || event.type.includes('flow') || event.type.includes('report') || event.type.includes('complete') || event.type.includes('finish') || event.type.includes('success'))) {
        
        // Check if this event contains our reportPath
        if (event.detail && typeof event.detail === 'object') {
          const checkForReportPath = (obj: any, path = ''): any => {
            if (!obj || typeof obj !== 'object') return null;
            
            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key;
              
              if (key === 'reportPath' && typeof value === 'string') {
                return { reportPath: value, source: `Global Event: ${event.type}`, fullPath: currentPath };
              }
              
              if (typeof value === 'object' && value !== null) {
                const found = checkForReportPath(value, currentPath);
                if (found) return found;
              }
            }
            return null;
          };

          const result = checkForReportPath(event.detail);
          if (result) {
            const downloadPath = extractFilePathFromReportPath(result.reportPath);
            const fileName = extractFileNameFromReportPath(result.reportPath);
            
            
            if (downloadPath) {
              handleShowGeneratedReport(downloadPath, fileName);
              setIsGenerating(false);
            } else {
              console.error('❌ Could not extract download path from event reportPath');
            }
          } 
        }
      }
    };

    // Monitor ALL network responses for report data
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      const url = args[0] instanceof Request ? args[0].url : args[0].toString();
      
      // Check ALL successful JSON responses for reportPath - including 201 Created
      const isRelevantRequest = 
        ((response.status === 200 || response.status === 201) && response.headers.get('content-type')?.includes('application/json')) ||
        url.includes('investment') || 
        url.includes('report') || 
        url.includes('generateInvestmentReport') || 
        url.includes('process') || 
        url.includes('kogito') || 
        url.includes('flow');
      
      if (isRelevantRequest) {
        const clonedResponse = response.clone();
        try {
          const contentType = response.headers.get('content-type');
          let data;
          
          if (contentType && contentType.includes('application/json')) {
            data = await clonedResponse.json();
          } else {
            const text = await clonedResponse.text();
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
              try {
                data = JSON.parse(text);
              } catch (e) {
                // Not JSON
              }
            }
          }
          
          if (data) {
            
            const checkResponseForReportPath = (responseData: any, depth = 0): any => {
              if (depth > 10 || !responseData || typeof responseData !== 'object') return null;
              
              // Check direct reportPath
              if (responseData.reportPath && typeof responseData.reportPath === 'string') {
                return responseData;
              }
              
              // Check arrays
              if (Array.isArray(responseData)) {
                for (const item of responseData) {
                  const found = checkResponseForReportPath(item, depth + 1);
                  if (found) return found;
                }
              }
              
              // Check all object properties deeply
              for (const [key, value] of Object.entries(responseData)) {
                if (key === 'reportPath' && typeof value === 'string') {
                  return responseData;
                }
                
                if (typeof value === 'object' && value !== null) {
                  const found = checkResponseForReportPath(value, depth + 1);
                  if (found) return found;
                }
              }
              
              return null;
            };
            
            const reportData = checkResponseForReportPath(data);
            
            if (reportData) {
              const downloadPath = extractFilePathFromReportPath(reportData.reportPath);
              const fileName = extractFileNameFromReportPath(reportData.reportPath);
              
              
              if (downloadPath) {
                setIsGenerating(false);
                handleShowGeneratedReport(downloadPath, fileName);
              } else {
                console.error('❌ Could not extract download path from network reportPath');
              }
            } 
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      return response;
    };

    // Listen to ALL possible process completion events
    const allEventNames = [
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion', 
      'com.newwork.process.completion',
      'com.newwork.process.taskCompletion',
      'investmentReportGenerate-completion',
      'flow-completion',
      'report-generated',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ];

    allEventNames.forEach(eventName => {
      window.addEventListener(eventName, globalEventHandler, true);
    });

    // COMPREHENSIVE: Monitor ALL custom events for debugging
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      return originalDispatchEvent.call(this, event);
    };

    return () => {
      allEventNames.forEach(eventName => {
        window.removeEventListener(eventName, globalEventHandler, true);
      });
      
      // Restore fetch override
      window.fetch = originalFetch;
      
      // Restore dispatchEvent
      window.dispatchEvent = originalDispatchEvent;
    };
  }, []);

  // 🔥 ALSO MONITOR XMLHttpRequest (in case response comes through XHR)
  useEffect(() => {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._url = url;
      this._method = method;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(data) {
      const xhr = this;
      
      xhr.addEventListener('load', function() {

        if ((xhr.status === 200 || xhr.status === 201) && xhr.getResponseHeader('content-type')?.includes('application/json')) {
          try {
            const responseData = JSON.parse(xhr.responseText);
            // Check for reportPath in XHR response
            if (responseData && responseData.reportPath) {
              
              const downloadPath = extractFilePathFromReportPath(responseData.reportPath);
              const fileName = extractFileNameFromReportPath(responseData.reportPath);
              
              
              if (downloadPath) {
                handleShowGeneratedReport(downloadPath, fileName);
              } else {
                console.error('❌ Could not extract download path from XHR reportPath');
              }
            }
            
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }
      });

      return originalXHRSend.apply(this, arguments);
    };

    return () => {
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };
  }, []);

  // Prepare complete payload for flow
  const getFlowContextData = () => {
    
    if (investmentData) {
      const completePayload = transformInvestmentToPayload(investmentData);
      
      const contextData = {
        investmentId,
        ...completePayload // Includes reportPath, templateName, reportData
      };
      
      return contextData;
    }

    // Fallback to basic data if no investment data available
    const fallbackData = { investmentId };
    return fallbackData;
  };

  const handleAppActionClick = () => {
    setIsGenerating(true);
  };


  return (
    <>
      <div onClick={handleAppActionClick}>
        <AppAction
          contextsArray={[FlowContextName.investmentReportGenerate]}
          externalContextData={getFlowContextData()}
          accessToken={accessToken}
          emptyStateBehavior="enable"
          prefixDataTestId="investment-record-generate-one-pager"
        >
          <Button
            variant={variant}
            size={size}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="generate-investment-one-pager-button"
            disabled={isGenerating}
          >
            <Eye className="gba:h-4 gba:w-4" />
            {isGenerating 
              ? getTranslationFromI18nKeyAndLabel('investment.reports.generating', 'Generating...') 
              : getTranslationFromI18nKeyAndLabel('investment.reports.generateOnePager', 'Generate One-Pager')
            }
      </Button>
    </AppAction>
      </div>

      {/* PDF Modal */}
      <InvestmentReportPdfModal
        isVisible={showPdfModal}
        reportUrl={pdfModalData?.url || ''}
        reportFileName={pdfModalData?.fileName || 'investment-report.pdf'}
        isLoading={isGenerating}
        onClose={() => {
          setShowPdfModal(false);
          setPdfModalData(null);
        }}
        accessToken={accessToken}
      />

    </>
  );
};

// =============================================================================
// UPLOAD REPORT BUTTON
// =============================================================================

export interface UploadReportButtonProps extends BusinessAppContextProps {
  /**
   * Investment ID to pass to the upload flow
   */
  investmentId?: string;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'secondary';
  
  /**
   * Button size
   * 
   */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Upload Report Button Component
 * Reusable button for uploading investment reports across different investment record types
 */
export const UploadReportButton: React.FC<UploadReportButtonProps> = ({
  investmentId,
  variant = 'outline',
  size = 'default',
  accessToken
}) => {
  if (!investmentId) {
    return null; // Don't render if no investment ID
  }

  return (
    <AppAction
      contextsArray={[FlowContextName.investmentReportUpload]}
      externalContextData={{ investmentId }}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      prefixDataTestId="investment-record-upload-report"
    >
      <Button
        variant={variant}
        size={size}
        className="gba:flex gba:items-center gba:gap-2"
        data-testid="upload-investment-report-button"
      >
        <Upload className="gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('investment.reports.uploadReport', 'Upload Report')}
      </Button>
    </AppAction>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  GenerateOnePagerButton,
  UploadReportButton
};
