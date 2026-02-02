/**
 * Types for Components based on Screen Management API Response
 */

export interface ComponentDefinition {
  key: string
  name: string
  builderType: 'NATIVE_SCREEN' | 'LOWCODER' | string
  appId?: string
  appName: string
  formDefinition: {
    componentPath: string // e.g. "/hr/core/apps/employee-record"
    version: string // e.g. "123"
  }
  flowIcon: string
  release: string
}

export interface Component {
  id: string
  name: string
  screenKey: string
  namespaceId: string
  namespaceCode: string
  namespaceDescription: string
  type: 'SCREEN' | 'POPUP' | 'WINDOW' | 'FORM'
  createdAt?: string
  createdBy?: string
  updatedBy?: string
  updatedAt?: string
  isDeleted?: boolean
  screenComponents: ComponentDefinition
}

export interface ComponentApiResponse {
  data: Component[]
  paging?: {
    totalRecords: number
  }
}

/**
 * Azure Blob Version Info
 */
export interface AzureBlobVersions {
  versions: string[] // ["123", "124", "125"] from index-{version}.js
  hasUnversioned: boolean // true if index.js exists (without version)
}

/**
 * Extended Component Resource with Azure Storage versions
 */
export interface ComponentResource extends Component {
  azureVersions: {
    dev: AzureBlobVersions
    prod?: AzureBlobVersions
  }
}
