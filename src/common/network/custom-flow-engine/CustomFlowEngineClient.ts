import { CustomFlowEngineDataClient } from './CustomFlowEngineDataClient'
import { CustomFlowEngineFlowsClient } from './CustomFlowEngineFlowsClient'

export class CustomFlowEngineClient {
  readonly flows = new CustomFlowEngineFlowsClient()
  readonly customData = new CustomFlowEngineDataClient()

  setAccessToken(accessToken: string) {
    this.flows.setAccessToken(accessToken)
    this.customData.setAccessToken(accessToken)
  }
}

export const customFlowEngineClient = new CustomFlowEngineClient()
