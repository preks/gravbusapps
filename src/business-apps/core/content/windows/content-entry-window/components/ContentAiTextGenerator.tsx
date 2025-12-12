import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
  MagicWandIcon,
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
import { flowbotClient } from '@/common/network/flowbot'

export const ContentAiTextGenerator: React.FC<ContentAiTextGeneratorProps> = ({
  title,
  previewText,
  content,
  onTitleChange,
  onPreviewTextChange,
  onContentChange,
  context
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [view, setView] = useState<'main' | 'generate' | 'translate' | 'changeTone' | 'loading' | 'response'>('main')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<AiResponse | null>(null)
  const [activeAction, setActiveAction] = useState<AiActionType | null>(null)
  const [pendingOptions, setPendingOptions] = useState<{ tone?: string; language?: string; prompt?: string } | null>(
    null
  )
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [originalValues, setOriginalValues] = useState<AiResponse | null>(null)
  const buttonRef = React.useRef<HTMLDivElement>(null)

  // Debug: Track isPopoverOpen changes
  useEffect(() => {
    console.log('[AI Text Generator] isPopoverOpen changed', {
      isPopoverOpen,
      isLoading,
      activeAction,
      currentView: view,
      stackTrace: new Error().stack
    })
  }, [isPopoverOpen, isLoading, activeAction, view])

  const handleAction = useCallback(
    async (actionType: AiActionType, options?: { tone?: string; language?: string; prompt?: string }) => {
      console.log('[AI Text Generator] handleAction called', {
        actionType,
        options,
        isPopoverOpenBefore: isPopoverOpen,
        currentViewBefore: view,
        hasResponse: !!response
      })

      // Use response values if available (for refining), otherwise use props
      const previousResponse = response // Store state response to avoid shadowing
      const inputTitle = previousResponse?.title || title
      const inputPreviewText = previousResponse?.previewText || previewText
      const inputContent = previousResponse?.content || content
      const isRefining = !!previousResponse // Check if we're refining based on previous response

      setActiveAction(actionType)
      setIsLoading(true)
      setError(null)
      setPendingOptions(options || null)
      setView('loading') // Switch to loading view
      setSearchQuery('')

      // Store original values for fixSpelling action to show diff
      if (actionType === 'fixSpelling') {
        setOriginalValues({
          title: inputTitle,
          previewText: inputPreviewText,
          content: inputContent
        })
      }

      try {
        // Map UI action types to API action types
        const actionMap: Record<
          AiActionType,
          | 'improve_description'
          | 'summarize'
          | 'improve_writing'
          | 'fix_spelling_grammar'
          | 'make_shorter'
          | 'change_tone'
          | 'translate'
        > = {
          generate: 'improve_description',
          improve: 'improve_writing',
          summarize: 'summarize',
          fixSpelling: 'fix_spelling_grammar',
          shorten: 'make_shorter',
          changeTone: 'change_tone',
          translate: 'translate'
        }

        // Map tone values to API format
        const toneMap: Record<string, 'professional' | 'empathetic' | 'casual' | 'neutral' | 'educational'> = {
          Professional: 'professional',
          Empathetic: 'empathetic',
          Casual: 'casual',
          Neutral: 'neutral',
          Educational: 'educational',
          Formal: 'professional',
          Creative: 'casual',
          Technical: 'professional'
        }

        const apiAction = actionMap[actionType]

        // Prepare texts array - always pass all three fields (title, preview, content)
        const textsToProcess: string[] = []
        const fieldOrder: Array<'title' | 'previewText' | 'content'> = []

        // Static prompts used for all actions
        const TITLE_STATIC_PROMPT = 'Title with 80 character limit:'
        const PREVIEW_STATIC_PROMPT = 'Abstract with 250 character limit:'
        const CONTENT_STATIC_PROMPT = 'HTML styled full size article:'

        const prompt = options?.prompt || ''

        // For generate action (initial)
        if (actionType === 'generate' && !isRefining) {
          // Format: <static-prompt>: <prompt>
          textsToProcess.push(`${TITLE_STATIC_PROMPT} ${prompt}`)
          fieldOrder.push('title')

          textsToProcess.push(`${PREVIEW_STATIC_PROMPT} ${prompt}`)
          fieldOrder.push('previewText')

          textsToProcess.push(`${CONTENT_STATIC_PROMPT} ${prompt}`)
          fieldOrder.push('content')
        } else {
          // For all other cases (refining generate or any other action)
          // Format: <static-prompt>: <refinement-prompt>: <text> (or <static-prompt>: <text> if no refinement prompt)

          const titleText = inputTitle.trim() || ''
          const titlePrompt = prompt
            ? `${TITLE_STATIC_PROMPT} ${prompt}: ${titleText}`
            : `${TITLE_STATIC_PROMPT} ${titleText}`
          textsToProcess.push(titlePrompt)
          fieldOrder.push('title')

          const previewTextValue = inputPreviewText.trim() || ''
          const previewPrompt = prompt
            ? `${PREVIEW_STATIC_PROMPT} ${prompt}: ${previewTextValue}`
            : `${PREVIEW_STATIC_PROMPT} ${previewTextValue}`
          textsToProcess.push(previewPrompt)
          fieldOrder.push('previewText')

          const contentPrompt = prompt
            ? `${CONTENT_STATIC_PROMPT} ${prompt}: ${inputContent}`
            : `${CONTENT_STATIC_PROMPT} ${inputContent}`
          textsToProcess.push(contentPrompt)
          fieldOrder.push('content')
        }

        // If no text to process, show error
        if (textsToProcess.length === 0) {
          throw new Error('Please provide at least one text field to process')
        }

        console.log('[AI Text Generator] Texts to process:', {
          actionType,
          textsToProcess,
          textsCount: textsToProcess.length,
          fieldOrder
        })

        // Set up request options
        const requestOptions: {
          tone?: 'professional' | 'empathetic' | 'casual' | 'neutral' | 'educational' | null
          target_language?: string | null
        } = {}

        if (actionType === 'changeTone' && options?.tone) {
          requestOptions.tone = toneMap[options.tone] || 'professional'
        }

        if (actionType === 'translate' && options?.language) {
          requestOptions.target_language = options.language
        }

        // Set access token
        flowbotClient.setAccessToken(context.accessToken || '')

        // Call the API
        const response = await flowbotClient.generateText(textsToProcess, apiAction, requestOptions)

        // Map response back to AiResponse format
        // Response generated_texts array corresponds to input texts array order
        // Start with existing values (preserve what's already filled)
        const result: AiResponse = {
          title: inputTitle || '',
          previewText: inputPreviewText || '',
          content: inputContent || ''
        }

        // Map responses based on field order
        response.generated_texts.forEach((generatedText, index) => {
          const field = fieldOrder[index]
          if (!field || !generatedText) return

          if (field === 'title') {
            result.title = generatedText
          } else if (field === 'previewText') {
            result.previewText = generatedText
          } else if (field === 'content') {
            // Format content with HTML paragraphs
            result.content = `<p>${generatedText.replace(/\n/g, '</p><p>')}</p>`
          }
        })

        console.log('[AI Text Generator] Mapped response:', {
          fieldOrder,
          responseCount: response.generated_texts.length,
          result
        })

        setResponse(result)
        console.log('[AI Text Generator] API call successful, switching to response view', {
          result,
          actionType
        })

        // Switch to response view in the same popover
        setView('response')
      } catch (err) {
        console.error('[AI Text Generator] API call failed', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.log('[AI Text Generator] Error occurred, switching to response view', {
          error: err instanceof Error ? err.message : 'An error occurred'
        })

        // Switch to response view to show error
        setView('response')
      } finally {
        console.log('[AI Text Generator] handleAction finally block, setting isLoading to false')
        setIsLoading(false)
      }
    },
    [title, previewText, content, context.accessToken, response]
  )

  const handleLanguageSelect = useCallback(
    (languageId: string) => {
      if (languageId) {
        setSelectedLanguage(languageId)
        handleAction('translate', { language: languageId })
      }
    },
    [handleAction]
  )

  const handleGenerateWithPrompt = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      console.log('[AI Text Generator] handleGenerateWithPrompt called', {
        hasEvent: !!e,
        eventType: e?.type,
        generatePrompt: generatePrompt.trim(),
        isPopoverOpen,
        currentView: view
      })
      if (e) {
        e.preventDefault()
        e.stopPropagation()
        console.log('[AI Text Generator] Event prevented and stopped')
      }
      if (generatePrompt.trim()) {
        console.log('[AI Text Generator] Calling handleAction with generate')
        handleAction('generate', { prompt: generatePrompt.trim() })
        setGeneratePrompt('')
      }
    },
    [generatePrompt, handleAction]
  )

  const handleToneSelect = useCallback(
    (tone: string) => {
      handleAction('changeTone', { tone })
    },
    [handleAction]
  )

  const handleDiscard = useCallback(() => {
    setView('main')
    setResponse(null)
    setActiveAction(null)
    setPendingOptions(null)
    setOriginalValues(null)
    setIsPopoverOpen(false)
  }, [])

  const handleRefine = useCallback(() => {
    if (!activeAction) return

    // Navigate to the appropriate view based on action type to allow selecting new options
    if (activeAction === 'generate') {
      // Go back to generate view to enter a new prompt
      setView('generate')
      setGeneratePrompt('')
    } else if (activeAction === 'translate') {
      // Go back to translate view to select a different language
      setView('translate')
      setSelectedLanguage(null)
    } else if (activeAction === 'changeTone') {
      // Go back to changeTone view to select a different tone
      setView('changeTone')
    } else {
      // For other actions (improve, summarize, etc.), re-run directly with same options
      // This will use the response values as input (handled in handleAction)
      handleAction(activeAction, pendingOptions || undefined)
    }
  }, [activeAction, pendingOptions, handleAction])

  const handleInsert = useCallback(() => {
    if (response) {
      onTitleChange(response.title)
      onPreviewTextChange(response.previewText)
      onContentChange(response.content)
      setView('main')
      setResponse(null)
      setActiveAction(null)
      setPendingOptions(null)
      setOriginalValues(null)
      setIsPopoverOpen(false)
    }
  }, [response, onTitleChange, onPreviewTextChange, onContentChange])

  const tones = ['Professional', 'Empathetic', 'Casual', 'Neutral', 'Educational', 'Formal', 'Creative', 'Technical']

  // Define all actions with metadata
  const allActions = [
    {
      type: 'generate' as AiActionType,
      label: 'Generate',
      icon: MagicWandIcon,
      description: 'Generate new content with AI',
      keywords: ['generate', 'create', 'write', 'new']
    },
    {
      type: 'improve' as AiActionType,
      label: 'Improve',
      icon: SparkleIcon,
      description: 'Improve existing content',
      keywords: ['improve', 'enhance', 'better', 'refine']
    },
    {
      type: 'summarize' as AiActionType,
      label: 'Summarize',
      icon: FileTextIcon,
      description: 'Summarize the content',
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
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return allActions
    const query = searchQuery.toLowerCase()
    return allActions.filter(
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
            setView('main')
            setResponse(null)
            setActiveAction(null)
            setPendingOptions(null)
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

  const renderMainView = () => {
    return (
      <div className="gba:flex gba:flex-col" data-testid="ai-main-popover-view">
        {/* Search Input */}
        <div className="gba:px-3 gba:pt-3 gba:pb-2">
          <div className="gba:relative">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Write with AI or select from below"
              className="gba:h-9 gba:text-sm gba:!pl-10"
              data-testid="ai-action-search-input"
              autoFocus
            />
          </div>
        </div>

        {/* Actions List */}
        <div className="gba:px-1 gba:pb-2 gba:max-h-[400px] gba:overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="gba:px-4 gba:py-8 gba:text-center gba:text-sm gba:text-muted-foreground">
              No actions found
            </div>
          ) : (
            filteredActions.map(action => {
              const IconComponent = action.icon
              return (
                <button
                  key={action.type}
                  onClick={() => {
                    if (action.type === 'generate') {
                      setView('generate')
                    } else if (action.type === 'translate') {
                      setView('translate')
                    } else if (action.type === 'changeTone') {
                      setView('changeTone')
                    } else {
                      handleAction(action.type)
                    }
                  }}
                  className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-md hover:gba:bg-accent hover:gba:text-accent-foreground gba:transition-colors gba:text-left"
                  data-testid={`ai-action-${action.type}`}
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
  }

  const renderGenerateView = () => (
    <div className="gba:flex gba:flex-col" data-testid="ai-generate-popover-view">
      {/* Header with Back Button */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-3 gba:pb-2 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setView('main')
            setGeneratePrompt('')
          }}
          className="gba:h-8 gba:w-8"
          data-testid="ai-generate-back-button"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <div className="gba:text-sm gba:font-medium">Generate</div>
      </div>

      {/* Prompt Input */}
      <div className="gba:p-3">
        <InputGroup>
          <InputGroupTextarea
            value={generatePrompt}
            onChange={e => setGeneratePrompt(e.target.value)}
            placeholder="Tell me the topic..."
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && generatePrompt.trim()) {
                console.log('[AI Text Generator] Enter key pressed in textarea')
                e.preventDefault()
                e.stopPropagation()
                handleGenerateWithPrompt(e)
              }
            }}
            data-testid="ai-generate-prompt-input"
            autoFocus
          />
          <InputGroupAddon align="block-end">
            <InputGroupButton
              variant="default"
              className="gba:rounded-full"
              size="iconXs"
              onClick={e => {
                console.log('[AI Text Generator] Send button clicked', {
                  isPopoverOpen,
                  currentView: view,
                  generatePrompt: generatePrompt.trim()
                })
                e.preventDefault()
                e.stopPropagation()
                handleGenerateWithPrompt(e)
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

  const renderTranslateView = () => (
    <div className="gba:flex gba:flex-col" data-testid="ai-translate-popover-view">
      {/* Header with Back Button */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:pt-3 gba:pb-2 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setView('main')
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
      <div className="gba:p-3">
        <CatalogSelect.Provider {...context}>
          <CatalogSelect
            catalogIdentifier="Language:v1"
            value={selectedLanguage || undefined}
            onValueChange={value => {
              if (value) {
                handleLanguageSelect(value)
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
            setView('main')
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
          console.log('[AI Text Generator] Popover onOpenChange called', {
            open,
            isPopoverOpen,
            isLoading,
            activeAction,
            currentView: view,
            stackTrace: new Error().stack
          })
          // Don't close if we're loading
          if (!open && isLoading) {
            console.log('[AI Text Generator] Ignoring popover close during loading')
            return
          }
          setIsPopoverOpen(open)
          // Reset to main view when closing
          if (!open) {
            setView('main')
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
        <PopoverContent side="bottom" align="end" className="gba:w-[400px] gba:p-0 gba:rounded-lg" sideOffset={8}>
          {view === 'main' && renderMainView()}
          {view === 'generate' && renderGenerateView()}
          {view === 'translate' && renderTranslateView()}
          {view === 'changeTone' && renderChangeToneView()}
          {view === 'loading' && renderLoadingView()}
          {view === 'response' && renderResponseView()}
        </PopoverContent>
      </Popover>
    </div>
  )
}
