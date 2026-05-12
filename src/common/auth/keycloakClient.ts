import Keycloak, { type KeycloakConfig, type KeycloakInitOptions } from 'keycloak-js'

let keycloakInstance: Keycloak | null = null
let keycloakInitPromise: Promise<boolean> | null = null
let keycloakInitialized = false

export function getKeycloakClient(config: KeycloakConfig): Keycloak {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(config)
  }

  return keycloakInstance
}

export function initKeycloakClient(config: KeycloakConfig, options: KeycloakInitOptions): Promise<boolean> {
  const keycloakClient = getKeycloakClient(config)

  if (keycloakInitialized) {
    return Promise.resolve(Boolean(keycloakClient.authenticated))
  }

  if (!keycloakInitPromise) {
    keycloakInitPromise = keycloakClient
      .init(options)
      .then(authenticated => {
        keycloakInitialized = true
        return authenticated
      })
      .catch(error => {
        keycloakInitPromise = null
        throw error
      })
  }

  return keycloakInitPromise
}

export function getKeycloakAccessToken(): string | undefined {
  return keycloakInstance?.token
}
