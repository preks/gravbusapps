import { resolveGravityPlatformApiRoot } from '@/common/utils/serviceResolver'

export type ActiveStructureBootstrapResponse = {
  hasActiveStructure: boolean
  structureId: string | null
  cached: boolean
  checkedAt: number
}

export async function fetchActiveStructureBootstrap(accessToken: string): Promise<ActiveStructureBootstrapResponse> {
  const apiRoot = resolveGravityPlatformApiRoot()
  const response = await fetch(`${apiRoot}/active-structure`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    credentials: 'omit'
  })

  if (!response.ok) {
    throw new Error('Failed to load active structure state')
  }

  return (await response.json()) as ActiveStructureBootstrapResponse
}
