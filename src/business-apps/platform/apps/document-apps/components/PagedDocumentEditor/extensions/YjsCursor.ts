import { Extension } from '@tiptap/core'
import type { Awareness } from 'y-protocols/awareness'
import {
  defaultAwarenessStateFilter,
  yCursorPlugin
} from '@tiptap/y-tiptap'

// Modern color palette for collaboration cursors
const CURSOR_COLORS = [
  { bg: '#3B82F6', light: 'rgba(59, 130, 246, 0.15)' },   // Blue
  { bg: '#8B5CF6', light: 'rgba(139, 92, 246, 0.15)' },   // Purple
  { bg: '#EC4899', light: 'rgba(236, 72, 153, 0.15)' },   // Pink
  { bg: '#10B981', light: 'rgba(16, 185, 129, 0.15)' },   // Emerald
  { bg: '#F59E0B', light: 'rgba(245, 158, 11, 0.15)' },   // Amber
  { bg: '#EF4444', light: 'rgba(239, 68, 68, 0.15)' },    // Red
  { bg: '#06B6D4', light: 'rgba(6, 182, 212, 0.15)' },    // Cyan
  { bg: '#84CC16', light: 'rgba(132, 204, 22, 0.15)' },   // Lime
]

// Get a consistent color based on user ID
const getColorForUser = (userId: string): { bg: string; light: string } => {
  if (!userId) return CURSOR_COLORS[0]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

// Get initials from a name (e.g., "John Doe" -> "JD", "Alice" -> "A")
const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Custom cursor builder - creates the blinking cursor line with label + avatar
const modernCursorBuilder = (user: { name?: string; color?: string; userId?: string; avatar?: string }): HTMLElement => {
  // Guard for SSR - return a minimal element if document is not available
  if (typeof document === 'undefined') {
    return null as unknown as HTMLElement
  }
  
  const cursor = document.createElement('span')
  cursor.classList.add('collaboration-cursor__caret')
  
  const colors = getColorForUser(user.userId || user.name || '')
  const cursorColor = user.color || colors.bg
  const userName = user.name || 'Anonymous'
  const initials = getInitials(userName)
  const avatarUrl = user.avatar
  
  // Cursor container style
  cursor.style.cssText = `
    position: relative;
    margin-left: -1px;
    margin-right: -1px;
    border-left: none;
    border-right: none;
    pointer-events: none;
    word-break: normal;
  `

  // Create the blinking cursor line - positioned in front of everything
  const line = document.createElement('div')
  line.classList.add('collaboration-cursor__line')
  line.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 1.2em;
    background: ${cursorColor};
    z-index: 20;
    animation: cursor-blink 1s infinite;
  `

  // Create the label container - tiny pill floating above cursor
  const label = document.createElement('div')
  label.classList.add('collaboration-cursor__label')
  label.style.cssText = `
    position: absolute;
    bottom: 100%;
    left: -2px;
    margin-bottom: 2px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 16px;
    font-size: 10px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1;
    white-space: nowrap;
    color: white;
    background: ${cursorColor};
    padding: 0 5px 0 2px;
    border-radius: 8px;
    user-select: none;
    pointer-events: none;
    z-index: 10;
  `

  // Create the avatar - small circle
  if (avatarUrl) {
    const avatarImg = document.createElement('img')
    avatarImg.src = avatarUrl
    avatarImg.alt = userName
    avatarImg.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    `
    avatarImg.onerror = () => {
      avatarImg.style.display = 'none'
      const fallback = document.createElement('span')
      fallback.textContent = initials
      fallback.style.cssText = `
        width: 12px;
        height: 12px;
        background: rgba(255, 255, 255, 0.25);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 7px;
        font-weight: 700;
        border-radius: 50%;
      `
      label.insertBefore(fallback, label.firstChild)
    }
    label.appendChild(avatarImg)
  } else {
    const avatarSpan = document.createElement('span')
    avatarSpan.textContent = initials
    avatarSpan.style.cssText = `
      width: 12px;
      height: 12px;
      background: rgba(255, 255, 255, 0.25);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      font-weight: 700;
      border-radius: 50%;
    `
    label.appendChild(avatarSpan)
  }

  // Create the name span
  const nameSpan = document.createElement('span')
  nameSpan.textContent = userName

  label.appendChild(nameSpan)
  cursor.appendChild(line)
  cursor.appendChild(label)
  return cursor
}

// Custom selection builder - creates a full-height highlight for selected text
const modernSelectionBuilder = (user: { name?: string; color?: string; userId?: string }): { style: string; class?: string } => {
  const colors = getColorForUser(user.userId || user.name || '')
  const selectionColor = user.color || colors.bg
  
  return {
    style: `
      background: ${selectionColor}35;
      border-radius: 2px;
    `,
    class: 'collaboration-cursor__selection'
  }
}

export const createYjsCursorExtension = (awareness: Awareness) =>
  Extension.create({
    name: 'yjsCursor',
    addProseMirrorPlugins() {
      return [
        yCursorPlugin(awareness, {
          cursorBuilder: modernCursorBuilder,
          selectionBuilder: modernSelectionBuilder,
          awarenessStateFilter: defaultAwarenessStateFilter
        })
      ]
    }
  })
