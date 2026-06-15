// Replay toolbar for the Flow Map: play/pause, restart, step back/forward, a
// seek slider and a speed selector. Lets the user replay the path the flow took
// from start to the current step.

import { ArrowCounterClockwiseIcon, CaretLeftIcon, CaretRightIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react'
import React from 'react'

import { REPLAY_SPEEDS, type FlowReplayController, type ReplaySpeed } from './useFlowReplay'

const iconButtonClass =
  'gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-md gba:border gba:border-border gba:bg-card gba:text-foreground gba:transition-colors gba:hover:bg-muted disabled:gba:cursor-not-allowed disabled:gba:opacity-40'

export const FlowMapReplayControls: React.FC<{ replay: FlowReplayController }> = ({ replay }) => {
  const { frameIndex, frameCount, isPlaying, speed, toggle, restart, stepBack, stepForward, seek, setSpeed } = replay
  const lastIndex = Math.max(frameCount - 1, 0)

  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid="flow-map-replay-controls">
      <button
        type="button"
        className={iconButtonClass}
        onClick={restart}
        aria-label="Restart replay"
        data-testid="flow-map-replay-restart"
      >
        <ArrowCounterClockwiseIcon className="gba:h-4 gba:w-4" />
      </button>
      <button
        type="button"
        className={iconButtonClass}
        onClick={stepBack}
        disabled={frameIndex <= 0}
        aria-label="Previous step"
        data-testid="flow-map-replay-back"
      >
        <CaretLeftIcon className="gba:h-4 gba:w-4" />
      </button>
      <button
        type="button"
        className={iconButtonClass}
        onClick={toggle}
        aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
        aria-pressed={isPlaying}
        data-testid="flow-map-replay-toggle"
      >
        {isPlaying ? (
          <PauseIcon className="gba:h-4 gba:w-4" weight="fill" />
        ) : (
          <PlayIcon className="gba:h-4 gba:w-4" weight="fill" />
        )}
      </button>
      <button
        type="button"
        className={iconButtonClass}
        onClick={stepForward}
        disabled={frameIndex >= lastIndex}
        aria-label="Next step"
        data-testid="flow-map-replay-forward"
      >
        <CaretRightIcon className="gba:h-4 gba:w-4" />
      </button>

      <input
        type="range"
        min={0}
        max={lastIndex}
        value={frameIndex}
        onChange={event => seek(Number(event.target.value))}
        className="gba:h-1.5 gba:w-32 gba:cursor-pointer gba:accent-info"
        aria-label="Replay position"
        data-testid="flow-map-replay-seek"
      />
      <span className="gba:text-xs gba:tabular-nums gba:text-muted-foreground" data-testid="flow-map-replay-position">
        {Math.min(frameIndex + 1, frameCount)} / {frameCount}
      </span>

      <div className="gba:inline-flex gba:items-center gba:gap-0.5 gba:rounded-md gba:bg-muted gba:p-0.5">
        {REPLAY_SPEEDS.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => setSpeed(option as ReplaySpeed)}
            aria-pressed={speed === option}
            className={`gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[11px] gba:font-medium gba:transition-colors ${
              speed === option
                ? 'gba:bg-card gba:text-foreground gba:shadow-sm'
                : 'gba:text-muted-foreground gba:hover:text-foreground'
            }`}
            data-testid={`flow-map-replay-speed-${option}`}
          >
            {option}x
          </button>
        ))}
      </div>
    </div>
  )
}
