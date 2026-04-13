jest.mock('@/common/env/EnvUtils', () => ({
  env: jest.fn()
}))

jest.mock('@/business-apps/platform/apps/shared/utils/documentServiceUrl', () => ({
  getDocumentOfficeWebSocketBaseUrl: jest.fn(),
  getDocumentServiceApiUrl: jest.fn()
}))

jest.mock('@/common/utils/serviceResolver', () => ({
  resolveServiceUrl: jest.fn(() => 'http://fallback.example/document')
}))

import { env } from '@/common/env/EnvUtils'
import {
  getDocumentOfficeWebSocketBaseUrl,
  getDocumentServiceApiUrl
} from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { getSpreadsheetCollaborationWebSocketBaseUrl } from '../spreadsheetCollaborationWebSocketUrl'

const envMock = env as jest.MockedFunction<typeof env>
const getDerivedMock = getDocumentOfficeWebSocketBaseUrl as jest.MockedFunction<
  typeof getDocumentOfficeWebSocketBaseUrl
>
const getApiMock = getDocumentServiceApiUrl as jest.MockedFunction<typeof getDocumentServiceApiUrl>

describe('getSpreadsheetCollaborationWebSocketBaseUrl', () => {
  beforeEach(() => {
    envMock.mockReset()
    getDerivedMock.mockReset()
    getApiMock.mockReset()
  })

  it('uses derived base when explicit WS origin differs from document REST', () => {
    envMock.mockImplementation((key: string) => {
      if (key === 'NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL') return 'http://localhost:3001/document'
      return undefined
    })
    getDerivedMock.mockReturnValue('http://localhost:3002')
    getApiMock.mockReturnValue('http://localhost:3002/api/v1')

    expect(getSpreadsheetCollaborationWebSocketBaseUrl()).toBe('http://localhost:3002')
  })

  it('uses derived base when REST is bare /api/v1 but explicit WS includes /document on same host', () => {
    envMock.mockImplementation((key: string) => {
      if (key === 'NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL') return 'http://localhost:3002/document'
      return undefined
    })
    getDerivedMock.mockReturnValue('http://localhost:3002')
    getApiMock.mockReturnValue('http://localhost:3002/api/v1')

    expect(getSpreadsheetCollaborationWebSocketBaseUrl()).toBe('http://localhost:3002')
  })

  it('keeps explicit URL when API is mounted under /document and explicit matches that mount', () => {
    envMock.mockImplementation((key: string) => {
      if (key === 'NEXT_PUBLIC_DOCUMENT_WEB_SOCKET_URL') return 'https://app.example.com/document'
      return undefined
    })
    getDerivedMock.mockReturnValue('https://app.example.com/document')
    getApiMock.mockReturnValue('https://app.example.com/document/api/v1')

    expect(getSpreadsheetCollaborationWebSocketBaseUrl()).toBe('https://app.example.com/document')
  })
})
