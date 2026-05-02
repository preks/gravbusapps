import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import * as Y from 'yjs'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useWhiteboardAiSocket } from '../hooks/useWhiteboardAiSocket'
import { useCurrentUserPicture } from '@/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture'
import { ExcalidrawToolExecutor } from '../services/ExcalidrawToolExecutor'
import { WhiteboardAiLayout } from './WhiteboardAiLayout'
import { WhiteboardAiChat } from './WhiteboardAiChat'
import { WhiteboardEditor } from './WhiteboardEditor'

interface WhiteboardEditorWithAiProps extends BusinessAppContextProps {
  whiteboardId: string
  isReadOnly?: boolean
  canComment?: boolean
  canManageSharing?: boolean
  canRename?: boolean
  onBack: () => void
  'data-testid'?: string
}

export const WhiteboardEditorWithAi: React.FC<WhiteboardEditorWithAiProps> = ({
  whiteboardId,
  isReadOnly = false,
  canComment = false,
  canManageSharing = false,
  canRename = false,
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
    enabled: !isReadOnly && chatVisible && !!accessToken
  })

  useEffect(() => {
    if (isReadOnly) {
      setChatVisible(false)
    }
  }, [isReadOnly])

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
    (message: string, imageDataUrl?: string) => {
      const sceneContext = toolExecutorRef.current?.describeScene()
      sendMessage(message, sceneContext, imageDataUrl)
    },
    [sendMessage]
  )

  const userName =
    userInfo?.employeeDetails?.displayName ||
    `${userInfo?.employeeDetails?.firstName ?? ''} ${userInfo?.employeeDetails?.lastName ?? ''}`.trim() ||
    userInfo?.givenName ||
    undefined

  const { pictureThumbnail: pictureFromGraphql } = useCurrentUserPicture(
    userInfo?.employeeDetails?.employeeId,
    accessToken ?? ''
  )

  const userAvatarUrl = useMemo(() => {
    const raw = pictureFromGraphql || userInfo?.employeeDetails?.pictureThumbnail
    if (!raw) return undefined
    if (raw.startsWith('data:') || /^https?:\/\//i.test(raw)) return raw
    return `data:image/png;base64,${raw}`
  }, [pictureFromGraphql, userInfo?.employeeDetails?.pictureThumbnail])

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
          isReadOnly={isReadOnly}
          canComment={canComment}
          canManageSharing={canManageSharing}
          canRename={canRename}
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
