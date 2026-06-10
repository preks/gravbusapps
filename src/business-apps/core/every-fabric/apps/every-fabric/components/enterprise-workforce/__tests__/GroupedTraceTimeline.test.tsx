/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { GroupedTraceTimeline, __INTERNAL } from '../agent-detail/trace/GroupedTraceTimeline'

const { buildRows, classifyEvent, formatDuration, diffMs } = __INTERNAL

describe('GroupedTraceTimeline helpers', () => {
  describe('classifyEvent', () => {
    it('maps tool, decision, hitl, approval, message and system buckets', () => {
      expect(classifyEvent('tool_started')).toBe('tool')
      expect(classifyEvent('tool_completed')).toBe('tool')
      expect(classifyEvent('decision_made')).toBe('decision')
      expect(classifyEvent('ask_human_started')).toBe('hitl')
      expect(classifyEvent('approval_granted')).toBe('approval')
      expect(classifyEvent('escalated')).toBe('approval')
      expect(classifyEvent('agent_message')).toBe('message')
      expect(classifyEvent('something_else')).toBe('system')
    })
  })

  describe('formatDuration', () => {
    it('renders ms, seconds, and minutes', () => {
      expect(formatDuration(null)).toBeNull()
      expect(formatDuration(250)).toBe('250ms')
      expect(formatDuration(1500)).toBe('1.5s')
      expect(formatDuration(45_000)).toBe('45s')
      expect(formatDuration(125_000)).toBe('2m 5s')
    })
  })

  describe('diffMs', () => {
    it('returns null when either side is missing or invalid', () => {
      expect(diffMs(null, null)).toBeNull()
      expect(diffMs('2026-05-30T12:00:00Z', null)).toBeNull()
      expect(diffMs('garbage', '2026-05-30T12:00:00Z')).toBeNull()
    })

    it('refuses to return negative durations', () => {
      expect(diffMs('2026-05-30T12:00:10Z', '2026-05-30T12:00:00Z')).toBeNull()
    })

    it('returns the positive ms gap', () => {
      expect(diffMs('2026-05-30T12:00:00Z', '2026-05-30T12:00:01Z')).toBe(1000)
    })
  })

  describe('buildRows', () => {
    it('pairs *_started / *_completed events with the same correlation key', () => {
      const rows = buildRows([
        {
          type: 'tool_started',
          name: 'http_get',
          tool_call_id: 'tc-1',
          timestamp: '2026-05-30T12:00:00Z'
        },
        {
          type: 'tool_completed',
          name: 'http_get',
          tool_call_id: 'tc-1',
          timestamp: '2026-05-30T12:00:02Z',
          message: 'ok'
        }
      ])
      expect(rows).toHaveLength(1)
      expect(rows[0].title).toContain('http_get')
      expect(rows[0].durationMs).toBe(2000)
      expect(rows[0].category).toBe('tool')
      expect(rows[0].body).toBe('ok')
    })

    it('keeps singleton events on their own row', () => {
      const rows = buildRows([
        {
          type: 'decision_made',
          name: 'route_to_inbox',
          timestamp: '2026-05-30T12:00:00Z',
          message: 'Picked inbox queue'
        }
      ])
      expect(rows).toHaveLength(1)
      expect(rows[0].category).toBe('decision')
      expect(rows[0].body).toBe('Picked inbox queue')
    })

    it('leaves unpaired starts in the timeline as in-flight rows', () => {
      const rows = buildRows([
        {
          type: 'tool_started',
          name: 'pending_tool',
          tool_call_id: 'tc-2',
          timestamp: '2026-05-30T12:00:00Z'
        }
      ])
      expect(rows).toHaveLength(1)
      expect(rows[0].durationMs).toBeNull()
    })

    it('returns an empty list for missing or empty trace', () => {
      expect(buildRows(undefined)).toEqual([])
      expect(buildRows([])).toEqual([])
    })
  })
})

describe('<GroupedTraceTimeline />', () => {
  it('renders the empty-state when there are no events', () => {
    render(<GroupedTraceTimeline trace={[]} />)
    expect(screen.getByTestId('workforce-trace-empty')).toBeInTheDocument()
  })

  it('renders one row per event with a raw expander', () => {
    render(
      <GroupedTraceTimeline
        trace={[
          {
            type: 'tool_started',
            name: 'http_get',
            tool_call_id: 'tc-1',
            timestamp: '2026-05-30T12:00:00Z'
          },
          {
            type: 'tool_completed',
            name: 'http_get',
            tool_call_id: 'tc-1',
            timestamp: '2026-05-30T12:00:01Z',
            message: 'success'
          }
        ]}
      />
    )
    const rows = screen.getAllByTestId('workforce-trace-row')
    expect(rows).toHaveLength(1)
    expect(screen.queryByTestId('workforce-trace-raw')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('workforce-trace-toggle-raw'))
    expect(screen.getByTestId('workforce-trace-raw')).toBeInTheDocument()
  })
})
