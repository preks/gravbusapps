import React, { useState } from 'react'
import { MessageSquare, LayoutDashboard } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CreateLayout } from '@/components/create-layout'
import { CreateChatInput } from '@/business-apps/core/create/components/CreateChatInput'

const DATA_TEST_ID = 'create-layout-example'

export const CreateLayoutExample: React.FC<BusinessAppContextProps> = () => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [input, setInput] = useState('')
  const [chatCollapsed, setChatCollapsed] = useState(false)

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: `You said: "${text}". This is a mock reply from the chat panel.` }
      ])
    }, 300)
  }

  return (
    <CreateLayout
      testId={DATA_TEST_ID}
      heroIcon={LayoutDashboard}
      heroTitle="Create Layout Example"
      heroSubtitle="Resizable chat + canvas. Drag the divider to resize."
      onBack={() => window.history.back()}
      heroBackLabel="Back"
      chatPanelCollapsed={chatCollapsed}
      onChatPanelCollapseChange={setChatCollapsed}
      chatPanel={
        <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0">
          <div className="gba:shrink-0 gba:px-4 gba:py-3 gba:border-b gba:border-border">
            <span className="gba:font-funnel-display gba:text-lg gba:font-semibold gba:text-primary">Chat panel</span>
          </div>
          <div className="gba:flex-1 gba:min-h-0 gba:space-y-3 gba:overflow-y-auto gba:px-4 gba:py-4">
            {messages.length === 0 && (
              <p className="gba:text-sm gba:text-muted-foreground">Messages appear here. Type below and press Send.</p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`gba:rounded-lg gba:px-3 gba:py-2 gba:text-sm ${
                  msg.role === 'user' ? 'gba:bg-primary gba:text-primary-foreground gba:ml-8' : 'gba:bg-muted gba:mr-8'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <CreateChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            placeholder="Type a message..."
            data-testid={`${DATA_TEST_ID}-chat-input`}
          />
        </div>
      }
      canvasPanel={
        <div className="gba:flex gba:h-full gba:min-h-0 gba:flex-col">
          <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2 gba:border-b gba:border-border gba:px-4 gba:py-3">
            <MessageSquare className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
            <span className="gba:font-medium">Canvas panel</span>
          </div>
          <div className="gba:flex-1 gba:overflow-auto gba:p-4">
            <p className="gba:text-muted-foreground gba:mb-4">
              This is the main content area (canvas). Use it for editor, preview, or form content.
            </p>
            <div className="gba:rounded-lg gba:border gba:border-border gba:p-4 gba:bg-muted/30">
              <p className="gba:text-sm gba:font-medium gba:mb-2">CreateLayout provides:</p>
              <ul className="gba:text-sm gba:list-disc gba:list-inside gba:space-y-1 gba:text-muted-foreground">
                <li>Optional header/hero slot above the two columns</li>
                <li>Resizable left panel (chat / AI wizard)</li>
                <li>Resize handle between chat and canvas</li>
                <li>Optional sidebar that can replace the chat panel</li>
                <li>Chat panel can be closed and reopened via the toggle</li>
              </ul>
            </div>
          </div>
        </div>
      }
    />
  )
}

export default CreateLayoutExample
