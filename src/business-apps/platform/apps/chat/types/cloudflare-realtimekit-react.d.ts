/**
 * Type declarations for @cloudflare/realtimekit-react
 *
 * Temporary declarations until official types are available
 */

declare module '@cloudflare/realtimekit-react' {
  import { ReactNode } from 'react'

  // Video middleware function type
  export type VideoMiddleware = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void

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
      enableScreenShare: () => Promise<void>
      disableScreenShare: () => Promise<void>
      setName: (name: string) => Promise<void>
      addVideoMiddleware?: (middleware: VideoMiddleware) => void
      removeVideoMiddleware?: (middleware?: VideoMiddleware) => void
      setVideoMiddlewareGlobalConfig?: (config: { disablePerFrameCanvasRendering?: boolean }) => Promise<void>
      on?: (event: string, handler: (data: any) => void) => void
      off?: (event: string, handler?: (data: any) => void) => void
    }
    participants?: {
      joined?: Map<
        string,
        {
          id?: string
          userId?: string
          customParticipantId?: string
          name?: string
          displayName?: string
          picture?: string
          audioEnabled?: boolean
          videoEnabled?: boolean
          screenShareEnabled?: boolean
          videoTrack?: MediaStreamTrack
          audioTrack?: MediaStreamTrack
          screenShareTracks?: MediaStreamTrack[]
        }
      >
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

declare module '@cloudflare/realtimekit-virtual-background' {
  import { RealtimeKitMeeting, VideoMiddleware } from '@cloudflare/realtimekit-react'

  export interface SegmentationConfig {
    model?: 'meet' | 'mlkit'
    backend?: 'wasmSimd'
    inputResolution?: '256x256' | '256x144'
    pipeline?: 'webgl2' | 'canvas2dCpu'
    targetFps?: number
  }

  export interface TransformerInitOptions {
    meeting: RealtimeKitMeeting
    segmentationConfig?: SegmentationConfig
  }

  export default class RealtimeKitVideoBackgroundTransformer {
    static isSupported(): boolean
    static init(options: TransformerInitOptions): Promise<RealtimeKitVideoBackgroundTransformer>
    createStaticBackgroundVideoMiddleware(imageUrl: string): Promise<VideoMiddleware>
    createBackgroundBlurVideoMiddleware(blurStrength?: number): Promise<VideoMiddleware>
  }
}
