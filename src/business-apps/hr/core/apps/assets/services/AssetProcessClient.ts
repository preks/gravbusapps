/**
 * Asset Process Client
 *
 * This client interacts with Kogito process REST API endpoints
 * for asset management operations (create, update, delete).
 */

import { RestClient } from '@/common/network/rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { env } from '@/common/env/EnvUtils'

export interface CreateAssetPayload {
  model: string
  serialNumber?: string
  acquisitionDate?: string
  warrantyPeriodMonths?: number
  inventoryValue: number
  assetStatus: string
  assetBrandRef: string
  assetCategoryRef: string
  currencyRef: string
  siteLocation?: string
  notes?: string
}

export interface UpdateAssetPayload {
  id: string
  version: number
  model?: string
  serialNumber?: string
  acquisitionDate?: string
  warrantyPeriodMonths?: number
  inventoryValue?: number
  assetStatus?: string
  assetBrandRef?: string
  assetCategoryRef?: string
  currencyRef?: string
  siteLocation?: string
  notes?: string
  /** Disposal fields for retire flow */
  disposalStatus?: string
  disposalOutcomeRef?: string
  disposalDate?: string
  disposalReason?: string
  requireSanitization?: boolean
  sanitizationMethodRef?: string
  sanitizationExecutionDate?: string
  responsibleEmployee?: string
  performerEmployee?: string
}

export interface CreateEmployeeAssetPayload {
  startDate: string
  expectedEndDate?: string
  endDate?: string
  startAssetConditionRef?: string
  endAssetConditionRef?: string
  notes?: string
  employee: string
  asset: string
}

export interface UpdateEmployeeAssetPayload {
  id: string
  version: number
  startDate?: string
  expectedEndDate?: string
  endDate?: string
  startAssetConditionRef?: string
  endAssetConditionRef?: string
  notes?: string
  employee?: string
  asset?: string
}

export interface AssetProcessResponse {
  processInstanceId: string
  assetId?: string
  [key: string]: any
}

/**
 * Client for Asset Process operations via Kogito REST API
 */
export class AssetProcessClient extends RestClient {
  constructor() {
    super(env('NEXT_PUBLIC_BASE_URL') ?? '')
  }

  /**
   * Set the access token for authentication
   */
  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Create/Register a new asset via process API
   * Note: If there's no separate "create" endpoint, this uses updateAsset
   */
  public async createAsset(payload: CreateAssetPayload): Promise<AssetProcessResponse> {
    try {
      // POST /processes/employee/updateAsset endpoint
      // Wrap payload in "asset" property as expected by backend
      return await this.post<AssetProcessResponse>(
        '/processes/employee/createAsset',
        { asset: payload },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    } catch (error) {
      console.error('AssetProcessClient: Error creating asset:', error)
      throw error
    }
  }

  /**
   * Update an existing asset via process API
   * POST /processes/employee/updateAsset
   * The id and version are passed in the payload
   */
  public async updateAsset(payload: UpdateAssetPayload): Promise<AssetProcessResponse> {
    try {
      // POST to /processes/employee/updateAsset with id and version in the payload
      // Backend expects asset object wrapped in "asset" property
      return await this.post<AssetProcessResponse>(
        '/processes/employee/updateAsset',
        {
          asset: payload
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    } catch (error) {
      console.error('AssetProcessClient: Error updating asset:', error)
      throw error
    }
  }

  /**
   * Delete an asset via process API
   */
  public async deleteAsset(id: string, version: number): Promise<AssetProcessResponse> {
    try {
      return await this.delete<AssetProcessResponse>(`/processes/employee/updateAsset/${id}`, {
        params: { version },
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('AssetProcessClient: Error deleting asset:', error)
      throw error
    }
  }

  /**
   * Create/Allocate an employee asset via process API
   * POST /processes/employee/createEmployeeAsset
   */
  public async createEmployeeAsset(payload: CreateEmployeeAssetPayload): Promise<AssetProcessResponse> {
    try {
      return await this.post<AssetProcessResponse>(
        '/processes/employee/createEmployeeAsset',
        { employeeAsset: payload },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    } catch (error) {
      console.error('AssetProcessClient: Error creating employee asset:', error)
      throw error
    }
  }

  /**
   * Update/Return an employee asset via process API
   * POST /processes/employee/updateEmployeeAsset
   */
  public async updateEmployeeAsset(payload: UpdateEmployeeAssetPayload): Promise<AssetProcessResponse> {
    try {
      return await this.post<AssetProcessResponse>(
        '/processes/employee/updateEmployeeAsset',
        { employeeAsset: payload },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    } catch (error) {
      console.error('AssetProcessClient: Error updating employee asset:', error)
      throw error
    }
  }
}
