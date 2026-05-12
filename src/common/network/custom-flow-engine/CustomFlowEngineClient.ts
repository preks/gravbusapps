import { CustomFlowEngineFlowsClient } from './CustomFlowEngineFlowsClient'

export class CustomFlowEngineClient {
  readonly flows = new CustomFlowEngineFlowsClient()

  setAccessToken(accessToken: string) {
    this.flows.setAccessToken(accessToken)
  }
}

export const customFlowEngineClient = new CustomFlowEngineClient()
