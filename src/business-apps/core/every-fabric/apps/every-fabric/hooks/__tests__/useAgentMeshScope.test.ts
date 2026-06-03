/** @jest-environment jsdom */
import React from 'react'
import { act, renderHook } from '@testing-library/react'

const mockSelectSession = jest.fn()
let mockActiveSessionId: string | null = null

jest.mock('../../context/FabricContext', () => ({
  useFabric: () => ({
    activeSessionId: mockActiveSessionId,
    selectSession: mockSelectSession
  })
}))

import { AgentMeshScopeProvider, useAgentMeshScope } from '../useAgentMeshScope'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AgentMeshScopeProvider, null, children)

const renderScopeHook = () => renderHook(() => useAgentMeshScope(), { wrapper })

function setUrl(search: string) {
  window.history.replaceState({}, '', `/test${search}`)
}

beforeEach(() => {
  mockSelectSession.mockReset()
  mockActiveSessionId = null
  setUrl('')
})

describe('useAgentMeshScope', () => {
  describe('initialization', () => {
    it('starts on session scope when activeSessionId is set', () => {
      mockActiveSessionId = 's1'
      const { result } = renderScopeHook()
      expect(result.current.scope).toBe('session')
      expect(result.current.sessionId).toBe('s1')
      expect(result.current.canGoBack).toBe(false)
    })

    it('falls back to company when URL says session but no active session', () => {
      setUrl('?meshScope=session')
      const { result } = renderScopeHook()
      expect(result.current.scope).toBe('company')
    })

    it('reads meshScope and userId from URL', () => {
      setUrl('?meshScope=user&userId=u42')
      const { result } = renderScopeHook()
      expect(result.current.scope).toBe('user')
      expect(result.current.userId).toBe('u42')
    })

    it('reads fullscreen flag from URL', () => {
      setUrl('?meshScope=company&fullscreen=1')
      const { result } = renderScopeHook()
      expect(result.current.isFullscreen).toBe(true)
    })
  })

  describe('setScope (lateral tab navigation)', () => {
    it('resets the stack to a single entry (no back history)', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.setScope('me'))
      expect(result.current.scope).toBe('me')
      expect(result.current.canGoBack).toBe(false)
      expect(result.current.breadcrumbs).toHaveLength(1)
    })

    it('updates URL when scope changes', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.setScope('user', 'u1'))
      expect(window.location.search).toContain('meshScope=user')
      expect(window.location.search).toContain('userId=u1')
    })
  })

  describe('pushSnapshot (drill-down)', () => {
    it('pushes a new entry onto the stack', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.pushSnapshot({ scope: 'user', userId: 'u1', fullscreen: false }))
      expect(result.current.scope).toBe('user')
      expect(result.current.canGoBack).toBe(true)
      expect(result.current.breadcrumbs).toHaveLength(2)
    })

    it('triggers selectSession when drilling to session', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.pushSnapshot({ scope: 'session', sessionId: 's5', fullscreen: false }))
      expect(mockSelectSession).toHaveBeenCalledWith('s5')
    })
  })

  describe('back navigation', () => {
    it('pops to previous snapshot after drill-down', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.pushSnapshot({ scope: 'user', userId: 'u1', fullscreen: false }))
      act(() => result.current.back())
      expect(result.current.scope).toBe('company')
      expect(result.current.canGoBack).toBe(false)
    })

    it('is a no-op at root', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.back())
      expect(result.current.scope).toBe('company')
    })

    it('clears active session when leaving session scope via setScope', () => {
      mockActiveSessionId = 's1'
      const { result } = renderScopeHook()
      act(() => result.current.setScope('user', 'u1'))
      expect(mockSelectSession).toHaveBeenCalledWith(null)
    })
  })

  describe('goToIndex', () => {
    it('truncates the stack to the requested index', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.pushSnapshot({ scope: 'user', userId: 'u1', fullscreen: false }))
      act(() => result.current.pushSnapshot({ scope: 'session', sessionId: 's1', fullscreen: false }))
      expect(result.current.breadcrumbs).toHaveLength(3)
      act(() => result.current.goToIndex(0))
      expect(result.current.scope).toBe('company')
      expect(result.current.breadcrumbs).toHaveLength(1)
    })
  })

  describe('fullscreen', () => {
    it('toggleFullscreen flips the flag without pushing a new entry', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      expect(result.current.isFullscreen).toBe(false)
      act(() => result.current.toggleFullscreen())
      expect(result.current.isFullscreen).toBe(true)
      expect(result.current.breadcrumbs).toHaveLength(1)
    })

    it('writes fullscreen=1 to URL when enabled', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.toggleFullscreen())
      expect(window.location.search).toContain('fullscreen=1')
    })

    it('setFullscreen(false) removes the URL flag', () => {
      setUrl('?meshScope=company&fullscreen=1')
      const { result } = renderScopeHook()
      expect(result.current.isFullscreen).toBe(true)
      act(() => result.current.setFullscreen(false))
      expect(window.location.search).not.toContain('fullscreen')
    })
  })

  describe('updateTopLabel', () => {
    it('replaces the label without changing identity', () => {
      setUrl('?meshScope=company')
      const { result } = renderScopeHook()
      act(() => result.current.pushSnapshot({ scope: 'user', userId: 'u1', fullscreen: false }))
      act(() => result.current.updateTopLabel('Maria Popescu'))
      const top = result.current.breadcrumbs[result.current.breadcrumbs.length - 1]
      expect(top.label).toBe('Maria Popescu')
      expect(result.current.breadcrumbs).toHaveLength(2)
    })
  })
})
