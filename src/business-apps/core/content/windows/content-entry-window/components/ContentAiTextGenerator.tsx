import React, { useState, useCallback, useMemo } from 'react'
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
  PaperPlaneTiltIcon
} from '@phosphor-icons/react'
import { AiResponsePopover } from './AiResponsePopover'
import type { ContentAiTextGeneratorProps, AiActionType, AiResponse } from './aiTextGeneratorTypes'

// Mock API function - to be replaced with real endpoint later
const mockAiApiCall = async (
  actionType: AiActionType,
  title: string,
  previewText: string,
  content: string,
  options?: { tone?: string; language?: string; prompt?: string }
): Promise<AiResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Mock responses based on action type
  const mockResponses: Record<
    AiActionType,
    (original: { title: string; previewText: string; content: string }) => AiResponse
  > = {
    generate: () => ({
      title: 'AI Generated Title: The Future of Technology',
      previewText: 'This is an AI-generated preview text that provides a compelling introduction to the topic.',
      content: '<p>This is AI-generated content that explores the fascinating world of technology and innovation.</p>'
    }),
    improve: original => ({
      title: `[Improved] ${original.title}`,
      previewText: `[Enhanced] ${original.previewText}`,
      content: `<p>[Refined] ${original.content}</p>`
    }),
    summarize: original => ({
      title: `Summary: ${original.title}`,
      previewText: `Key points: ${original.previewText.substring(0, 100)}...`,
      content: `<p>Summary: ${original.content.substring(0, 200)}...</p>`
    }),
    fixSpelling: original => ({
      title: original.title, // Assuming title is already correct
      previewText: original.previewText, // Assuming preview is already correct
      content: `<p>${original.content} [Grammar and spelling corrected]</p>`
    }),
    shorten: original => ({
      title: original.title,
      previewText: original.previewText.substring(0, Math.min(original.previewText.length, 50)) + '...',
      content: `<p>${original.content.substring(0, Math.min(original.content.length, 150))}...</p>`
    }),
    changeTone: original => ({
      title: `[${options?.tone || 'Professional'}] ${original.title}`,
      previewText: `[${options?.tone || 'Professional'}] ${original.previewText}`,
      content: `<p>[${options?.tone || 'Professional'} tone] ${original.content}</p>`
    }),
    translate: original => ({
      title: `[Translated to ${options?.language || 'German'}] ${original.title}`,
      previewText: `[Translated to ${options?.language || 'German'}] ${original.previewText}`,
      content: `<p>[Translated to ${options?.language || 'German'}] ${original.content}</p>`
    })
  }

  return mockResponses[actionType]({ title, previewText, content })
}

export const ContentAiTextGenerator: React.FC<ContentAiTextGeneratorProps> = ({
  title,
  previewText,
  content,
  onTitleChange,
  onPreviewTextChange,
  onContentChange,
  context
}) => {
  const [isMainPopoverOpen, setIsMainPopoverOpen] = useState(false)
  const [isResponsePopoverOpen, setIsResponsePopoverOpen] = useState(false)
  const [view, setView] = useState<'main' | 'generate' | 'translate' | 'changeTone'>('main')
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
  const buttonRef = React.useRef<HTMLDivElement>(null)

  const handleAction = useCallback(
    async (actionType: AiActionType, options?: { tone?: string; language?: string; prompt?: string }) => {
      setActiveAction(actionType)
      setIsLoading(true)
      setError(null)
      // Main-Popover OFFEN lassen, um Loading-State zu zeigen
      setPendingOptions(options || null)
      setView('main')
      setSearchQuery('')

      try {
        const result = await mockAiApiCall(actionType, title, previewText, content, options)
        setResponse(result)
        // Erst NACH erfolgreicher Antwort das Main-Popover schließen und Response-Popover öffnen
        setIsMainPopoverOpen(false)
        setIsResponsePopoverOpen(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        // Bei Fehler auch Main-Popover schließen und Response-Popover öffnen
        setIsMainPopoverOpen(false)
        setIsResponsePopoverOpen(true)
      } finally {
        setIsLoading(false)
      }
    },
    [title, previewText, content]
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

  const handleGenerateWithPrompt = useCallback(() => {
    if (generatePrompt.trim()) {
      handleAction('generate', { prompt: generatePrompt.trim() })
      setGeneratePrompt('')
    }
  }, [generatePrompt, handleAction])

  const handleToneSelect = useCallback(
    (tone: string) => {
      handleAction('changeTone', { tone })
    },
    [handleAction]
  )

  const handleDiscard = useCallback(() => {
    setIsResponsePopoverOpen(false)
    setResponse(null)
    setActiveAction(null)
    setPendingOptions(null)
  }, [])

  const handleRefine = useCallback(() => {
    if (activeAction) {
      handleAction(activeAction, pendingOptions || undefined)
    }
  }, [activeAction, pendingOptions, handleAction])

  const handleInsert = useCallback(() => {
    if (response) {
      onTitleChange(response.title)
      onPreviewTextChange(response.previewText)
      onContentChange(response.content)
      setIsResponsePopoverOpen(false)
      setResponse(null)
      setActiveAction(null)
      setPendingOptions(null)
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

  const renderMainView = () => {
    // Wenn eine Action läuft, zeige Loading-State
    if (isLoading && activeAction) {
      return (
        <div
          className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8"
          data-testid="ai-loading-state"
        >
          <Spinner className="gba:w-8 gba:h-8" />
          <div className="gba:mt-4 gba:text-sm gba:font-medium">Generating AI content...</div>
          <div className="gba:mt-1.5 gba:text-xs gba:text-muted-foreground">
            Please wait while we process your request
          </div>
        </div>
      )
    }

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
                e.preventDefault()
                handleGenerateWithPrompt()
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
              onClick={handleGenerateWithPrompt}
              disabled={!generatePrompt.trim()}
              data-testid="ai-generate-submit-button"
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
      <Popover open={isMainPopoverOpen} onOpenChange={setIsMainPopoverOpen}>
        <PopoverAnchor asChild>
          <div ref={buttonRef}>
            <AiButton
              variant="default"
              size="sm"
              showIcon={true}
              icon={<SparkleIcon size={16} />}
              autoExecuteSingleAction={false}
              emptyStateBehavior="enable"
              onClick={() => setIsMainPopoverOpen(true)}
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
        </PopoverContent>
      </Popover>

      <AiResponsePopover
        isOpen={isResponsePopoverOpen}
        onOpenChange={setIsResponsePopoverOpen}
        response={response}
        isLoading={isLoading}
        error={error}
        onDiscard={handleDiscard}
        onRefine={handleRefine}
        onInsert={handleInsert}
        actionType={activeAction}
        anchorRef={buttonRef}
      />
    </div>
  )
}
