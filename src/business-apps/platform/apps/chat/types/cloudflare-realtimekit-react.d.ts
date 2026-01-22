/**
 * Type declarations for @cloudflare/realtimekit-react
 *
 * Temporary declarations until official types are available
 */

declare module '@cloudflare/realtimekit-react' {
  import { ReactNode } from 'react'

  export interface RealtimeKitMeeting {
    self?: {
      id?: string
      userId?: string
      customParticipantId?: string
      name?: string
      picture?: string
      audioEnabled?: boolean
      videoEnabled?: boolean
      screenShareEnabled?: boolean
      videoTrack?: MediaStreamTrack
      audioTrack?: MediaStreamTrack
      screenShareTracks?: MediaStreamTrack[]
      roomState?: string
      roomJoined?: boolean
      enableAudio: () => Promise<void>
      disableAudio: () => Promise<void>
      enableVideo: () => Promise<void>
      disableVideo: () => Promise<void>
      startScreenShare: () => Promise<void>
      stopScreenShare: () => Promise<void>
      setName: (name: string) => Promise<void>
    }
    participants?: {
      joined?: Map<string, any>
      active?: Set<string>
      lastActiveSpeaker?: string
    }
    join: () => Promise<void>
    leave: () => Promise<void>
  }

  export interface RealtimeKitInitOptions {
    authToken: string
    defaults?: {
      audio?: boolean
      video?: boolean
    }
  }

  export function useRealtimeKitClient(): [
    RealtimeKitMeeting,
    (options: RealtimeKitInitOptions) => Promise<RealtimeKitMeeting | void>
  ]

  export function useRealtimeKitMeeting(): {
    meeting: RealtimeKitMeeting
  }

  export function useRealtimeKitSelector<T>(selector: (meeting: RealtimeKitMeeting) => T): T

  export interface RealtimeKitProviderProps {
    value: RealtimeKitMeeting
    children: ReactNode
  }

  export const RealtimeKitProvider: React.FC<RealtimeKitProviderProps>
}
