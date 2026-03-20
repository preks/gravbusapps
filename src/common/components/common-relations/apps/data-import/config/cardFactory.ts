/**
 * Factory functions for creating entity import cards
 * Eliminates duplication across IRM and CRM data import configs
 */

import React from 'react'
import { EntityCardConfig } from '../types/configTypes'

/**
 * Creates a standard entity card with a single entry
 */
export function createEntityCard(
  title: string,
  description: string,
  icon: React.ComponentType<any>,
  buttonLabel: string,
  entityType: string,
  iconSize: 'sm' | 'md' | 'lg' = 'md'
): EntityCardConfig {
  return {
    title,
    description,
    icon,
    iconSize,
    entries: [{ label: buttonLabel, entityType }]
  }
}

/**
 * Creates an entity card with multiple entries
 * Useful for grouped imports (e.g., multiple investment types)
 */
export function createMultiEntryCard(
  title: string,
  description: string,
  icon: React.ComponentType<any>,
  entries: Array<{ label: string; entityType: string }>,
  iconSize: 'sm' | 'md' | 'lg' = 'md'
): EntityCardConfig {
  return {
    title,
    description,
    icon,
    iconSize,
    entries
  }
}
