import React from 'react'
import {
  LeadSettings,
  CatalogItem,
  CatalogUpsertData
} from '@/common/components/common-relations/setting-pages/lead/LeadSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface LeadDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  initialTab?: 'ratings' | 'statuses' | 'sources'
}

const DATA_TEST_ID = 'InvestmentLeadDataPage'

const LeadDataPage: React.FC<LeadDataPageProps> = ({ prefixDataTestId, onBack, initialTab, ...context }) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const ratings = makeHandlers(catalogClient, 'InvestmentLeadRating')
  const statuses = makeHandlers(catalogClient, 'InvestmentLeadStatus')
  const sources = makeHandlers(catalogClient, 'InvestmentLeadSource')

  return (
    <LeadSettings
      prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
      initialTab={initialTab}
      onBack={onBack}
      ratings={{ ...ratings.state, ...ratings.handlers }}
      statuses={{ ...statuses.state, ...statuses.handlers }}
      sources={{ ...sources.state, ...sources.handlers }}
    />
  )
}

function useCatalogListState(catalogClient: ReturnType<typeof useCatalogManagerClient>, catalogIdentifier: string) {
  const [items, setItems] = React.useState<CatalogItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')

  const load = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier, version: 'v1' },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: false,
          ...(search && { searchCriteria: search })
        }
      )
      const entries = (response.data || []).map((entry: any) => ({
        id: entry.id,
        code: entry.code,
        value: entry.value,
        alternativeCode: entry.alternativeCode,
        displayOrder:
          (entry.displayOrder ?? (entry.alternativeCode ? parseInt(entry.alternativeCode, 10) : undefined)) ||
          undefined,
        additionalValue1: entry.additionalValue1,
        additionalValue2: entry.additionalValue2,
        additionalValue3: entry.additionalValue3
      }))
      setItems(entries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [catalogIdentifier, catalogClient, search])

  return { items, isLoading, error, onRetry: load, onSearchChange: setSearch }
}

function makeCrudHandlers(catalogClient: ReturnType<typeof useCatalogManagerClient>, catalogIdentifier: string) {
  const create = async (data: CatalogUpsertData) => {
    await catalogClient.createCatalogEntry(catalogIdentifier, 'v1', {
      code: data.code,
      value: data.value,
      alternativeCode:
        (data.alternativeCode ?? (data as any).displayOrder != null) ? String((data as any).displayOrder) : undefined,
      displayOrder: (data as any).displayOrder,
      additionalValue1: data.additionalValue1,
      objectValue: {},
      translations: []
    })
  }
  const update = async (id: string, data: CatalogUpsertData) => {
    await catalogClient.updateCatalogEntry(id, {
      code: data.code,
      value: data.value,
      alternativeCode:
        (data.alternativeCode ?? (data as any).displayOrder != null) ? String((data as any).displayOrder) : undefined,
      displayOrder: (data as any).displayOrder,
      additionalValue1: data.additionalValue1,
      objectValue: {},
      translations: []
    })
  }
  const remove = async (id: string) => {
    await catalogClient.deleteCatalogEntry(id)
  }
  return { onCreate: create, onUpdate: update, onDelete: remove }
}

function makeHandlers(catalogClient: ReturnType<typeof useCatalogManagerClient>, catalogIdentifier: string) {
  return {
    state: useCatalogListState(catalogClient, catalogIdentifier),
    handlers: makeCrudHandlers(catalogClient, catalogIdentifier)
  }
}

export default LeadDataPage
