import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LinksRenderer } from './LinksRenderer'

const handleDocumentClickMock = jest.fn()

jest.mock('@/common/utils/documentClickHandler', () => ({
  handleDocumentClick: (...args: unknown[]) => handleDocumentClickMock(...args)
}))

describe('LinksRenderer', () => {
  beforeEach(() => {
    handleDocumentClickMock.mockReset()
  })

  it('uses the authenticated document click handler for document links', async () => {
    render(
      <LinksRenderer
        links={
          [
            {
              type: 'document:123',
              name: 'Policy PDF',
              url: '/files/api/v1/tenant/downloads/quick-task/123'
            }
          ] as any
        }
        accessToken="token-123"
        testId="links-renderer"
      />
    )

    fireEvent.click(screen.getByTestId('links-renderer-link-0'))

    await waitFor(() => {
      expect(handleDocumentClickMock).toHaveBeenCalledWith(
        {
          id: 'document:123',
          name: 'Policy PDF',
          fileInfo: {
            path: '/api/v1/tenant/downloads/quick-task/123'
          }
        },
        'token-123'
      )
    })
  })

  it('parses inbox document links stored as serialized file info', async () => {
    render(
      <LinksRenderer
        links={
          [
            {
              type: 'DOCUMENT',
              name: 'Attachment',
              url: JSON.stringify({
                path: '/api/v1/tenant/downloads/flow-launcher/flows/flow-genericapproval/launcher/atta/file.csv',
                fileId: 'file.csv',
                appName: 'flow-launcher',
                folderPath: '/flows/flow-genericapproval/launcher/atta',
                accessScope: 'tenant',
                fileMetadata: {
                  mimeType: 'text/csv',
                  originalFileName: 'report.csv'
                }
              })
            }
          ] as any
        }
        accessToken="token-123"
        testId="links-renderer"
      />
    )

    const link = screen.getByTestId('links-renderer-link-0')
    expect(link).toHaveAttribute(
      'href',
      '/files/api/v1/tenant/downloads/flow-launcher/flows/flow-genericapproval/launcher/atta/file.csv'
    )

    fireEvent.click(link)

    await waitFor(() => {
      expect(handleDocumentClickMock).toHaveBeenCalledWith(
        {
          id: 'DOCUMENT',
          name: 'Attachment',
          mimeType: 'text/csv',
          fileInfo: {
            path: '/api/v1/tenant/downloads/flow-launcher/flows/flow-genericapproval/launcher/atta/file.csv',
            fileMetadata: {
              mimeType: 'text/csv',
              originalFileName: 'report.csv'
            }
          }
        },
        'token-123'
      )
    })
  })

  it('keeps non-document links as normal anchors', () => {
    render(
      <LinksRenderer
        links={
          [
            {
              type: 'URL',
              name: 'Open Policy',
              url: 'https://example.com/policy'
            }
          ] as any
        }
        testId="links-renderer"
      />
    )

    const link = screen.getByTestId('links-renderer-link-0')
    expect(link).toHaveAttribute('href', 'https://example.com/policy')
    expect(handleDocumentClickMock).not.toHaveBeenCalled()
  })
})
