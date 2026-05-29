import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SkillEditorPanel } from '../SkillEditorPanel'

// The tools modal reaches for FunctionsServiceClient, which imports
// @/common/utils/serviceResolver (references `import.meta.env`). Stub the
// whole client so we can deterministically control what functions the
// modal renders.
const mockListLatest = jest.fn()
const mockPromptManagerClient = {
  getCanonicalProviderTools: (...args: unknown[]) => mockListLatest(...args),
  getMcpProviderTools: jest.fn().mockResolvedValue([]),
  getBuiltinProviderTools: jest.fn().mockResolvedValue([])
}
jest.mock('@/common/network/functions/FunctionsServiceClient', () => ({
  FunctionsServiceClient: jest.fn().mockImplementation(() => ({
    listLatest: (...args: unknown[]) => mockListLatest(...args)
  }))
}))

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockPromptManagerClient
}))

const mockGetSkill = jest.fn()
const mockListSkillFiles = jest.fn()
const mockSaveSkillRaw = jest.fn()
const mockDeleteSkillFile = jest.fn()
const mockUploadSkillFiles = jest.fn()
const mockListSkillVersions = jest.fn()
const mockPublishSkillVersion = jest.fn()

jest.mock('../../../hooks/useEnterpriseAgentClient', () => {
  const stableClient = {
    getSkill: (...args: unknown[]) => mockGetSkill(...args),
    listSkillFiles: (...args: unknown[]) => mockListSkillFiles(...args),
    saveSkillRaw: (...args: unknown[]) => mockSaveSkillRaw(...args),
    deleteSkillFile: (...args: unknown[]) => mockDeleteSkillFile(...args),
    uploadSkillFiles: (...args: unknown[]) => mockUploadSkillFiles(...args),
    listSkillVersions: (...args: unknown[]) => mockListSkillVersions(...args),
    publishSkillVersion: (...args: unknown[]) => mockPublishSkillVersion(...args),
    getSkillVersion: jest.fn(),
    restoreSkillVersion: jest.fn(),
    getCanonicalProviderTools: (...args: unknown[]) => mockListLatest(...args),
    getMcpProviderTools: jest.fn().mockResolvedValue([]),
    getBuiltinProviderTools: jest.fn().mockResolvedValue([]),
    getSkillsManifest: jest.fn(),
    deleteSkill: jest.fn(),
    exportSkillBundle: jest.fn()
  }
  return {
    useEnterpriseAgentClient: () => stableClient
  }
})

