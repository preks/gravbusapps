import type { FormData, SetupApiRequest, SetupApiResponse, SetupCurrentUserIdentity } from './lib/types'
import { resolveGravityPlatformApiRoot } from '@/common/utils/serviceResolver'

export type { ActiveStructureBootstrapResponse } from './lib/activeStructureBootstrap'
export { fetchActiveStructureBootstrap } from './lib/activeStructureBootstrap'

export async function submitSetupRemote(
  formData: FormData,
  currentUser: SetupCurrentUserIdentity | null,
  accessToken: string | null | undefined,
  forceSetup?: boolean
): Promise<SetupApiResponse> {
  const apiRoot = resolveGravityPlatformApiRoot()
  const requestBody: SetupApiRequest = {
    formValues: formData,
    currentUser: currentUser ?? null,
    ...(forceSetup ? { forceSetup: true } : {})
  }

  const response = await fetch(`${apiRoot}/setup`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    credentials: 'omit',
    body: JSON.stringify(requestBody)
  })

  const responsePayload = (await response.json().catch(() => null)) as
    | SetupApiResponse
    | {
        error?: string
      }
    | null

  if (!response.ok) {
    const errorMessage = responsePayload && 'error' in responsePayload ? responsePayload.error : undefined
    throw new Error(errorMessage || 'Setup failed')
  }

  return responsePayload as SetupApiResponse
}
