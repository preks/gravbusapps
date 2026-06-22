/**
 * Flow + comms cards (service workflow / workflow template / chat conversation /
 * meeting): each renders its distinctive lead — progress footer, step/version
 * facts, participant stack, and time range respectively.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key })
  }
})

const mockUseFlowReference = jest.fn()
const mockUseFlowTemplateReference = jest.fn()
const mockUseConversationReference = jest.fn()
const mockUseMeetingReference = jest.fn()

jest.mock('./hooks/flowReferenceHooks', () => ({
  __esModule: true,
  useFlowReference: (...a: any[]) => mockUseFlowReference(...a),
  useFlowTemplateReference: (...a: any[]) => mockUseFlowTemplateReference(...a)
}))
jest.mock('./hooks/commsReferenceHooks', () => ({
  __esModule: true,
  useConversationReference: (...a: any[]) => mockUseConversationReference(...a),
  useMeetingReference: (...a: any[]) => mockUseMeetingReference(...a)
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  getEntityUrl: () => '/x'
}))
jest.mock('@/common/utils/navigationUtils', () => ({ __esModule: true, navigateTo: jest.fn() }))
jest.mock('./IconTile', () => ({
  __esModule: true,
  IconTile: () => <span data-testid="icon-tile" />,
  tileGlyph: () => null
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials', () => ({
  __esModule: true,
  AvatarWithInitials: (props: any) => <span data-testid="avatar">{`${props.firstName} ${props.lastName}`}</span>
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/entities/EntityCard', () => ({
  __esModule: true,
  EntityCard: (props: any) => (
    <div data-testid="entity-card" data-loading={String(!!props.isLoading)}>
      <span data-testid="title">{props.title}</span>
      <span data-testid="subtitle">{props.subtitle}</span>
      <span data-testid="status">{props.status}</span>
      <ul data-testid="fields">
        {(props.fields ?? []).map((f: any, i: number) => (
          <li key={i}>{`${f.label}=${f.value}`}</li>
        ))}
      </ul>
      <div data-testid="footer">{props.footer}</div>
    </div>
  )
}))

import { ServiceWorkflowReferenceCard } from './ServiceWorkflowReferenceCard'
import { WorkflowTemplateReferenceCard } from './WorkflowTemplateReferenceCard'
import { ChatConversationReferenceCard } from './ChatConversationReferenceCard'
import { MeetingReferenceCard } from './MeetingReferenceCard'
import type { EntityReference } from '../../../../types/enterpriseAgent'

const ref = (type: string): EntityReference => ({
  type,
  id: 'x-1',
  href: `${type}://x-1`,
  label: 'Fallback',
  category: 'misc'
})

beforeEach(() => {
  mockUseFlowReference.mockReset()
  mockUseFlowTemplateReference.mockReset()
  mockUseConversationReference.mockReset()
  mockUseMeetingReference.mockReset()
})

describe('ServiceWorkflowReferenceCard', () => {
  it('shows status and a progress footer with step counts', () => {
    mockUseFlowReference.mockReturnValue({
      loading: false,
      data: {
        name: 'Onboarding',
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        progress: { completedSteps: 2, totalSteps: 5, percentage: 40 }
      }
    })
    render(<ServiceWorkflowReferenceCard reference={ref('service_workflow')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Onboarding')
    expect(screen.getByTestId('status')).toHaveTextContent('In Progress')
    expect(screen.getByTestId('footer')).toHaveTextContent('renderer-ref-progress-steps')
  })
})

describe('WorkflowTemplateReferenceCard', () => {
  it('shows step count, version and a Draft badge', () => {
    mockUseFlowTemplateReference.mockReturnValue({
      loading: false,
      data: {
        template: { name: 'Approval flow', version: 3, steps: [{}, {}] },
        metadata: { isDraft: true }
      }
    })
    render(<WorkflowTemplateReferenceCard reference={ref('workflow_template')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Approval flow')
    expect(screen.getByTestId('status')).toHaveTextContent('renderer-ref-status-draft')
    expect(screen.getByTestId('fields')).toHaveTextContent('renderer-ref-field-steps=renderer-ref-count-step')
    expect(screen.getByTestId('fields')).toHaveTextContent('renderer-ref-field-version=renderer-ref-version')
  })
})

describe('ChatConversationReferenceCard', () => {
  it('renders a participant stack, unread badge and last-message snippet', () => {
    mockUseConversationReference.mockReturnValue({
      loading: false,
      data: {
        name: 'Project chat',
        unreadCount: 4,
        lastMessage: { content: 'See you tomorrow' },
        participants: [{ user: { firstName: 'Al', lastName: 'Pa' } }, { firstName: 'Bo', lastName: 'Bee' }]
      }
    })
    render(<ChatConversationReferenceCard reference={ref('chat_conversation')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Project chat')
    expect(screen.getByTestId('status')).toHaveTextContent('renderer-ref-unread-count')
    expect(screen.getAllByTestId('avatar').length).toBe(2)
    expect(screen.getByTestId('footer')).toHaveTextContent('renderer-ref-participant-count')
  })
})

describe('MeetingReferenceCard', () => {
  it('renders a time range subtitle, organizer and attendee count', () => {
    mockUseMeetingReference.mockReturnValue({
      loading: false,
      data: {
        title: 'Sprint review',
        status: 'scheduled',
        startTime: '2026-06-20T13:00:00Z',
        endTime: '2026-06-20T14:00:00Z',
        organizer: { firstName: 'Sam', lastName: 'Vee' },
        participants: [{}, {}, {}]
      }
    })
    render(<MeetingReferenceCard reference={ref('meetings')} accessToken="tok" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Sprint review')
    expect(screen.getByTestId('status')).toHaveTextContent('Scheduled')
    expect(screen.getByTestId('subtitle')).toHaveTextContent('–')
    expect(screen.getByTestId('fields')).toHaveTextContent('renderer-ref-field-organizer=Sam Vee')
    expect(screen.getByTestId('fields')).toHaveTextContent('renderer-ref-field-attendees=renderer-ref-count-attendee')
  })
})
