/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { ManageCatalogPanel } from '../ManageCatalogPanel'

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
  useTranslation: () => ({ t: (key: string) => key })
}))

function createMockClient(): PromptManagerClient {
  return {
    listMarketplacePackages: jest.fn().mockResolvedValue({
      data: [
        {
          package_id: 'customer-360-analyst',
          version: '1.0.0',
          name: 'Customer 360 Analyst',
          description: 'CRM analyst',
          category: 'crm',
          publisher: 'newwork',
          skill_count: 1,
          tool_count: 4,
          install_count: 2,
          is_active: true
        }
      ]
    }),
    marketplaceUnpublish: jest.fn().mockResolvedValue({ success: true })
  } as unknown as PromptManagerClient
}

describe('ManageCatalogPanel', () => {
  it('lists packages and unpublishes a selected entry', async () => {
    const client = createMockClient()
    render(<ManageCatalogPanel client={client} />)

    expect(await screen.findByTestId('manage-catalog-row-customer-360-analyst')).toBeInTheDocument()
    expect(screen.getByText('marketplace-manage-unpublish')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('manage-catalog-unpublish-customer-360-analyst'))

    await waitFor(() => {
      expect(client.marketplaceUnpublish).toHaveBeenCalledWith('customer-360-analyst', '1.0.0')
    })
  })
})
