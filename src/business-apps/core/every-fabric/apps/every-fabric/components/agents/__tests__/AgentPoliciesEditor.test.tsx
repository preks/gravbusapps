/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { AgentPoliciesEditor } from '../AgentPoliciesEditor'

const mockGetAgentPolicies = jest.fn()
const mockGetWorkspacePolicies = jest.fn()
const mockSetAgentPolicies = jest.fn()

// Stable client reference (mirrors the real memoized singleton) so the hook's
// effect does not re-fire every render.
const mockClient = {
  getAgentPolicies: (...args: unknown[]) => mockGetAgentPolicies(...args),
  getWorkspacePolicies: (...args: unknown[]) => mockGetWorkspacePolicies(...args),
  setAgentPolicies: (...args: unknown[]) => mockSetAgentPolicies(...args)
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

const DEFAULT_UUID = '11111111-1111-1111-1111-111111111111'
const EXPLICIT_UUID = '22222222-2222-2222-2222-222222222222'
const NEW_UUID = '33333333-3333-3333-3333-333333333333'
const LEGACY_SLUG = 'policy.insurance.claim_triage.v1'

// Stub the heavy intranet picker with a button that fires onAdd directly so we
// can assert the editor's apply/persist wiring without the GraphQL content hook.
// isPolicyUuid mirrors the real implementation so the hook's uuid filtering runs.
jest.mock('../AddPoliciesModal', () => ({
  buildPolicyDetailUrl: (id: string) => `/platform/content/intranet/content-record?contentId=${id}`,
  isPolicyUuid: (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim()),
  AddPoliciesModal: ({ onAdd }: { onAdd: (picked: Array<{ id: string; title: string }>) => void }) => (
    <button
      type="button"
      data-testid="mock-add-apply"
      onClick={() => onAdd([{ id: '33333333-3333-3333-3333-333333333333', title: 'New Policy' }])}
    >
      apply
    </button>
  )
}))

describe('AgentPoliciesEditor', () => {
  beforeEach(() => {
    mockGetAgentPolicies.mockReset()
    mockGetWorkspacePolicies.mockReset()
    mockSetAgentPolicies.mockReset()
    mockSetAgentPolicies.mockResolvedValue({})
    mockGetWorkspacePolicies.mockResolvedValue({ workspace_id: null, workspace_name: null, policies: [] })
  })

  it('renders nothing when the agent does not support per-agent policies', async () => {
    mockGetAgentPolicies.mockResolvedValue({ supported: false, policies: [], excluded_policy_refs: [] })

    const { container } = render(<AgentPoliciesEditor agentId="a1" accessToken="tok" />)

    await waitFor(() => expect(container.querySelector('[data-testid="agent-config-policies"]')).toBeNull())
  })

  it('shows effective policies (workspace defaults + explicit) with deep-links', async () => {
    mockGetAgentPolicies.mockResolvedValue({
      supported: true,
      policies: [{ policy_id: EXPLICIT_UUID, title: 'Explicit Policy' }],
      excluded_policy_refs: []
    })
    mockGetWorkspacePolicies.mockResolvedValue({
      workspace_id: 'ws',
      workspace_name: 'WS',
      policies: [{ policy_id: DEFAULT_UUID, title: 'Default Policy' }]
    })

    render(<AgentPoliciesEditor agentId="a1" accessToken="tok" />)

    const defaultChip = await screen.findByTestId(`config-policy-${DEFAULT_UUID}`)
    expect(defaultChip).toHaveTextContent('Default Policy')
    expect(defaultChip.querySelector('a')?.getAttribute('href')).toContain(DEFAULT_UUID)
    expect(screen.getByTestId(`config-policy-${EXPLICIT_UUID}`)).toHaveTextContent('Explicit Policy')
  })

  it('persists a newly picked policy through setAgentPolicies', async () => {
    mockGetAgentPolicies.mockResolvedValue({ supported: true, policies: [], excluded_policy_refs: [] })

    render(<AgentPoliciesEditor agentId="a1" accessToken="tok" />)

    fireEvent.click(await screen.findByTestId('config-policy-add-button'))
    fireEvent.click(screen.getByTestId('mock-add-apply'))

    await waitFor(() => expect(mockSetAgentPolicies).toHaveBeenCalledWith('a1', [NEW_UUID], []))
  })

  it('excludes a workspace default instead of deleting it', async () => {
    mockGetAgentPolicies.mockResolvedValue({ supported: true, policies: [], excluded_policy_refs: [] })
    mockGetWorkspacePolicies.mockResolvedValue({
      workspace_id: 'ws',
      workspace_name: 'WS',
      policies: [{ policy_id: DEFAULT_UUID, title: 'Default Policy' }]
    })

    render(<AgentPoliciesEditor agentId="a1" accessToken="tok" />)

    fireEvent.click(await screen.findByTestId(`config-policy-remove-${DEFAULT_UUID}`))

    await waitFor(() => expect(mockSetAgentPolicies).toHaveBeenCalledWith('a1', [], [DEFAULT_UUID]))
  })

  // Regression: agents seeded with legacy slug refs (e.g. policy.insurance.*)
  // must remain editable. The registry endpoint 422s on any non-uuid ref, so
  // the hook strips slugs from the payload — removing a chip then succeeds and
  // the slug is rendered as plain text (no broken deep-link).
  it('lets you remove a policy even when a legacy slug ref is attached', async () => {
    mockGetAgentPolicies.mockResolvedValue({
      supported: true,
      policies: [
        { policy_id: LEGACY_SLUG, title: LEGACY_SLUG },
        { policy_id: EXPLICIT_UUID, title: 'Explicit Policy' }
      ],
      excluded_policy_refs: []
    })

    render(<AgentPoliciesEditor agentId="a1" accessToken="tok" />)

    const slugChip = await screen.findByTestId(`config-policy-${LEGACY_SLUG}`)
    expect(slugChip.querySelector('a')).toBeNull()

    fireEvent.click(screen.getByTestId(`config-policy-remove-${EXPLICIT_UUID}`))

    // The slug is filtered out of the payload (would otherwise 422), so the
    // save succeeds and only uuid refs are sent.
    await waitFor(() => expect(mockSetAgentPolicies).toHaveBeenCalledWith('a1', [], []))
  })
})
