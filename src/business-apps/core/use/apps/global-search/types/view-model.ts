import type {
  GlobalSearchConfigurationResponse,
  GlobalSearchQueryResponse,
  GlobalSearchSuggestionsResponse,
  SearchCategory,
  SearchItem,
  SearchSection,
  SearchSuggestion
} from './contract'

export interface GlobalSearchViewState {
  query: string
  isOpen: boolean
  isLoading: boolean
  selectedItemId?: string
  selectedCategoryIds: string[]
  trackingToken?: string
  categories: SearchCategory[]
  sections: SearchSection[]
  suggestions: SearchSuggestion[]
  errorMessage?: string
}

export interface GlobalSearchBootstrapData {
  configuration: GlobalSearchConfigurationResponse
  suggestions: GlobalSearchSuggestionsResponse
}

export interface GlobalSearchRunQueryData {
  queryResult: GlobalSearchQueryResponse
}

export interface GlobalSearchResultSelectable {
  id: string
  item: SearchItem
  sectionId: string
  sectionTitle: string
}
