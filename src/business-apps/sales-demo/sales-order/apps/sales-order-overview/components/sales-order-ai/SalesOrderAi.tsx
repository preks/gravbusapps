import React, { useState, useRef, useEffect } from 'react'
import { Button, Input, Modal, Avatar, Typography } from 'antd'
import { PiMagicWand, PiArrowRight, PiPaperPlane, PiPlus, PiFile, PiX } from 'react-icons/pi'
import EveryAIOutline from '@/assets/icons/everyAiOutline.svg'

const { TextArea } = Input
const { Text } = Typography

interface SalesOrderAiProps {
  className?: string
}

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  files?: File[]
}

interface Suggestion {
  id: string
  text: string
  icon?: React.ReactNode
}

interface UploadedFile {
  id: string
  file: File
  name: string
  size: string
}

const suggestions: Suggestion[] = [
  {
    id: 'analyze-orders',
    text: 'Analyze my sales order trends this month',
    icon: <PiMagicWand className="gba:text-blue-500" />
  },
  {
    id: 'pending-approvals',
    text: 'Show me orders pending approval',
    icon: <PiMagicWand className="gba:text-orange-500" />
  },
  {
    id: 'customer-insights',
    text: 'Give me insights on top customers',
    icon: <PiMagicWand className="gba:text-green-500" />
  },
  {
    id: 'order-optimization',
    text: 'How to optimize order processing?',
    icon: <PiMagicWand className="gba:text-purple-500" />
  }
]

