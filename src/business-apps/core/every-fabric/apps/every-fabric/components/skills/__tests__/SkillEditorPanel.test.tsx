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
