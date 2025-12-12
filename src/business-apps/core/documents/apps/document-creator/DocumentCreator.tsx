import React, { useState, useCallback } from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Separator,
  ScrollArea
} from '@newwork/nw-design-system'
import {
  FileTextIcon,
  SparkleIcon,
  FileDocIcon,
  FilePdfIcon,
  MagicWandIcon,
  ArrowLeftIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentReviewPanel, type ReviewAnnotation } from './components/DocumentReviewPanel'
import { HighlightedEditor, type EditorAnnotation } from './components/HighlightedEditor'
import { useDocumentAI } from './hooks/useDocumentAI'
import { exportToWord, exportToPDF } from './utils/exportUtils'

// Document templates
const DOCUMENT_TEMPLATES = [
  { id: 'blank', name: 'Blank Document', description: 'Start from scratch' },
  { id: 'nda', name: 'Non-Disclosure Agreement', description: 'Standard NDA template' },
  { id: 'employment', name: 'Employment Contract', description: 'Standard employment agreement' },
  { id: 'service', name: 'Service Agreement', description: 'Service/consulting contract' },
  { id: 'lease', name: 'Lease Agreement', description: 'Property lease contract' },
  { id: 'partnership', name: 'Partnership Agreement', description: 'Business partnership terms' }
]

interface DocumentCreatorProps extends BusinessAppContextProps {
  onClose?: () => void
  onSave?: (document: { title: string; content: string; template: string }) => void
}

/**
 * Document Creator - Create and edit rich documents with AI assistance
 * Features:
 * - Rich text editing
 * - AI content generation
 * - AI document review
 * - Export to Word/PDF
 */
