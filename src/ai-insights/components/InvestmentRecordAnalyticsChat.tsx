/**
 * Embedded analytics assistant shown on the investment record page.
 * Streams chat responses while attaching the current page analytics payload.
 */

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, Button, Input } from '@newwork/nw-design-system'
import { Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { usePageAnalytics } from '../hooks/usePageAnalytics'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

interface InvestmentRecordAnalyticsChatProps {
  investmentId: string
  investmentName?: string
  accessToken: string
  currency?: string
}

export const InvestmentRecordAnalyticsChat: React.FC<InvestmentRecordAnalyticsChatProps> = ({
  investmentId,
  investmentName,
  accessToken,
  currency = 'EUR'
}) => {
  const { t } = useTranslation('ai-insights')
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<Array<{ side: 'user' | 'agent'; text: string; timestamp: Date }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { getPageAnalyticsContext } = usePageAnalytics({
    entity: {
      type: 'investment',
      id: investmentId,
      name: investmentName
    },
    accessToken,
    currency,
    sessionId
  })
  const flowbotBaseUrl = resolveFlowbotBaseUrl()
  const restClient = useRestClient(flowbotBaseUrl)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation.length])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage('')
    setIsLoading(true)

    // Add user message
    setConversation(prev => [...prev, { side: 'user', text: userMessage, timestamp: new Date() }])

    try {
      // Get page context with analytics (sent once per session)
      const pageContext = await getPageAnalyticsContext({
        url: window.location.href,
        route: window.location.pathname,
        view: 'investment-record',
        type: 'entity',
        entity_name: 'Investment',
        id: investmentId
      })

      // Create FormData for chat API
      const form = new FormData()
      form.append('session_id', sessionId || '')
      form.append('user_input_text', userMessage)
      form.append('llm_model', 'gpt-4.1')
      form.append('use_web_search_tool', 'false')
      form.append('current_page_context', JSON.stringify(pageContext))

      const requestPath = '/flowbot/api/agent/v2/chat'
      console.info('[AI Insights] Fetch FlowBot URL:', `${flowbotBaseUrl || ''}${requestPath}`)
      const ssePayload = await restClient.post<string>(requestPath, form, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream'
        }
      })
      let accumulatedResponse = ''
      let newSessionId = sessionId

      const frames = (ssePayload || '').split('\n\n')
      for (const frame of frames) {
        if (!frame.trim()) continue

        const lines = frame.split('\n')
        let eventType = ''
        let data = ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ')) {
            data = line.slice(6)
          }
        }

        if (eventType === 'session-id' && data && !newSessionId) {
          newSessionId = data.replace(/"/g, '')
          setSessionId(newSessionId)
        } else if (eventType === 'output-item' && data) {
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'answer' && parsed.displayData) {
              for (const displayItem of parsed.displayData) {
                if (displayItem.type === 'textBlock' && displayItem.text) {
                  accumulatedResponse += displayItem.text
                }
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse output item:', parseError)
          }
        }
      }

      // Add agent response
      const responseText =
        accumulatedResponse || t('analyticsAssistant.emptyResponse', 'The service returned an empty response.')
      setConversation(prev => [...prev, { side: 'agent', text: responseText, timestamp: new Date() }])
    } catch (error) {
      console.error('Error calling AI agent:', error)
      setConversation(prev => [
        ...prev,
        {
          side: 'agent',
          text: t('analyticsAssistant.error', 'Failed to get a response from the service. Please try again later.'),
          timestamp: new Date()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const clearConversation = () => {
    setConversation([])
    setSessionId('')
  }

  const loadingLabel = t('analyticsAssistant.sending', 'Sending…')

  return (
    <Card className="gba:mb-4" data-testid="investment-record-analytics-chat">
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <h3 className="gba:text-sm gba:font-medium">{t('analyticsAssistant.title', 'Analytics Assistant')}</h3>
          {conversation.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearConversation} data-testid="analytics-chat-clear-button">
              <X size={14} />
            </Button>
          )}
        </div>

        {conversation.length > 0 && (
          <div
            ref={scrollRef}
            className="gba:mb-3 gba:overflow-y-auto gba:border gba:border-border gba:rounded-lg gba:p-2"
            style={{ maxHeight: '400px' }}
            data-testid="analytics-chat-conversation"
          >
            {conversation.map((turn, index) => (
              <div
                key={index}
                className={`gba:mb-3 gba:flex ${turn.side === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
              >
                <div
                  className={`gba:max-w-[80%] gba:rounded-lg gba:px-3 gba:py-2 ${
                    turn.side === 'user'
                      ? 'gba:bg-primary gba:text-primary-foreground'
                      : 'gba:bg-muted gba:text-foreground'
                  }`}
                >
                  <p className="gba:text-sm">{turn.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="gba:flex gba:justify-start gba:mb-3">
                <div className="gba:bg-muted gba:rounded-lg gba:px-3 gba:py-2">
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {t('analyticsAssistant.thinking', 'Thinking...')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSend} className="gba:flex gba:space-x-2">
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('analyticsAssistant.placeholder', 'Ask about MOIC, IRR, EBITDA, or this page')}
            className="gba:flex-1 gba:text-sm"
            disabled={isLoading}
            data-testid="analytics-chat-input"
          />
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={isLoading || !message.trim()}
            data-testid="analytics-chat-submit-button"
          >
            {isLoading ? loadingLabel : <Send size={14} />}
          </Button>
        </form>

        {conversation.length === 0 && (
          <div className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
            <p>{t('analyticsAssistant.exampleHeading', 'Example questions:')}</p>
            <ul className="gba:list-disc gba:list-inside gba:mt-1">
              <li>{t('analyticsAssistant.examples.moic', '"Show the current MOIC"')}</li>
              <li>{t('analyticsAssistant.examples.ebitda', '"What is the EBITDA for this investment?"')}</li>
              <li>{t('analyticsAssistant.examples.summary', '"Summarize what this page shows"')}</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
