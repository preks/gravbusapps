/**
 * Renders an image in the editor. For file-service URLs, fetches with auth and shows blob URL.
 * Supports resize when the image is selected (bottom-right handle).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { fileClient } from '@/common/network/files/FileClient'
import type { Editor } from '@tiptap/core'

const MIN_SIZE = 50

function isFileServiceSrc(src: string): boolean {
  if (!src || src.startsWith('data:')) return false
  try {
    const u = new URL(src, window.location.origin)
    return u.pathname.includes('/tenant/downloads/')
  } catch {
    return false
  }
}

function getPathFromFileServiceUrl(fullUrl: string): string {
  try {
    const u = new URL(fullUrl)
    return u.pathname
  } catch {
    return fullUrl
  }
}

export interface DocumentImageViewProps {
  node: {
    attrs: {
      src?: string
      alt?: string
      title?: string
      width?: number | null
      height?: number | null
    }
  }
  editor: Editor | null
  getPos: () => number | undefined
  selected: boolean
  getAccessToken: () => string
}

export function DocumentImageView({ node, editor, getPos, selected, getAccessToken }: DocumentImageViewProps) {
  const src = node.attrs.src ?? ''
  const [displaySrc, setDisplaySrc] = useState<string>(src)
  const [error, setError] = useState(false)
  const objectUrlRef = useRef<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [dragSize, setDragSize] = useState<{ width: number; height: number } | null>(null)
  const dragSizeRef = useRef<{ width: number; height: number } | null>(null)

  const attrsWidth = node.attrs.width ?? null
  const attrsHeight = node.attrs.height ?? null
  const displayWidth = dragSize?.width ?? attrsWidth
  const displayHeight = dragSize?.height ?? attrsHeight
  const imgStyle: React.CSSProperties =
    displayWidth != null && displayHeight != null
      ? { width: displayWidth, height: displayHeight, maxWidth: '100%', objectFit: 'contain' }
      : { maxWidth: '100%', height: 'auto' }

  const onResizeHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const img = imgRef.current
      if (!img || !editor) return
      const startX = e.clientX
      const startY = e.clientY
      const startW = img.offsetWidth
      const startH = img.offsetHeight
      const current = { width: startW, height: startH }
      setDragSize(current)
      dragSizeRef.current = current

      const onMove = (e: MouseEvent) => {
        const dx = e.clientX - startX
        const dy = e.clientY - startY
        const w = Math.max(MIN_SIZE, startW + dx)
        const h = Math.max(MIN_SIZE, startH + dy)
        const next = { width: w, height: h }
        setDragSize(next)
        dragSizeRef.current = next
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        const final = dragSizeRef.current ?? { width: startW, height: startH }
        setDragSize(null)
        dragSizeRef.current = null
        if (getPos() === undefined) return
        editor
          .chain()
          .setNodeSelection(getPos()!)
          .updateAttributes('image', {
            width: Math.max(MIN_SIZE, Math.round(final.width)),
            height: Math.max(MIN_SIZE, Math.round(final.height))
          })
          .run()
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [editor, getPos]
  )

  useEffect(() => {
    if (!src) {
      setDisplaySrc('')
      setError(true)
      return
    }
    if (!isFileServiceSrc(src)) {
      setDisplaySrc(src)
      setError(false)
      return
    }
    const token = getAccessToken()
    if (!token) {
      setDisplaySrc(src)
      return
    }
    const path = getPathFromFileServiceUrl(src)
    fileClient
      .downloadFileByPath(path, token)
      .then(blob => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = URL.createObjectURL(blob)
        setDisplaySrc(objectUrlRef.current)
        setError(false)
      })
      .catch(() => {
        setError(true)
        setDisplaySrc('')
      })
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [src, getAccessToken])

  if (error || !displaySrc) {
    return (
      <NodeViewWrapper as="span" className="gba:inline-block gba:align-middle">
        <span
          className="gba:inline-flex gba:items-center gba:justify-center gba:min-h-[80px] gba:min-w-[120px] gba:rounded gba:bg-muted gba:text-muted-foreground gba:text-sm"
          data-testid="document-editor-image-broken"
        >
          Image
        </span>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper as="span" className="gba:inline-block gba:align-middle gba:relative gba:inline-flex">
      <img
        ref={imgRef}
        src={displaySrc}
        alt={node.attrs.alt ?? ''}
        title={node.attrs.title ?? undefined}
        className="editor-image gba:rounded gba:block"
        style={imgStyle}
        contentEditable={false}
        draggable={false}
        data-testid="document-editor-image"
      />
      {selected && (
        <span
          role="presentation"
          className="gba:absolute gba:bottom-0 gba:right-0 gba:w-3 gba:h-3 gba:border-t-2 gba:border-l-2 gba:border-primary gba:rounded-tl gba:cursor-nwse-resize gba:bg-muted"
          onMouseDown={onResizeHandleMouseDown}
          data-testid="document-editor-image-resize-handle"
        />
      )}
    </NodeViewWrapper>
  )
}
