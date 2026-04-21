import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { useOfficeClient } from '@/common/network/office/useOfficeClient'
import { useDocumentTemplates } from '../useDocumentTemplates'
import {
  getDocumentById,
  getDocumentTemplate,
  listDocumentTemplates,
  mapApiTemplateToTemplate
} from '../../utils/documentOfficeOperations'
import type { DocumentTemplate } from '../../types'

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/common/network/office/useOfficeClient', () => ({
  useOfficeClient: jest.fn()
}))

jest.mock('../../utils/documentOfficeOperations', () => ({
  getDocumentById: jest.fn(),
  getDocumentTemplate: jest.fn(),
  listDocumentTemplates: jest.fn(),
  mapApiTemplateToTemplate: jest.fn()
}))

const mockedUseOfficeClient = useOfficeClient as jest.Mock
const mockedGetDocumentById = getDocumentById as jest.MockedFunction<typeof getDocumentById>
const mockedGetDocumentTemplate = getDocumentTemplate as jest.MockedFunction<typeof getDocumentTemplate>
const mockedListDocumentTemplates = listDocumentTemplates as jest.MockedFunction<typeof listDocumentTemplates>
const mockedMapApiTemplateToTemplate = mapApiTemplateToTemplate as jest.MockedFunction<typeof mapApiTemplateToTemplate>

describe('useDocumentTemplates', () => {
  const createTemplateMock = jest.fn()

  const mappedTemplate: DocumentTemplate = {
    id: 'template-1',
    name: 'Offer Letter',
    description: 'Template description',
    content: '<p>Template</p>',
    category: 'letters',
    createdAt: '2026-04-21T10:00:00.000Z',
    updatedAt: '2026-04-21T10:00:00.000Z',
    createdBy: 'user-1',
    isPublic: false,
    usageCount: 0,
    tags: ['hr']
  }

  beforeEach(() => {
    createTemplateMock.mockReset()
    mockedGetDocumentById.mockReset()
    mockedGetDocumentTemplate.mockReset()
    mockedListDocumentTemplates.mockReset()
    mockedMapApiTemplateToTemplate.mockReset()

    mockedUseOfficeClient.mockReturnValue({
      documents: {
        createTemplate: createTemplateMock,
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        create: jest.fn()
      }
    })

    mockedListDocumentTemplates.mockResolvedValue([])
    mockedMapApiTemplateToTemplate.mockReturnValue(mappedTemplate)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('strips backend-owned fields before creating a template', async () => {
    createTemplateMock.mockResolvedValue({
      id: 'template-1',
      ownerId: 'user-1'
    })

    const { result } = renderHook(() => useDocumentTemplates('token'))

    await act(async () => {})
    createTemplateMock.mockClear()
    mockedListDocumentTemplates.mockClear()

    let createdTemplate: DocumentTemplate | null = null
    await act(async () => {
      createdTemplate = await result.current.createTemplate({
        name: 'Offer Letter',
        description: 'Template description',
        content: '<p>Template</p>',
        category: 'letters',
        isPublic: false,
        tags: ['hr'],
        createdBy: 'user-1'
      } as unknown as Parameters<typeof result.current.createTemplate>[0])
    })

    expect(createTemplateMock).toHaveBeenCalledWith({
      name: 'Offer Letter',
      description: 'Template description',
      content: '<p>Template</p>',
      category: 'letters',
      isPublic: false,
      tags: ['hr']
    })
    expect(mockedListDocumentTemplates).toHaveBeenCalledTimes(1)
    expect(createdTemplate).toBe(mappedTemplate)
    expect(toast.success).toHaveBeenCalledWith('doc-templates-toast-created')
  })

  it('omits createdBy when saving a document as a template', async () => {
    createTemplateMock.mockResolvedValue({
      id: 'template-2',
      ownerId: 'user-1'
    })
    mockedGetDocumentById.mockResolvedValue({
      id: 'doc-1',
      title: 'Contract Draft',
      content: '<p>Document body</p>',
      category: 'contracts',
      status: 'draft',
      createdAt: '2026-04-21T09:00:00.000Z',
      updatedAt: '2026-04-21T09:00:00.000Z',
      createdBy: 'user-1',
      isPublic: false,
      version: 1,
      tags: ['legal'],
      versionHistory: [],
      sharedWith: [],
      formatting: {
        fontFamily: 'Inter'
      }
    })

    const { result } = renderHook(() => useDocumentTemplates('token'))

    await act(async () => {})
    createTemplateMock.mockClear()
    mockedListDocumentTemplates.mockClear()

    let savedTemplate: DocumentTemplate | null = null
    await act(async () => {
      savedTemplate = await result.current.saveDocumentAsTemplate('doc-1', 'Contract Template', 'contracts', false)
    })

    expect(createTemplateMock).toHaveBeenCalledWith({
      name: 'Contract Template',
      description: 'Template created from: Contract Draft',
      content: '<p>Document body</p>',
      category: 'contracts',
      tags: ['legal'],
      isPublic: false,
      formatting: {
        fontFamily: 'Inter'
      }
    })
    expect(mockedListDocumentTemplates).toHaveBeenCalledTimes(1)
    expect(savedTemplate).toBe(mappedTemplate)
    expect(toast.success).toHaveBeenCalledWith('doc-templates-toast-saved-as-template')
  })
})