export const SalesOrderAi: React.FC<SalesOrderAiProps> = ({ className }) => {
  const [prompt, setPrompt] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const inputRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Mock AI responses for demo
  const getAiResponse = (userMessage: string, files?: File[]): string => {
    const responses = [
      "I'd be happy to help you with your sales order management! Based on your request, here are some insights...",
      "Let me analyze that for you. Here's what I found in your sales order data...",
      'Great question! For sales order optimization, I recommend looking at these areas...',
      "I can help you with that. Here's a step-by-step guide for sales order processing..."
    ]

    if (files && files.length > 0) {
      return `I can see you've uploaded ${files.length} file(s). Let me analyze them for sales order insights... ${responses[Math.floor(Math.random() * responses.length)]}`
    }

    return responses[Math.floor(Math.random() * responses.length)]
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map(file => ({
        id: Date.now() + Math.random().toString(),
        file,
        name: file.name,
        size: formatFileSize(file.size)
      }))
      setUploadedFiles(prev => [...prev, ...newFiles])
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleAddFilesClick = () => {
    fileInputRef.current?.click()
  }

  const handlePromptSubmit = async () => {
    if (!prompt.trim() && uploadedFiles.length === 0) return

    const files = uploadedFiles.map(uf => uf.file)
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      text: prompt || 'File upload',
      isUser: true,
      timestamp: new Date(),
      files: files.length > 0 ? files : undefined
    }

    setChatMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)
    setIsModalOpen(true)
    setPrompt('')
    setUploadedFiles([])
    setShowSuggestions(false)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getAiResponse(prompt, files.length > 0 ? files : undefined),
        isUser: false,
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1000)
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setPrompt(suggestion.text)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePromptSubmit()
    }
  }

  const handleSuggestionKeyDown = (e: React.KeyboardEvent, suggestion: Suggestion) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSuggestionClick(suggestion)
    }
  }

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  return (
    <>
      <div className={`gba:relative ${className}`} data-testid="sales-order-ai-section">
        <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-xl gba:bg-blue-50 gba:shadow-lg gba:z-50 gba:relative gba:min-w-[400px] gba:h-[50px]">
          {/* Left Icon - AI */}
          <button
            type="button"
            className="gba:flex gba:items-center gba:cursor-pointer gba:p-1 gba:rounded gba:border-none gba:bg-transparent gba:hover:bg-gray-100 gba:transition-colors"
            onClick={() => inputRef.current?.focus()}
            aria-label="Focus AI input"
          >
            <img src={EveryAIOutline} alt="AI" className="gba:text-gray-500 gba:text-xl gba:w-5 gba:h-5" />
          </button>

          {/* Input Field */}
          <input
            ref={inputRef}
            placeholder="Ask about sales orders..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            className="gba:flex-1 gba:bg-transparent gba:border-none gba:outline-none gba:text-gray-800 gba:placeholder-gray-500 gba:mx-3 gba:text-sm gba:font-medium"
            data-testid="sales-order-ai-prompt-input"
          />

          {/* Right Icon - Send */}
          <button
            type="button"
            onClick={handlePromptSubmit}
            disabled={!prompt.trim() && uploadedFiles.length === 0}
            className="gba:flex gba:items-center gba:justify-center gba:cursor-pointer gba:p-1 gba:rounded gba:transition-colors gba:hover:bg-gray-100 gba:disabled:opacity-50 gba:disabled:cursor-not-allowed gba:border-none gba:bg-transparent"
            data-testid="sales-order-ai-submit-button"
          >
            <PiPaperPlane
              className={`gba:text-lg ${prompt.trim() || uploadedFiles.length > 0 ? 'gba:text-blue-500' : 'gba:text-gray-400'}`}
            />
          </button>
          {/* Right Icon - Add Files */}
          <button
            type="button"
            onClick={handleAddFilesClick}
            className="gba:flex gba:items-center gba:justify-center gba:cursor-pointer gba:p-1 gba:rounded gba:transition-colors gba:hover:bg-gray-100 gba:border-none gba:bg-transparent"
            data-testid="sales-order-ai-add-files-button"
          >
            <PiPlus className="gba:text-lg gba:text-gray-500" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="gba:hidden"
            data-testid="sales-order-ai-file-input"
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div
            className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:mt-2 gba:bg-white gba:border gba:border-gray-200 gba:rounded-xl gba:shadow-lg gba:z-50 gba:max-h-64 gba:overflow-y-auto"
            data-testid="sales-order-ai-suggestions"
          >
            <div className="gba:p-3 gba:border-b gba:border-gray-100">
              <Text className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                Sales Order Suggestions
              </Text>
            </div>
            <div className="gba:py-2">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:hover:bg-gray-50 gba:cursor-pointer gba:focus:bg-gray-50 gba:focus:outline-none gba:w-full gba:text-left gba:border-none gba:bg-transparent gba:transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                  onKeyDown={e => handleSuggestionKeyDown(e, suggestion)}
                  data-testid={`sales-order-ai-suggestion-${suggestion.id}`}
                >
                  <div className="gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded gba:bg-gray-100">
                    {suggestion.icon}
                  </div>
                  <Text className="gba:text-sm gba:text-gray-700 gba:flex-1">{suggestion.text}</Text>
                  <PiArrowRight className="gba:text-gray-400 gba:text-sm" />
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div
            className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:mt-2 gba:bg-white gba:border gba:border-gray-200 gba:rounded-xl gba:shadow-lg gba:z-50 gba:max-h-64 gba:overflow-y-auto"
            data-testid="sales-order-ai-uploaded-files"
          >
            <div className="gba:p-3 gba:border-b gba:border-gray-100">
              <Text className="gba:text-xs gba:text-gray-500 gba:font-medium gba:uppercase gba:tracking-wide">
                Uploaded Files
              </Text>
            </div>
            <div className="gba:py-2">
              {uploadedFiles.map(file => (
                <div
                  key={file.id}
                  className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:hover:bg-gray-50 gba:cursor-pointer gba:focus:bg-gray-50 gba:focus:outline-none gba:w-full gba:text-left gba:border-none gba:bg-transparent gba:transition-colors"
                  data-testid={`sales-order-ai-uploaded-file-${file.id}`}
                >
                  <div className="gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded gba:bg-gray-100">
                    <PiFile className="gba:text-gray-500" />
                  </div>
                  <Text className="gba:text-sm gba:text-gray-700 gba:flex-1">
                    {file.name} ({file.size})
                  </Text>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="gba:flex gba:items-center gba:justify-center gba:cursor-pointer gba:p-1 gba:rounded gba:transition-colors gba:hover:bg-gray-100 gba:border-none gba:bg-transparent"
                    data-testid={`sales-order-ai-remove-file-${file.id}`}
                  >
                    <PiX className="gba:text-gray-400 gba:text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <img src={EveryAIOutline} alt="AI" className="gba:text-gray-500 gba:text-xl gba:w-5 gba:h-5" />
            <span>Sales Order AI Assistant</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
        className="gba:ai-chat-modal"
        data-testid="sales-order-ai-chat-modal"
      >
        <div className="gba:flex gba:flex-col gba:h-96">
          <div
            className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:space-y-4"
            data-testid="sales-order-ai-chat-messages"
          >
            {chatMessages.map(message => (
              <div
                key={message.id}
                className={`gba:flex gba:gap-3 ${message.isUser ? 'gba:justify-end' : 'gba:justify-start'}`}
                data-testid={`sales-order-ai-message-${message.id}`}
              >
                {!message.isUser && (
                  <Avatar
                    icon={
                      <img src={EveryAIOutline} alt="AI" className="gba:text-gray-500 gba:text-xl gba:w-5 gba:h-5" />
                    }
                    className="gba:bg-blue-500"
                    size="small"
                  />
                )}
                <div
                  className={`gba:max-w-xs gba:p-3 gba:rounded-lg ${
                    message.isUser ? 'gba:bg-blue-500 gba:text-white' : 'gba:bg-gray-100 gba:text-gray-800'
                  }`}
                >
                  <Text className={message.isUser ? 'gba:text-white' : 'gba:text-gray-800'}>{message.text}</Text>
                  {message.files && message.files.length > 0 && (
                    <div className="gba:mt-2">
                      <Text className={message.isUser ? 'gba:text-white' : 'gba:text-gray-800'}>
                        {message.files.length} file(s) uploaded
                      </Text>
                    </div>
                  )}
                </div>
                {message.isUser && (
                  <Avatar className="gba:bg-gray-500" size="small">
                    U
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="gba:flex gba:gap-3 gba:justify-start" data-testid="sales-order-ai-loading">
                <Avatar
                  icon={<img src={EveryAIOutline} alt="AI" className="gba:text-gray-500 gba:text-xl gba:w-5 gba:h-5" />}
                  className="gba:bg-blue-500"
                  size="small"
                />
                <div className="gba:bg-gray-100 gba:p-3 gba:rounded-lg">
                  <Text className="gba:text-gray-500">AI is analyzing your sales orders...</Text>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="gba:border-t gba:border-gray-200 gba:p-4">
            <div className="gba:flex gba:gap-2">
              <TextArea
                placeholder="Continue the conversation about sales orders..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                autoSize={{ minRows: 1, maxRows: 3 }}
                className="gba:flex-1"
                data-testid="sales-order-ai-chat-input"
              />
              <Button
                type="primary"
                icon={<PiPaperPlane />}
                onClick={handlePromptSubmit}
                disabled={!prompt.trim() && uploadedFiles.length === 0}
                data-testid="sales-order-ai-chat-send-button"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default SalesOrderAi
