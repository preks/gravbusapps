/**
 * Tiny React provider that, mounted once at the app root, kicks off the
 * `flowbotStreamManager.bootstrap()` call as soon as we have an access
 * token. This makes background runs visible (and reconnected) even
 * before the user navigates to the chat surface.
 *
 * `bootstrap()` is internally guarded against duplicate calls — mounting
 * this provider in multiple places is a no-op after the first.
 */

import { useEffect, type ReactNode } from 'react'
import * as flowbotStreamManager from './flowbotStreamManager'

interface StreamBootstrapProviderProps {
  /**
   * OIDC access token used to authenticate the bootstrap fetch. When
   * absent we don't attempt the call — the user isn't logged in yet.
   */
  accessToken: string | null | undefined
  children?: ReactNode
}

export function StreamBootstrapProvider({ accessToken, children }: StreamBootstrapProviderProps): JSX.Element {
  useEffect(() => {
    if (!accessToken) return
    flowbotStreamManager.bootstrap(accessToken).catch(err => {
      console.warn('[FlowBotStream] bootstrap rejected', err)
    })
  }, [accessToken])

  return <>{children}</>
}