const DocumentCreator: React.FC<DocumentCreatorProps> = ({ accessToken, onClose, onSave }) => {
  // Document state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [isSaving, setIsSaving] = useState(false)

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Export state
  const [isExporting, setIsExporting] = useState(false)

  // Annotations state (shared between panel and editor)
  const [annotations, setAnnotations] = useState<EditorAnnotation[]>([])

  // AI hook for content generation
  const { generateContent } = useDocumentAI({ accessToken })

  // Handle annotations from review panel
  const handleAnnotationsChange = useCallback((newAnnotations: ReviewAnnotation[]) => {
    console.log('[DocumentCreator] Received annotations:', newAnnotations.length)
    setAnnotations(newAnnotations as EditorAnnotation[])
  }, [])

  // Accept annotation - apply fix to content
  const handleAcceptAnnotation = useCallback(
    (annotation: EditorAnnotation) => {
      if (annotation.suggestion && annotation.original_text) {
        const escapedOriginal = annotation.original_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedOriginal, 'gi')
        const newContent = content.replace(regex, annotation.suggestion)

        if (newContent !== content) {
          setContent(newContent)
        }
      }

      // Mark as resolved
      setAnnotations(prev => prev.map(a => (a.id === annotation.id ? { ...a, resolved: true } : a)))
    },
    [content]
  )

  // Dismiss annotation
  const handleDismissAnnotation = useCallback((annotationId: string) => {
    setAnnotations(prev => prev.map(a => (a.id === annotationId ? { ...a, resolved: true } : a)))
  }, [])

  // Handle template selection
  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplate(templateId)

    // Load template content
    const templates: Record<string, { title: string; content: string }> = {
      blank: { title: '', content: '' },
      nda: {
        title: 'Non-Disclosure Agreement',
        content: `<h1>NON-DISCLOSURE AGREEMENT</h1>
<p>This Non-Disclosure Agreement ("Agreement") is entered into as of <strong>[DATE]</strong> by and between:</p>
<p><strong>Disclosing Party:</strong> [COMPANY NAME], a [STATE] corporation</p>
<p><strong>Receiving Party:</strong> [RECIPIENT NAME]</p>
<h2>1. Definition of Confidential Information</h2>
<p>For purposes of this Agreement, "Confidential Information" shall include all information or data disclosed...</p>
<h2>2. Obligations of Receiving Party</h2>
<p>The Receiving Party agrees to:</p>
<ul>
<li>Hold and maintain the Confidential Information in strict confidence</li>
<li>Not disclose the Confidential Information to any third parties</li>
<li>Not use the Confidential Information for any purpose other than the Purpose</li>
</ul>
<h2>3. Term</h2>
<p>This Agreement shall remain in effect for a period of <strong>[TERM]</strong> years from the date of execution.</p>
<h2>4. Signatures</h2>
<p>___________________________ Date: ___________</p>
<p>___________________________ Date: ___________</p>`
      },
      employment: {
        title: 'Employment Contract',
        content: `<h1>EMPLOYMENT CONTRACT</h1>
<p>This Employment Contract ("Contract") is made effective as of <strong>[START DATE]</strong></p>
<h2>1. Employment</h2>
<p>The Employer hereby employs the Employee, and the Employee hereby accepts employment with the Employer.</p>
<h2>2. Position and Duties</h2>
<p>The Employee shall serve as <strong>[JOB TITLE]</strong> and shall perform the following duties:</p>
<ul>
<li>[Duty 1]</li>
<li>[Duty 2]</li>
<li>[Duty 3]</li>
</ul>
<h2>3. Compensation</h2>
<p>The Employee shall receive a base salary of <strong>[SALARY]</strong> per year, payable in accordance with the Employer's standard payroll schedule.</p>
<h2>4. Benefits</h2>
<p>The Employee shall be entitled to participate in all benefit plans offered by the Employer.</p>
<h2>5. Signatures</h2>
<p>Employer: ___________________________ Date: ___________</p>
<p>Employee: ___________________________ Date: ___________</p>`
      },
      service: {
        title: 'Service Agreement',
        content: `<h1>SERVICE AGREEMENT</h1>
<p>This Service Agreement ("Agreement") is entered into as of <strong>[DATE]</strong></p>
<h2>1. Services</h2>
<p>The Service Provider agrees to provide the following services:</p>
<ul>
<li>[Service 1]</li>
<li>[Service 2]</li>
</ul>
<h2>2. Compensation</h2>
<p>The Client agrees to pay the Service Provider <strong>[AMOUNT]</strong> for the services rendered.</p>
<h2>3. Term</h2>
<p>This Agreement shall commence on <strong>[START DATE]</strong> and continue until <strong>[END DATE]</strong>.</p>`
      },
      lease: {
        title: 'Lease Agreement',
        content: `<h1>LEASE AGREEMENT</h1>
<p>This Lease Agreement is made between <strong>[LANDLORD]</strong> ("Landlord") and <strong>[TENANT]</strong> ("Tenant").</p>
<h2>1. Property</h2>
<p>The Landlord agrees to lease the property located at: <strong>[ADDRESS]</strong></p>
<h2>2. Term</h2>
<p>The lease term shall begin on <strong>[START DATE]</strong> and end on <strong>[END DATE]</strong>.</p>
<h2>3. Rent</h2>
<p>The Tenant agrees to pay monthly rent of <strong>[AMOUNT]</strong>.</p>`
      },
      partnership: {
        title: 'Partnership Agreement',
        content: `<h1>PARTNERSHIP AGREEMENT</h1>
<p>This Partnership Agreement is entered into by and between the undersigned partners.</p>
<h2>1. Name and Purpose</h2>
<p>The name of the partnership shall be <strong>[PARTNERSHIP NAME]</strong>.</p>
<h2>2. Partners</h2>
<ul>
<li><strong>[Partner 1]</strong> - [Ownership %]</li>
<li><strong>[Partner 2]</strong> - [Ownership %]</li>
</ul>
<h2>3. Capital Contributions</h2>
<p>Each partner shall contribute the following capital:</p>`
      }
    }

    const template = templates[templateId]
    if (template) {
      setTitle(template.title)
      setContent(template.content)
    }
  }, [])

  // Handle AI content generation
  const handleGenerateContent = useCallback(async () => {
    if (!aiPrompt.trim()) return

    setIsGenerating(true)
    try {
      const generatedContent = await generateContent(aiPrompt, selectedTemplate, content)
      if (generatedContent) {
        setContent(prev => prev + '\n' + generatedContent)
      }
      setAiPrompt('')
    } catch (error) {
      console.error('Failed to generate content:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [aiPrompt, selectedTemplate, content, generateContent])

  // Handle export to Word
  const handleExportWord = useCallback(async () => {
    if (!content) return
    setIsExporting(true)
    try {
      await exportToWord(title || 'Document', content)
    } catch (error) {
      console.error('Failed to export to Word:', error)
    } finally {
      setIsExporting(false)
    }
  }, [title, content])

  // Handle export to PDF
  const handleExportPDF = useCallback(async () => {
    if (!content) return
    setIsExporting(true)
    try {
      await exportToPDF(title || 'Document', content)
    } catch (error) {
      console.error('Failed to export to PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }, [title, content])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!title || !content) return

    setIsSaving(true)
    try {
      onSave?.({ title, content, template: selectedTemplate })
    } catch (error) {
      console.error('Failed to save document:', error)
    } finally {
      setIsSaving(false)
    }
  }, [title, content, selectedTemplate, onSave])

  // Handle content change for review panel
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="document-creator">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-3">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeftIcon className="gba:w-5 gba:h-5" />
            </Button>
          )}
          <FileTextIcon className="gba:w-6 gba:h-6 gba:text-primary" />
          <h1 className="gba:text-xl gba:font-semibold">Document Creator</h1>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Export buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportWord}
            disabled={!content || isExporting}
            className="gba:gap-2"
          >
            <FileDocIcon className="gba:w-4 gba:h-4" />
            Word
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={!content || isExporting}
            className="gba:gap-2"
          >
            <FilePdfIcon className="gba:w-4 gba:h-4" />
            PDF
          </Button>

          <Separator orientation="vertical" className="gba:h-6" />

          <Button onClick={handleSave} disabled={!title || !content || isSaving}>
            {isSaving ? 'Saving...' : 'Save Document'}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="gba:flex gba:flex-1 gba:overflow-hidden">
        {/* Left sidebar - Templates & AI */}
        <div className="gba:w-80 gba:border-r gba:border-border gba:flex gba:flex-col">
          <ScrollArea className="gba:flex-1">
            <div className="gba:p-4 gba:space-y-6">
              {/* Templates */}
              <div>
                <h3 className="gba:text-sm gba:font-medium gba:mb-3">Document Template</h3>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TEMPLATES.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="gba:flex gba:flex-col">
                          <span>{template.name}</span>
                          <span className="gba:text-xs gba:text-muted-foreground">{template.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* AI Content Generation */}
              <div>
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                  <MagicWandIcon className="gba:w-4 gba:h-4 gba:text-primary" />
                  <h3 className="gba:text-sm gba:font-medium">AI Assistant</h3>
                </div>
                <div className="gba:space-y-3">
                  <Textarea
                    placeholder="Describe what you want to add... e.g., 'Add a termination clause' or 'Generate confidentiality terms'"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={handleGenerateContent}
                    disabled={!aiPrompt.trim() || isGenerating}
                    className="gba:w-full gba:gap-2"
                  >
                    <SparkleIcon className="gba:w-4 gba:h-4" />
                    {isGenerating ? 'Generating...' : 'Generate Content'}
                  </Button>
                </div>

                {/* Quick actions */}
                <div className="gba:mt-4">
                  <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">Quick actions:</p>
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    <Badge
                      variant="outline"
                      className="gba:cursor-pointer hover:gba:bg-accent"
                      onClick={() => setAiPrompt('Add a confidentiality clause')}
                    >
                      + Confidentiality
                    </Badge>
                    <Badge
                      variant="outline"
                      className="gba:cursor-pointer hover:gba:bg-accent"
                      onClick={() => setAiPrompt('Add a termination clause')}
                    >
                      + Termination
                    </Badge>
                    <Badge
                      variant="outline"
                      className="gba:cursor-pointer hover:gba:bg-accent"
                      onClick={() => setAiPrompt('Add a dispute resolution clause')}
                    >
                      + Disputes
                    </Badge>
                    <Badge
                      variant="outline"
                      className="gba:cursor-pointer hover:gba:bg-accent"
                      onClick={() => setAiPrompt('Add payment terms')}
                    >
                      + Payment
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Editor area */}
        <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden">
          {/* Document Review Panel - trigger review & show summary */}
          <div className="gba:px-4 gba:pt-4">
            <DocumentReviewPanel
              content={content}
              title={title}
              onContentChange={handleContentChange}
              onAnnotationsChange={handleAnnotationsChange}
              accessToken={accessToken}
            />
          </div>

          {/* Title input */}
          <div className="gba:px-4 gba:pt-4">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Document Title"
              className="gba:text-2xl gba:font-bold gba:border-0 gba:border-b gba:rounded-none gba:px-0 focus-visible:gba:ring-0"
            />
          </div>

          {/* Highlighted Editor - shows issues directly in text */}
          <div className="gba:flex-1 gba:p-4 gba:overflow-hidden">
            <HighlightedEditor
              value={content}
              onChange={setContent}
              annotations={annotations}
              onAcceptAnnotation={handleAcceptAnnotation}
              onDismissAnnotation={handleDismissAnnotation}
              placeholder="Start typing your document..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentCreator
