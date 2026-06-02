import type { EntityListData } from '@/common/data/common/types/queryTypes'

export interface ExampleEntity {
  id: string
  name: string
  summary?: string | null
  status?: string | null
  category?: string | null
  updatedAt?: string | null
}

export interface ExampleEntityListParams {
  search?: string
  status?: 'all' | 'active' | 'draft'
}

export interface ExampleEntityQueryMeta {
  params: ExampleEntityListParams
  queryKeyString: string
}

export type ExampleEntitiesData = EntityListData<ExampleEntity, ExampleEntityQueryMeta>
