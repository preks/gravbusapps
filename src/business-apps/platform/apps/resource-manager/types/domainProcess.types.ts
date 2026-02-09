/**
 * Type definitions for Domain and Process data in Resource Manager
 * Based on /target-desktop/processes API endpoint
 */

export interface DomainProcess {
  domain: string
  processes: string[]
}

export interface ProcessDefinitionsResponse {
  processDefinitions: DomainProcess[]
}

export interface ProcessOption {
  id: string
  name: string
}

export interface DomainOption {
  id: string
  name: string
  processes: ProcessOption[]
}
