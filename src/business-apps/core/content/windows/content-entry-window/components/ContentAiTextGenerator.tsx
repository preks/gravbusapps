import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  AiButton,
  Input,
  Button,
  Popover,
  PopoverContent,
  PopoverAnchor,
  Spinner,
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton
} from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import {
  SparkleIcon,
  FileTextIcon,
  CheckCircleIcon,
  ArrowsInIcon,
  SpeakerHighIcon,
  TranslateIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  XIcon,
  ArrowClockwiseIcon
} from '@phosphor-icons/react'
import type { ContentAiTextGeneratorProps, AiActionType, AiResponse } from './aiTextGeneratorTypes'
import { ContentEntryAIService, ContentEntryInput } from '../services/ContentEntryAIService'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

export const ContentAiTextGenerator: React.FC<ContentAiTextGeneratorProps> = ({
  title,
  previewText,
  content,
  onTitleChange,
  onPreviewTextChange,
  onContentChange,
  onPictureChange,
  context,
  contentGroup,
  contentTypeId,
  contentCategoryIds,
  contentTagIds,
  onContentTypeIdChange,
  onContentCategoryIdsChange,
  onContentTagIdsChange
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [view, setView] = useState<
    'generate' | 'refine' | 'improve' | 'translate' | 'changeTone' | 'loading' | 'response'
  >('generate')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<AiResponse | null>(null)
  const [activeAction, setActiveAction] = useState<AiActionType | null>(null)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [refinePrompt, setRefinePrompt] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [originalValues, setOriginalValues] = useState<AiResponse | null>(null)
  const buttonRef = React.useRef<HTMLDivElement>(null)
  const aiServiceRef = useRef<ContentEntryAIService | null>(null)
  const promptManagerClient = usePromptManagerClient(context.accessToken)

  // Initialize AI service
  useEffect(() => {
    if (context.accessToken) {
      aiServiceRef.current = new ContentEntryAIService(promptManagerClient, context.accessToken)
    }
  }, [context.accessToken, promptManagerClient])

  // Check if content exists
  const hasContent = useMemo(() => {
    return !!(title?.trim() || previewText?.trim() || content?.trim())
  }, [title, previewText, content])

  // Determine initial view based on content
  useEffect(() => {
    if (isPopoverOpen) {
      // If no content, show generate view directly
      // If content exists, show refine options
      setView(hasContent ? 'refine' : 'generate')
      setSearchQuery('')
    }
  }, [isPopoverOpen, hasContent])

  // Map action types to refine prompts
  const getRefinePrompt = useCallback(
    (actionType: AiActionType, options?: { tone?: string; language?: string; customPrompt?: string }): string => {
      if (options?.customPrompt) {
        return options.customPrompt
      }

      switch (actionType) {
        case 'improve':
          return 'Improve the overall quality, clarity, and flow of the content while maintaining the original meaning and style.'
        case 'summarize':
          return 'Create a concise summary that captures the key points and main ideas of the content.'
        case 'fixSpelling':
          return 'Fix all spelling and grammar errors in the content.'
        case 'shorten':
          return 'Shorten the title, preview, and content while preserving all key information and maintaining clarity.'
        case 'changeTone':
          return `Change the tone to ${options?.tone?.toLowerCase() || 'professional'} while keeping the same meaning and information.`
        case 'translate':
          return `Translate the content to the selected language, maintaining the same tone and style.`
        default:
          return 'Refine the content based on your requirements.'
      }
    },
    []
  )

  const handleAction = useCallback(
    async (actionType: AiActionType, userPrompt: string) => {
      if (!aiServiceRef.current) {
        setError('AI service not initialized')
        return
      }

      // Use response values if available (for refining), otherwise use props
      const previousResponse = response
      const inputTitle = previousResponse?.title || title
      const inputPreviewText = previousResponse?.previewText || previewText
      const inputContent = previousResponse?.content || content

      setActiveAction(actionType)
      setIsLoading(true)
      setError(null)
      setView('loading')

      // Store original values for fixSpelling action to show diff
      if (actionType === 'fixSpelling') {
        setOriginalValues({
          title: inputTitle,
          previewText: inputPreviewText,
          content: inputContent
        })
      }

      try {
        const operation = actionType === 'generate' ? 'generate' : 'refine'
        const existingContent: ContentEntryInput =
          actionType === 'generate'
            ? {
                contentGroup,
                contentTypeId,
                contentCategoryIds,
                contentTagIds
              }
            : {
                title: inputTitle,
                preview: inputPreviewText,
                content: inputContent,
                picture: null,
                contentGroup,
                contentTypeId,
                contentCategoryIds,
                contentTagIds
              }

        const result = await aiServiceRef.current.executeContentEntryOperation(operation, userPrompt, existingContent)

        // Map response to AiResponse format
        const aiResponse: AiResponse = {
          title: result.title || '',
          previewText: result.preview || '',
          content: result.content || '',
          picture: result.picture || null,
          contentTypeId: result.contentTypeId,
          contentCategoryIds: result.contentCategoryIds,
          contentTagIds: result.contentTagIds
        }

        setResponse(aiResponse)
        setView('response')
      } catch (err) {
        console.error('[AI Text Generator] API call failed', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        setView('response')
      } finally {
        setIsLoading(false)
      }
    },
    [title, previewText, content, response, contentGroup, contentTypeId, contentCategoryIds, contentTagIds]
  )

  const handleGenerate = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (generatePrompt.trim()) {
        handleAction('generate', generatePrompt.trim())
        setGeneratePrompt('')
      }
    },
    [generatePrompt, handleAction]
  )

  const handleRefineAction = useCallback(
    (actionType: AiActionType, options?: { tone?: string; language?: string }) => {
      const prompt = getRefinePrompt(actionType, options)
      handleAction(actionType, prompt)
    },
    [getRefinePrompt, handleAction]
  )

  const handleImprove = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (refinePrompt.trim()) {
        handleAction('improve', refinePrompt.trim())
        setRefinePrompt('')
      }
    },
    [refinePrompt, handleAction]
  )

  const handleLanguageSelect = useCallback(
    (languageId: string) => {
      if (languageId) {
        setSelectedLanguage(languageId)
        // Get language name from catalog for the prompt
        handleRefineAction('translate', { language: languageId })
      }
    },
    [handleRefineAction]
  )

  const handleToneSelect = useCallback(
    (tone: string) => {
      handleRefineAction('changeTone', { tone })
    },
    [handleRefineAction]
  )

  const handleDiscard = useCallback(() => {
    setView(hasContent ? 'refine' : 'generate')
    setResponse(null)
    setActiveAction(null)
    setIsPopoverOpen(false)
  }, [hasContent])

  const handleRefine = useCallback(() => {
    if (!activeAction) return

    // Navigate back to appropriate view for refining
    if (activeAction === 'generate') {
      setView('generate')
      setGeneratePrompt('')
    } else if (activeAction === 'improve') {
      setView('improve')
      setRefinePrompt('')
    } else if (activeAction === 'translate') {
      setView('translate')
      setSelectedLanguage(null)
    } else if (activeAction === 'changeTone') {
      setView('changeTone')
    } else {
      // For other actions, go back to refine view
      setView('refine')
    }
  }, [activeAction])

  const handleInsert = useCallback(async () => {
    if (response) {
      onTitleChange(response.title)
      onPreviewTextChange(response.previewText)
      onContentChange(response.content)

      // Handle picture if provided
      if (response.picture && onPictureChange) {
        try {
          await onPictureChange(response.picture)
        } catch (error) {
          console.error('[AI Text Generator] Failed to load picture:', error)
          // Continue with insert even if picture fails
        }
      }

      // Handle catalog fields from AI response
      if (response.contentTypeId !== undefined && onContentTypeIdChange) {
        onContentTypeIdChange(response.contentTypeId)
      }
      if (onContentCategoryIdsChange) {
        onContentCategoryIdsChange(response.contentCategoryIds || [])
      }
      if (onContentTagIdsChange) {
        onContentTagIdsChange(response.contentTagIds || [])
      }

      handleDiscard()
    }
  }, [
    response,
    onTitleChange,
    onPreviewTextChange,
    onContentChange,
    onPictureChange,
    onContentTypeIdChange,
    onContentCategoryIdsChange,
    onContentTagIdsChange,
    handleDiscard
  ])

  const tones = ['Professional', 'Empathetic', 'Casual', 'Neutral', 'Educational', 'Formal', 'Creative', 'Technical']

  // Define refine actions (only shown when content exists)
  const refineActions = [
    {
      type: 'improve' as AiActionType,
      label: 'Improve',
      icon: SparkleIcon,
      description: 'Improve the content based on your requirements',
      keywords: ['improve', 'enhance', 'better', 'refine']
    },
    {
      type: 'summarize' as AiActionType,
      label: 'Summarize',
      icon: FileTextIcon,
      description: 'Create a concise summary',
      keywords: ['summarize', 'summary', 'brief', 'short']
    },
    {
      type: 'fixSpelling' as AiActionType,
      label: 'Fix spelling & grammar',
      icon: CheckCircleIcon,
      description: 'Fix spelling and grammar errors',
      keywords: ['fix', 'spelling', 'grammar', 'correct', 'errors']
    },
    {
      type: 'shorten' as AiActionType,
      label: 'Shorten',
      icon: ArrowsInIcon,
      description: 'Make content shorter',
      keywords: ['shorten', 'reduce', 'condense', 'compact']
    },
    {
      type: 'changeTone' as AiActionType,
      label: 'Change tone to...',
      icon: SpeakerHighIcon,
      description: 'Change the tone of the content',
      keywords: ['tone', 'style', 'voice', 'change']
    },
    {
      type: 'translate' as AiActionType,
      label: 'Translate to...',
      icon: TranslateIcon,
      description: 'Translate content to another language',
      keywords: ['translate', 'language', 'translation']
    }
  ]

  // Filter actions based on search query
  const filteredRefineActions = useMemo(() => {
    if (!searchQuery.trim()) return refineActions
    const query = searchQuery.toLowerCase()
    return refineActions.filter(
      action =>
        action.label.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        action.keywords.some(keyword => keyword.includes(query))
    )
  }, [searchQuery])

  const renderLoadingView = () => (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8" data-testid="ai-loading-state">
      <Spinner className="gba:w-8 gba:h-8" />
      <div className="gba:mt-4 gba:text-sm gba:font-medium">Generating AI content...</div>
      <div className="gba:mt-1.5 gba:text-xs gba:text-muted-foreground">Please wait while we process your request</div>
    </div>
  )

  const renderResponseView = () => (
    <div className="gba:flex gba:flex-col" data-testid="ai-response-view">
      {/* Header with Back Button */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-3 gba:pb-2 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setView(hasContent ? 'refine' : 'generate')
            setResponse(null)
            setActiveAction(null)
            setOriginalValues(null)
          }}
          className="gba:h-8 gba:w-8"
          data-testid="ai-response-back-button"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <div className="gba:text-sm gba:font-medium">AI Response</div>
      </div>

      {/* Content */}
      <div className="gba:p-3 gba:max-h-[500px] gba:overflow-y-auto">
        {isLoading && renderLoadingView()}

        {error && (
          <div className="gba:text-center">
            <div className="gba:text-sm gba:text-destructive gba:mb-3">Error generating content</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-4">{error}</div>
            <Button variant="ghost" size="sm" onClick={handleRefine} data-testid="ai-response-retry-btn">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !error && response && (
          <>
            {/* Show diff view for fixSpelling action */}
            {activeAction === 'fixSpelling' && originalValues ? (
              (() => {
                // Check if there are any differences
                const titleChanged = (originalValues.title || '').trim() !== (response.title || '').trim()
                const previewChanged = (originalValues.previewText || '').trim() !== (response.previewText || '').trim()
                // For content, compare text content (strip HTML for comparison)
                const originalContentText = (originalValues.content || '').replace(/<[^>]*>/g, '').trim()
                const responseContentText = (response.content || '').replace(/<[^>]*>/g, '').trim()
                const contentChanged = originalContentText !== responseContentText
                const hasChanges = titleChanged || previewChanged || contentChanged

                if (!hasChanges) {
                  // Show green checkmark if no errors found
                  return (
                    <div
                      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12"
                      data-testid="ai-fix-spelling-no-errors"
                    >
                      <div className="gba:rounded-full gba:bg-success gba:p-4 gba:mb-4">
                        <CheckCircleIcon size={48} weight="fill" className="gba:text-success-foreground" />
                      </div>
                      <div className="gba:text-lg gba:font-semibold gba:text-foreground">No errors found</div>
                    </div>
                  )
                }

                // Show diff view
                return (
                  <div className="gba:space-y-4" data-testid="ai-fix-spelling-diff">
                    {titleChanged && (
                      <div className="gba:mb-4">
                        <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Title</div>
                        <div className="gba:space-y-2">
                          <div className="gba:px-3 gba:py-2 gba:bg-destructive/10 gba:text-destructive gba:rounded gba:text-sm gba:line-through">
                            {originalValues.title || '-'}
                          </div>
                          <div className="gba:px-3 gba:py-2 gba:bg-success/10 gba:text-success gba:rounded gba:text-sm gba:font-medium">
                            {response.title || '-'}
                          </div>
                        </div>
                      </div>
                    )}
                    {previewChanged && (
                      <div className="gba:mb-4">
                        <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Preview</div>
                        <div className="gba:space-y-2">
                          <div className="gba:px-3 gba:py-2 gba:bg-destructive/10 gba:text-destructive gba:rounded gba:text-sm gba:line-through">
                            {originalValues.previewText || '-'}
                          </div>
                          <div className="gba:px-3 gba:py-2 gba:bg-success/10 gba:text-success gba:rounded gba:text-sm gba:font-medium">
                            {response.previewText || '-'}
                          </div>
                        </div>
                      </div>
                    )}
                    {contentChanged && (
                      <div className="gba:mb-4">
                        <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Content</div>
                        <div className="gba:space-y-2">
                          <div className="gba:px-3 gba:py-2 gba:bg-destructive/10 gba:text-destructive gba:rounded gba:text-sm gba:line-through">
                            <div dangerouslySetInnerHTML={{ __html: originalValues.content || '-' }} />
                          </div>
                          <div className="gba:px-3 gba:py-2 gba:bg-success/10 gba:text-success gba:rounded gba:text-sm gba:font-medium">
                            <div dangerouslySetInnerHTML={{ __html: response.content || '-' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              <>
                {/* Show regular response content for other actions */}
                {response.title && (
                  <div className="gba:mb-4">
                    <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Title</div>
                    <div className="gba:text-sm">{response.title}</div>
                  </div>
                )}
                {response.previewText && (
                  <div className="gba:mb-4">
                    <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Preview</div>
                    <div className="gba:text-sm">{response.previewText}</div>
                  </div>
                )}
                {response.content && (
                  <div className="gba:mb-4">
                    <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Content</div>
                    <div className="gba:text-sm" dangerouslySetInnerHTML={{ __html: response.content }} />
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:pt-2 gba:border-t gba:border-border gba:mt-4">
              <Button variant="ghost" size="sm" onClick={handleDiscard} data-testid="ai-response-discard-btn">
                <XIcon className="gba:mr-2" size={16} />
                Discard
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRefine} data-testid="ai-response-refine-btn">
                <ArrowClockwiseIcon className="gba:mr-2" size={16} />
                Refine
              </Button>
              <Button variant="default" size="sm" onClick={handleInsert} data-testid="ai-response-insert-btn">
                <CheckCircleIcon className="gba:mr-2" size={16} />
                Insert
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  const renderGenerateView = () => (
    <div className="gba:flex gba:flex-col" data-testid="ai-generate-popover-view">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-3 gba:pb-2 gba:border-b gba:border-border">
        <div className="gba:text-sm gba:font-medium">Generate Content</div>
      </div>

      {/* Prompt Input */}
      <div className="gba:p-4">
        <InputGroup>
          <InputGroupTextarea
            value={generatePrompt}
            onChange={e => setGeneratePrompt(e.target.value)}
            placeholder="Tell me what you want to write about..."
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && generatePrompt.trim()) {
                e.preventDefault()
                e.stopPropagation()
                handleGenerate(e)
              }
            }}
            data-testid="ai-generate-prompt-input"
            autoFocus
            rows={4}
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="default"
              className="gba:rounded-full"
              size="iconXs"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                handleGenerate(e)
              }}
              disabled={!generatePrompt.trim()}
              data-testid="ai-generate-submit-button"
              type="button"
            >
              <PaperPlaneTiltIcon size={16} />
              <span className="gba:sr-only">Generate</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  )

  const renderRefineView = () => (
    <div className="gba:flex gba:flex-col" data-testid="ai-refine-popover-view">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-3 gba:pb-2 gba:border-b gba:border-border">
        <div className="gba:text-sm gba:font-medium">Refine Content</div>
      </div>

      {/* Search Input */}
      <div className="gba:px-3 gba:pt-3 gba:pb-2">
        <div className="gba:relative">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search refine options..."
            className="gba:h-9 gba:text-sm gba:!pl-10"
            data-testid="ai-refine-search-input"
            autoFocus
          />
        </div>
      </div>

      {/* Actions List */}
      <div className="gba:px-1 gba:pb-2 gba:max-h-[400px] gba:overflow-y-auto">
        {filteredRefineActions.length === 0 ? (
          <div className="gba:px-4 gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">
            No options found
          </div>
        ) : (
          filteredRefineActions.map(action => {
            const IconComponent = action.icon
            return (
              <button
                key={action.type + action.label}
                onClick={() => {
                  if (action.type === 'improve') {
                    setView('improve')
                  } else if (action.type === 'translate') {
                    setView('translate')
                  } else if (action.type === 'changeTone') {
                    setView('changeTone')
                  } else {
                    handleRefineAction(action.type)
                  }
                }}
                className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-md hover:gba:bg-accent hover:gba:text-accent-foreground gba:transition-colors gba:text-left"
                data-testid={`ai-action-${action.type}-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="gba:flex-shrink-0">
                  <IconComponent size={16} />
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium">{action.label}</div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{action.description}</div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  const renderImproveView = () => (
    <div className="gba:flex gba:flex-col" data-testid="ai-improve-popover-view">
      {/* Header with Back Button */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-3 gba:pb-2 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setView('refine')
            setRefinePrompt('')
          }}
          className="gba:h-8 gba:w-8"
          data-testid="ai-improve-back-button"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <div className="gba:text-sm gba:font-medium">Improve Content</div>
      </div>

      {/* Prompt Input */}
      <div className="gba:p-4">
        <InputGroup>
          <InputGroupTextarea
            value={refinePrompt}
            onChange={e => setRefinePrompt(e.target.value)}
            placeholder="What would you like to improve?"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && refinePrompt.trim()) {
                e.preventDefault()
                e.stopPropagation()
                handleImprove(e)
              }
            }}
            data-testid="ai-improve-prompt-input"
            autoFocus
            rows={4}
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="default"
              className="gba:rounded-full"
              size="iconXs"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                handleImprove(e)
              }}
              disabled={!refinePrompt.trim()}
              data-testid="ai-improve-submit-button"
              type="button"
            >
              <PaperPlaneTiltIcon size={16} />
              <span className="gba:sr-only">Improve</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  )

  const renderTranslateView = () => (
    <div className="gba:flex gba:flex-col" data-testid="ai-translate-popover-view">
      {/* Header with Back Button */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-3 gba:pb-2 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setView('refine')
            setSelectedLanguage(null)
          }}
          className="gba:h-8 gba:w-8"
          data-testid="ai-translate-back-button"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <div className="gba:text-sm gba:font-medium">Translate to...</div>
      </div>

      {/* Language Select */}
      <div className="gba:p-4">
        <CatalogSelect.Provider {...context}>
          <CatalogSelect
            catalogIdentifier="Language:v1"
            value={selectedLanguage || undefined}
            onValueChange={value => {
              if (value) {
                const languageId = Array.isArray(value) ? value[0] : value
                if (languageId) {
                  handleLanguageSelect(languageId)
                }
              }
            }}
            className="gba:w-full"
            data-testid="ai-translate-language-select"
          />
        </CatalogSelect.Provider>
      </div>
    </div>
  )

  const renderChangeToneView = () => (
    <div className="gba:flex gba:flex-col" data-testid="ai-change-tone-popover-view">
      {/* Header with Back Button */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-3 gba:pb-2 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setView('refine')
          }}
          className="gba:h-8 gba:w-8"
          data-testid="ai-change-tone-back-button"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <div className="gba:text-sm gba:font-medium">Change tone to...</div>
      </div>

      {/* Tone Options */}
      <div className="gba:px-1 gba:pb-2 gba:max-h-[400px] gba:overflow-y-auto">
        {tones.map(tone => (
          <button
            key={tone}
            onClick={() => handleToneSelect(tone)}
            className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-md hover:gba:bg-accent hover:gba:text-accent-foreground gba:transition-colors gba:text-left"
            data-testid={`ai-action-tone-${tone.toLowerCase()}`}
          >
            <SpeakerHighIcon size={16} className="gba:flex-shrink-0" />
            <div className="gba:text-sm gba:font-medium">{tone}</div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="gba:relative">
      <Popover
        open={isPopoverOpen}
        onOpenChange={open => {
          // Don't close if we're loading
          if (!open && isLoading) {
            return
          }
          setIsPopoverOpen(open)
          // Reset to appropriate view when closing
          if (!open) {
            setView(hasContent ? 'refine' : 'generate')
          }
        }}
      >
        <PopoverAnchor asChild>
          <div ref={buttonRef}>
            <AiButton
              variant="default"
              size="sm"
              showIcon={true}
              icon={<SparkleIcon size={16} />}
              autoExecuteSingleAction={false}
              emptyStateBehavior="enable"
              onClick={() => setIsPopoverOpen(true)}
              data-testid="content-ai-text-generator-button"
            >
              AI Assist
            </AiButton>
          </div>
        </PopoverAnchor>
        <PopoverContent side="bottom" align="end" className="gba:w-[600px] gba:p-0 gba:rounded-lg" sideOffset={8}>
          {view === 'generate' && renderGenerateView()}
          {view === 'refine' && renderRefineView()}
          {view === 'improve' && renderImproveView()}
          {view === 'translate' && renderTranslateView()}
          {view === 'changeTone' && renderChangeToneView()}
          {view === 'loading' && renderLoadingView()}
          {view === 'response' && renderResponseView()}
        </PopoverContent>
      </Popover>
    </div>
  )
}
