import { useState, useCallback, useEffect, useRef } from 'react'
import * as Y from 'yjs'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWhiteboardAiSocket } from '../hooks/useWhiteboardAiSocket'
import { ExcalidrawToolExecutor } from '../services/ExcalidrawToolExecutor'
import { WhiteboardAiLayout } from './WhiteboardAiLayout'
import { WhiteboardAiChat } from './WhiteboardAiChat'
import { WhiteboardEditor } from './WhiteboardEditor'

interface WhiteboardEditorWithAiProps extends BusinessAppContextProps {
  whiteboardId: string
  onBack: () => void
  'data-testid'?: string
}

export const WhiteboardEditorWithAi: React.FC<WhiteboardEditorWithAiProps> = ({
  whiteboardId,
  accessToken,
  userInfo,
  onBack,
  'data-testid': testId = 'whiteboard-ai-editor'
}) => {
  const [chatVisible, setChatVisible] = useState(false)
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const ydocRef = useRef<Y.Doc | null>(null)
  const yElementsRef = useRef<Y.Array<Y.Map<unknown>> | null>(null)
  const yFilesRef = useRef<Y.Map<string> | null>(null)
  const toolExecutorRef = useRef<ExcalidrawToolExecutor | null>(null)

  const {
    isConnected,
    isStreaming,
    messages,
    streamingContent,
    status,
    sessionTitle,
    sendMessage,
    clearHistory,
    setOnToolCall
  } = useWhiteboardAiSocket({
    whiteboardId,
    accessToken: accessToken ?? '',
    enabled: chatVisible && !!accessToken
  })

  useEffect(() => {
    setOnToolCall(toolCall => {
      if (toolExecutorRef.current) {
        toolExecutorRef.current.execute(toolCall)
      }
    })
  }, [setOnToolCall])

  const handleExcalidrawReady = useCallback(
    (api: ExcalidrawImperativeAPI, ydoc: Y.Doc, yElements: Y.Array<Y.Map<unknown>>, yFiles: Y.Map<string>) => {
      excalidrawApiRef.current = api
      ydocRef.current = ydoc
      yElementsRef.current = yElements
      yFilesRef.current = yFiles
      toolExecutorRef.current = new ExcalidrawToolExecutor(api, ydoc, yElements, yFiles)
    },
    []
  )

  const handleSendMessage = useCallback(
    (message: string) => {
      const sceneContext = toolExecutorRef.current?.describeScene()
      sendMessage(message, sceneContext)
    },
    [sendMessage]
  )

  const userName =
    userInfo?.employeeDetails?.displayName ||
    `${userInfo?.employeeDetails?.firstName ?? ''} ${userInfo?.employeeDetails?.lastName ?? ''}`.trim() ||
    userInfo?.givenName ||
    undefined

  const userAvatarUrl = (() => {
    const thumb = userInfo?.employeeDetails?.pictureThumbnail
    if (!thumb) return undefined
    return thumb.startsWith('data:') ? thumb : `data:image/png;base64,${thumb}`
  })()

  const handleToggleChat = useCallback(() => {
    setChatVisible(prev => !prev)
  }, [])

  const handleCloseChat = useCallback(() => {
    setChatVisible(false)
  }, [])

  return (
    <WhiteboardAiLayout
      chatVisible={chatVisible}
      chatPanel={
        <WhiteboardAiChat
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          status={status}
          isConnected={isConnected}
          sessionTitle={sessionTitle}
          onSend={handleSendMessage}
          onClearHistory={clearHistory}
          onClose={handleCloseChat}
          userAvatarUrl={userAvatarUrl}
          userName={userName}
          testId={`${testId}-chat`}
        />
      }
      canvasPanel={
        <WhiteboardEditor
          whiteboardId={whiteboardId}
          accessToken={accessToken}
          userInfo={userInfo}
          onBack={onBack}
          onAiReady={handleExcalidrawReady}
          onToggleAiChat={handleToggleChat}
          aiChatVisible={chatVisible}
          data-testid={`${testId}-canvas`}
        />
      }
      testId={testId}
    />
  )
}
