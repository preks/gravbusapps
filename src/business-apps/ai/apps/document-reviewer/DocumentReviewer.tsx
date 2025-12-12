import React from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout } from '@newwork/nw-design-system'
import { FileSearch } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentReviewProvider } from './context/DocumentReviewContext'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DocumentReviewer: React.FC<BusinessAppContextProps> = context => {
  return (
    <div data-testid="document-reviewer-app" className="gba:w-full">
      <PageLayout
        headerIcon={FileSearch}
        headerTitle="Document Reviewer"
        headerDescription="AI-powered document review with visual annotations and insights."
        variant="default"
        className="gba:min-h-screen"
      >
        <DocumentReviewProvider>
          <div className="gba:p-6">
            <p className="gba:text-muted-foreground">
              Document Reviewer is ready. Integration with your document viewing system is required.
            </p>
          </div>
        </DocumentReviewProvider>
      </PageLayout>
    </div>
  )
}

export default DocumentReviewer