describe('SkillEditorPanel', () => {
  beforeAll(() => {
    expect(React).toBeDefined()
  })

  beforeEach(() => {
    mockGetSkill.mockReset()
    mockListSkillFiles.mockReset()
    mockSaveSkillRaw.mockReset()
    mockDeleteSkillFile.mockReset()
    mockUploadSkillFiles.mockReset()
    mockListSkillVersions.mockReset()
    mockPublishSkillVersion.mockReset()
    mockListLatest.mockReset()
    mockListSkillVersions.mockResolvedValue([])
  })

  it('renders the empty state when no skillId is provided', () => {
    render(<SkillEditorPanel accessToken="token" skillId={null} />)
    expect(screen.getByTestId('skill-editor-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('skill-editor-panel')).not.toBeInTheDocument()
  })

  it('loads SKILL.md content and attached files for the selected skill', async () => {
    mockGetSkill.mockResolvedValue({
      skill_id: 'skl_a',
      content: '# Alpha\n\nDoes alpha things.',
      name: 'Alpha',
      description: 'Do alpha',
      is_active: true
    })
    mockListSkillFiles.mockResolvedValue([{ path: 'references/notes.md', mime_type: 'text/markdown', size: 123 }])

    render(<SkillEditorPanel accessToken="token" skillId="skl_a" />)

    const textarea = (await screen.findByTestId('skill-editor-textarea')) as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toBe('# Alpha\n\nDoes alpha things.'))
    expect(mockGetSkill).toHaveBeenCalledWith('skl_a')
    expect(mockListSkillFiles).toHaveBeenCalledWith('skl_a')
    expect(screen.getByText('references/notes.md')).toBeInTheDocument()
  })

  it('Save button calls saveSkillRaw with the edited content and invokes onSaved', async () => {
    mockGetSkill.mockResolvedValue({
      skill_id: 'skl_a',
      content: 'original',
      name: 'Alpha',
      description: 'Do alpha',
      is_active: true
    })
    mockListSkillFiles.mockResolvedValue([])
    mockSaveSkillRaw.mockResolvedValue({
      skill_id: 'skl_a',
      content: 'edited',
      name: 'Alpha',
      description: 'Do alpha',
      is_active: true
    })
    const onSaved = jest.fn()

    render(<SkillEditorPanel accessToken="token" skillId="skl_a" onSaved={onSaved} />)

    const textarea = (await screen.findByTestId('skill-editor-textarea')) as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toBe('original'))

    fireEvent.change(textarea, { target: { value: 'edited' } })
    expect(screen.getByTestId('skill-editor-dirty')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByTestId('skill-editor-save'))
    })

    expect(mockSaveSkillRaw).toHaveBeenCalledWith('skl_a', 'edited')
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' })
    )
    // After save the content becomes the new baseline so the dirty indicator disappears.
    await waitFor(() => expect(screen.queryByTestId('skill-editor-dirty')).not.toBeInTheDocument())
  })

  it('Save button is disabled when there are no unsaved changes', async () => {
    mockGetSkill.mockResolvedValue({
      skill_id: 'skl_a',
      content: 'hello',
      name: 'Alpha',
      description: 'Do alpha',
      is_active: true
    })
    mockListSkillFiles.mockResolvedValue([])

    render(<SkillEditorPanel accessToken="token" skillId="skl_a" />)

    const textarea = (await screen.findByTestId('skill-editor-textarea')) as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toBe('hello'))

    expect(screen.getByTestId('skill-editor-save')).toBeDisabled()
    expect(screen.getByTestId('skill-editor-revert')).toBeDisabled()
  })

  it('disables publish while the editor has unsaved draft changes', async () => {
    mockGetSkill.mockResolvedValue({
      skill_id: 'skl_a',
      content: 'hello',
      name: 'Alpha',
      description: 'Do alpha',
      version: 2,
      published_version: 1,
      is_active: true
    })
    mockListSkillFiles.mockResolvedValue([])

    render(<SkillEditorPanel accessToken="token" skillId="skl_a" />)

    const textarea = (await screen.findByTestId('skill-editor-textarea')) as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toBe('hello'))
    expect(screen.getByTestId('skill-editor-publish')).not.toBeDisabled()

    fireEvent.change(textarea, { target: { value: 'changed' } })

    expect(screen.getByTestId('skill-editor-publish')).toBeDisabled()
    fireEvent.click(screen.getByTestId('skill-editor-publish'))
    expect(mockPublishSkillVersion).not.toHaveBeenCalled()
  })

  it('Revert restores the original content', async () => {
    mockGetSkill.mockResolvedValue({
      skill_id: 'skl_a',
      content: 'original',
      name: 'Alpha',
      description: 'Do alpha',
      is_active: true
    })
    mockListSkillFiles.mockResolvedValue([])

    render(<SkillEditorPanel accessToken="token" skillId="skl_a" />)

    const textarea = (await screen.findByTestId('skill-editor-textarea')) as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toBe('original'))

    fireEvent.change(textarea, { target: { value: 'changed' } })
    expect((screen.getByTestId('skill-editor-textarea') as HTMLTextAreaElement).value).toBe('changed')

    fireEvent.click(screen.getByTestId('skill-editor-revert'))
    expect((screen.getByTestId('skill-editor-textarea') as HTMLTextAreaElement).value).toBe('original')
    expect(mockSaveSkillRaw).not.toHaveBeenCalled()
  })

  it('reloads content when skillId prop changes', async () => {
    mockGetSkill.mockImplementation((id: string) =>
      Promise.resolve({
        skill_id: id,
        content: `content-for-${id}`,
        name: id,
        description: '',
        is_active: true
      })
    )
    mockListSkillFiles.mockResolvedValue([])

    const { rerender } = render(<SkillEditorPanel accessToken="token" skillId="skl_a" />)
    const textarea = (await screen.findByTestId('skill-editor-textarea')) as HTMLTextAreaElement
    await waitFor(() => expect(textarea.value).toBe('content-for-skl_a'))

    rerender(<SkillEditorPanel accessToken="token" skillId="skl_b" />)
    await waitFor(() =>
      expect((screen.getByTestId('skill-editor-textarea') as HTMLTextAreaElement).value).toBe('content-for-skl_b')
    )
    expect(mockGetSkill).toHaveBeenCalledWith('skl_a')
    expect(mockGetSkill).toHaveBeenCalledWith('skl_b')
  })

  describe('Tools section', () => {
    const withFrontmatter = (body: string) => `---\nname: Alpha\ndescription: Do alpha\n---\n${body}`
    const withFrontmatterAndTools = (tools: string[], body = '# Alpha') =>
      `---\nname: Alpha\ndescription: Do alpha\ntools:\n${tools.map(t => `  - ${t}`).join('\n')}\n---\n${body}`

    const loadSkill = async (content: string) => {
      mockGetSkill.mockResolvedValue({
        skill_id: 'skl_a',
        content,
        name: 'Alpha',
        description: 'Do alpha',
        is_active: true
      })
      mockListSkillFiles.mockResolvedValue([])
      render(<SkillEditorPanel accessToken="token" skillId="skl_a" />)
      const textarea = (await screen.findByTestId('skill-editor-textarea')) as HTMLTextAreaElement
      await waitFor(() => expect(textarea.value).toBe(content))
      return textarea
    }

    it('renders the "Add Tool to Skill" affordance when a skill is loaded', async () => {
      await loadSkill(withFrontmatter('# Alpha\n\nBody.'))
      expect(screen.getByTestId('skill-editor-add-tool')).toHaveTextContent(/Add Tool to Skill/i)
    })

    it('pre-renders chips for tools already declared in the SKILL.md frontmatter', async () => {
      await loadSkill(withFrontmatterAndTools(['search_docs', 'run_query']))
      expect(screen.getByTestId('skill-editor-add-tool')).toHaveTextContent('2')
      expect(screen.getByTestId('skill-editor-tool-chip-search_docs')).toBeInTheDocument()
      expect(screen.getByTestId('skill-editor-tool-chip-run_query')).toBeInTheDocument()
    })

    it('disables the Add button when the SKILL.md has no YAML frontmatter', async () => {
      await loadSkill('# Skill without frontmatter\n\nJust a body.')
      expect(screen.getByTestId('skill-editor-add-tool')).toBeDisabled()
    })

    it('adding a tool through the modal rewrites the textarea and marks the editor dirty', async () => {
      mockListLatest.mockResolvedValue([
        { tool_ref: 'web_search', canonical_name: 'web_search', description: 'Search the web', source: 'functions' }
      ])
      const textarea = await loadSkill(withFrontmatter('# Alpha'))

      fireEvent.click(screen.getByTestId('skill-editor-add-tool'))
      await screen.findByTestId('add-tools-modal')

      await waitFor(() => expect(screen.getByTestId('add-tools-item-web_search')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('add-tools-item-web_search'))
      await act(async () => {
        fireEvent.click(screen.getByTestId('add-tools-modal-add'))
      })

      await waitFor(() => expect(textarea.value).toMatch(/tool_refs:\s*\n\s*-\s*web_search/))
      expect(screen.getByTestId('skill-editor-dirty')).toBeInTheDocument()
      expect(screen.getByTestId('skill-editor-tool-chip-web_search')).toBeInTheDocument()
    })

    it('renders native prompt_manager entries in the picker with friendly category labels', async () => {
      // The v2 endpoint now also returns native ``prompt_manager.*``
      // entries. The picker must show them alongside flowbot/functions
      // (single fetch, single list) and surface the category from the
      // shared CATEGORY_TO_TOOL_NAMES taxonomy under a friendly label.
      mockListLatest.mockResolvedValue([
        {
          tool_ref: 'prompt_manager.newwork_search_employees',
          canonical_name: 'newwork_search_employees',
          description: 'Search employees by name, role, etc.',
          source: 'prompt_manager',
          category: 'hr',
          tags: ['search', 'employee', 'hr'],
          input_schema: { type: 'object' },
          output_schema: {},
          capabilities: {}
        },
        {
          tool_ref: 'flowbot.web_search',
          canonical_name: 'web_search',
          description: 'Search the web',
          source: 'flowbot',
          category: 'web',
          tags: ['search'],
          input_schema: {},
          output_schema: {},
          capabilities: {}
        }
      ])
      await loadSkill(withFrontmatter('# Alpha'))

      fireEvent.click(screen.getByTestId('skill-editor-add-tool'))
      await screen.findByTestId('add-tools-modal')

      await waitFor(() => {
        expect(screen.getByTestId('add-tools-item-prompt_manager.newwork_search_employees')).toBeInTheDocument()
      })
      // Both surfaces in one list — proves the parallel mcp/builtin
      // fetches are gone and the v2 response is the single source of truth.
      expect(screen.getByTestId('add-tools-item-flowbot.web_search')).toBeInTheDocument()
      // Domain-led navigation: only the Category filter row exists.
      expect(screen.getByTestId('add-tools-modal-category-filter')).toBeInTheDocument()
      expect(screen.queryByTestId('add-tools-modal-source-filter')).not.toBeInTheDocument()
      // Category pills use friendly labels sourced from toolCategoryLabels.ts.
      expect(screen.getByTestId('add-tools-modal-category-pill-hr')).toHaveTextContent(/HR & Employees/)
      expect(screen.getByTestId('add-tools-modal-category-pill-web')).toHaveTextContent(/Web/)
      // The grouped section shows the same friendly label as a header.
      expect(screen.getByTestId('add-tools-modal-section-hr')).toHaveTextContent(/HR & Employees/)
    })

    it('shows display_name as the primary label and keeps tool_ref as the technical badge', async () => {
      // The picker must render the human-facing label, not the raw runtime
      // name. ``newwork_*`` is implementation history and should never be the
      // headline — but the durable tool_ref stays visible as a small badge.
      mockListLatest.mockResolvedValue([
        {
          tool_ref: 'prompt_manager.newwork_request_employee_absence',
          canonical_name: 'newwork_request_employee_absence',
          display_name: 'Request employee absence',
          description: 'Request an absence for an employee.',
          source: 'prompt_manager',
          category: 'hr',
          tags: [],
          input_schema: {},
          output_schema: {},
          capabilities: { risk_level: 'write', supports_hitl: true, requires_auth: true }
        }
      ])
      await loadSkill(withFrontmatter('# Alpha'))

      fireEvent.click(screen.getByTestId('skill-editor-add-tool'))
      await screen.findByTestId('add-tools-modal')

      const row = await screen.findByTestId('add-tools-item-prompt_manager.newwork_request_employee_absence')
      // Human label is the headline.
      expect(row).toHaveTextContent('Request employee absence')
      // Durable ref still shown as the technical badge.
      expect(row).toHaveTextContent('prompt_manager.newwork_request_employee_absence')
      // Real policy metadata surfaces (write + HITL), not the old read/no-auth.
      expect(row).toHaveTextContent(/write/)
      expect(row).toHaveTextContent(/HITL/)
    })

    it('opens the preview by default and renders schema params + description readably', async () => {
      // The right-hand preview must be open without clicking, show the tool's
      // description, and present the JSON schema as a readable parameter list
      // rather than raw JSON.
      mockListLatest.mockResolvedValue([
        {
          tool_ref: 'prompt_manager.newwork_get_employee_profile',
          canonical_name: 'newwork_get_employee_profile',
          display_name: 'Get employee profile',
          description: 'Fetch one employee profile by uuid. Read-only lookup.',
          source: 'prompt_manager',
          category: 'hr',
          tags: [],
          input_schema: {
            type: 'object',
            properties: {
              employee_id: { type: 'string', description: 'The employee UUID' }
            },
            required: ['employee_id']
          },
          output_schema: {},
          capabilities: { risk_level: 'read' }
        }
      ])
      await loadSkill(withFrontmatter('# Alpha'))

      fireEvent.click(screen.getByTestId('skill-editor-add-tool'))
      await screen.findByTestId('add-tools-modal')

      // Preview pane is present without any click.
      const preview = await screen.findByTestId('add-tools-preview')
      expect(preview).toHaveTextContent('Get employee profile')
      expect(preview).toHaveTextContent('Fetch one employee profile by uuid')
      // Schema rendered as a readable param row, not raw JSON.
      expect(preview).toHaveTextContent('employee_id')
      expect(preview).toHaveTextContent('The employee UUID')
      expect(preview).toHaveTextContent('required')
    })

    it('falls back to a humanized canonical name when display_name is absent', async () => {
      // Backward compatibility: an older backend response without
      // display_name must still render a clean label, never the raw
      // ``newwork_`` runtime name as the headline.
      mockListLatest.mockResolvedValue([
        {
          tool_ref: 'prompt_manager.newwork_search_employees',
          canonical_name: 'newwork_search_employees',
          description: 'Search employees.',
          source: 'prompt_manager',
          category: 'hr',
          tags: [],
          input_schema: {},
          output_schema: {},
          capabilities: {}
        }
      ])
      await loadSkill(withFrontmatter('# Alpha'))

      fireEvent.click(screen.getByTestId('skill-editor-add-tool'))
      await screen.findByTestId('add-tools-modal')

      const row = await screen.findByTestId('add-tools-item-prompt_manager.newwork_search_employees')
      expect(row).toHaveTextContent('Search employees')
    })

    it('filtering by category narrows the modal list to the selected bucket', async () => {
      mockListLatest.mockResolvedValue([
        {
          tool_ref: 'prompt_manager.newwork_search_employees',
          canonical_name: 'newwork_search_employees',
          description: 'hr',
          source: 'prompt_manager',
          category: 'hr',
          tags: [],
          input_schema: {},
          output_schema: {},
          capabilities: {}
        },
        {
          tool_ref: 'flowbot.web_search',
          canonical_name: 'web_search',
          description: 'web',
          source: 'flowbot',
          category: 'web',
          tags: [],
          input_schema: {},
          output_schema: {},
          capabilities: {}
        }
      ])
      await loadSkill(withFrontmatter('# Alpha'))

      fireEvent.click(screen.getByTestId('skill-editor-add-tool'))
      await screen.findByTestId('add-tools-modal')

      // Both entries visible by default.
      await waitFor(() => {
        expect(screen.getByTestId('add-tools-item-prompt_manager.newwork_search_employees')).toBeInTheDocument()
      })
      expect(screen.getByTestId('add-tools-item-flowbot.web_search')).toBeInTheDocument()

      // Click the HR category pill; only the HR entry should remain.
      fireEvent.click(screen.getByTestId('add-tools-modal-category-pill-hr'))

      await waitFor(() => expect(screen.queryByTestId('add-tools-item-flowbot.web_search')).not.toBeInTheDocument())
      expect(screen.getByTestId('add-tools-item-prompt_manager.newwork_search_employees')).toBeInTheDocument()
    })

    it('removing a chip drops the tool from the SKILL.md body and marks dirty', async () => {
      const textarea = await loadSkill(withFrontmatterAndTools(['to_remove']))
      expect(textarea.value).toMatch(/tools:\s*\n\s*-\s*to_remove/)

      fireEvent.click(screen.getByTestId('skill-editor-tool-chip-remove-to_remove'))

      expect(textarea.value).not.toMatch(/to_remove/)
      expect(screen.getByTestId('skill-editor-dirty')).toBeInTheDocument()
      expect(screen.queryByTestId('skill-editor-tool-chip-to_remove')).not.toBeInTheDocument()
    })
  })
})
