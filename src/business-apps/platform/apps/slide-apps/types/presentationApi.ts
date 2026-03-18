// W3C Presentation API type definitions.

export interface PresentationAvailability extends EventTarget {
  value: boolean
  onchange: ((this: PresentationAvailability, ev: Event) => void) | null
}

export interface PresentationConnection extends EventTarget {
  id: string
  url: string
  state: 'connecting' | 'connected' | 'closed' | 'terminated'
  send(message: string): void
  close(): void
  terminate(): void
  onconnect: ((this: PresentationConnection, ev: Event) => void) | null
  onclose: ((this: PresentationConnection, ev: Event) => void) | null
  onterminate: ((this: PresentationConnection, ev: Event) => void) | null
  onmessage: ((this: PresentationConnection, ev: MessageEvent) => void) | null
}

export interface PresentationReceiver {
  connectionList: Promise<PresentationConnectionList>
}

export interface PresentationConnectionList extends EventTarget {
  connections: PresentationConnection[]
  onconnectionavailable: ((this: PresentationConnectionList, ev: PresentationConnectionAvailableEvent) => void) | null
}

export interface PresentationConnectionAvailableEvent extends Event {
  connection: PresentationConnection
}

export interface PresentationRequestInstance {
  start(): Promise<PresentationConnection>
  reconnect(presentationId: string): Promise<PresentationConnection>
  getAvailability(): Promise<PresentationAvailability>
}

export interface PresentationRequestConstructor {
  new (urls: string[]): PresentationRequestInstance
}

declare global {
  interface Navigator {
    presentation?: {
      defaultRequest: PresentationRequestInstance | null
      receiver?: PresentationReceiver
    }
  }

  var PresentationRequest: PresentationRequestConstructor | undefined
}
