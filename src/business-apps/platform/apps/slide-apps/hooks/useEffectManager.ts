// Effect Manager Hook - Manages effect queue, cooldowns, and lifecycle.

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ElementEffect, EffectClearCommand, AIAssistConfig, EffectType } from '../components/slideElements'
import { createEffect, isEffectExpired } from '../components/slideElements'

export interface UseEffectManagerOptions {
  config: AIAssistConfig
  onSendEffect: (effects: ElementEffect[]) => void
  onSendClear: (command: EffectClearCommand) => void
}

export interface UseEffectManagerReturn {
  activeEffects: ElementEffect[]
  queueEffect: (
    elementId: string,
    effect: EffectType,
    options?: { duration?: number; source?: 'speech' | 'manual' }
  ) => boolean
  clearEffect: (effectId: string) => void
  clearAllEffects: () => void
  clearElementEffects: (elementId: string) => void
  isElementOnCooldown: (elementId: string) => boolean
  getActiveEffectCount: () => number
  getCooldownRemaining: (elementId: string) => number
}

export function useEffectManager(options: UseEffectManagerOptions): UseEffectManagerReturn {
  const { config, onSendEffect, onSendClear } = options

  const [activeEffects, setActiveEffects] = useState<ElementEffect[]>([])
  const cooldownMapRef = useRef<Map<string, number>>(new Map())
  const cleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingEffectsRef = useRef<ElementEffect[]>([])

  // Cleanup expired effects periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setActiveEffects(prev => {
        const stillActive = prev.filter(effect => !isEffectExpired(effect))

        // If effects were removed, notify about the change
        if (stillActive.length < prev.length) {
          const expiredIds = prev.filter(e => isEffectExpired(e)).map(e => e.id)

          expiredIds.forEach(id => {
            const timer = cleanupTimersRef.current.get(id)
            if (timer) {
              clearTimeout(timer)
              cleanupTimersRef.current.delete(id)
            }
          })
        }

        return stillActive
      })
    }, 500)

    return () => clearInterval(cleanupInterval)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach(timer => clearTimeout(timer))
      cleanupTimersRef.current.clear()
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
      }
    }
  }, [])

  // Check if element is on cooldown
  const isElementOnCooldown = useCallback(
    (elementId: string): boolean => {
      const lastTriggered = cooldownMapRef.current.get(elementId)
      if (!lastTriggered) return false
      return Date.now() - lastTriggered < config.cooldownMs
    },
    [config.cooldownMs]
  )

  // Get remaining cooldown time for an element
  const getCooldownRemaining = useCallback(
    (elementId: string): number => {
      const lastTriggered = cooldownMapRef.current.get(elementId)
      if (!lastTriggered) return 0
      const elapsed = Date.now() - lastTriggered
      return Math.max(0, config.cooldownMs - elapsed)
    },
    [config.cooldownMs]
  )

  // Get count of active effects
  const getActiveEffectCount = useCallback((): number => {
    return activeEffects.length
  }, [activeEffects.length])

  // Batch and send effects
  const flushPendingEffects = useCallback(() => {
    if (pendingEffectsRef.current.length > 0) {
      onSendEffect([...pendingEffectsRef.current])
      pendingEffectsRef.current = []
    }
    batchTimerRef.current = null
  }, [onSendEffect])

  // Queue an effect for an element
  const queueEffect = useCallback(
    (elementId: string, effect: EffectType, options?: { duration?: number; source?: 'speech' | 'manual' }): boolean => {
      // Check if effect type is enabled
      if (!config.enabledEffects.includes(effect)) {
        console.log('[EffectManager] Effect type not enabled:', effect)
        return false
      }

      // Check cooldown
      if (isElementOnCooldown(elementId)) {
        console.log('[EffectManager] Element on cooldown:', elementId)
        return false
      }

      // Check concurrent limit
      if (activeEffects.length >= config.maxConcurrentEffects) {
        // Try to remove oldest effect to make room
        const oldest = activeEffects.reduce((min, e) => (e.timestamp < min.timestamp ? e : min))
        if (oldest && Date.now() - oldest.timestamp > 500) {
          // Only remove if it's been active for at least 500ms
          clearEffect(oldest.id)
        } else {
          console.log('[EffectManager] Max concurrent effects reached')
          return false
        }
      }

      // Check for duplicate effect on same element
      const existingEffect = activeEffects.find(e => e.elementId === elementId)
      if (existingEffect) {
        console.log('[EffectManager] Element already has active effect:', elementId)
        return false
      }

      // Create the effect
      const newEffect = createEffect(elementId, effect, {
        duration: options?.duration,
        intensity: config.effectStyle,
        source: options?.source ?? 'speech'
      })

      // Set cooldown
      cooldownMapRef.current.set(elementId, Date.now())

      // Add to active effects
      setActiveEffects(prev => [...prev, newEffect])

      // Schedule auto-cleanup
      const cleanupTimer = setTimeout(() => {
        setActiveEffects(prev => prev.filter(e => e.id !== newEffect.id))
        cleanupTimersRef.current.delete(newEffect.id)
      }, newEffect.duration + 100) // Small buffer
      cleanupTimersRef.current.set(newEffect.id, cleanupTimer)

      // Batch effects for sending
      pendingEffectsRef.current.push(newEffect)
      if (!batchTimerRef.current) {
        batchTimerRef.current = setTimeout(flushPendingEffects, 50)
      }

      console.log('[EffectManager] Effect queued:', newEffect.id, effect, elementId)
      return true
    },
    [
      config.enabledEffects,
      config.maxConcurrentEffects,
      config.effectStyle,
      isElementOnCooldown,
      activeEffects,
      flushPendingEffects
    ]
  )

  // Clear a specific effect
  const clearEffect = useCallback(
    (effectId: string): void => {
      const timer = cleanupTimersRef.current.get(effectId)
      if (timer) {
        clearTimeout(timer)
        cleanupTimersRef.current.delete(effectId)
      }

      setActiveEffects(prev => prev.filter(e => e.id !== effectId))
      onSendClear({ type: 'clear-single', effectId })
      console.log('[EffectManager] Effect cleared:', effectId)
    },
    [onSendClear]
  )

  // Clear all effects
  const clearAllEffects = useCallback((): void => {
    cleanupTimersRef.current.forEach(timer => clearTimeout(timer))
    cleanupTimersRef.current.clear()

    setActiveEffects([])
    onSendClear({ type: 'clear-all' })
    console.log('[EffectManager] All effects cleared')
  }, [onSendClear])

  // Clear all effects for a specific element
  const clearElementEffects = useCallback(
    (elementId: string): void => {
      const effectsToRemove = activeEffects.filter(e => e.elementId === elementId)

      effectsToRemove.forEach(effect => {
        const timer = cleanupTimersRef.current.get(effect.id)
        if (timer) {
          clearTimeout(timer)
          cleanupTimersRef.current.delete(effect.id)
        }
      })

      setActiveEffects(prev => prev.filter(e => e.elementId !== elementId))
      onSendClear({ type: 'clear-element', elementId })
      console.log('[EffectManager] Element effects cleared:', elementId)
    },
    [activeEffects, onSendClear]
  )

  return {
    activeEffects,
    queueEffect,
    clearEffect,
    clearAllEffects,
    clearElementEffects,
    isElementOnCooldown,
    getActiveEffectCount,
    getCooldownRemaining
  }
}

export default useEffectManager
