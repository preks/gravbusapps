import { ClassValue, clsx } from 'clsx'
import { extendTailwindMerge, fromTheme } from 'tailwind-merge'

const customTwMergeConfig = extendTailwindMerge({
  extend: {
    classGroups: {
      'bg-image': ['gba:bg-check', 'gba:bg-indeterminate', 'gba:bg-dot'],
      'font-size': ['gba:text-button'],
      // @ts-ignore
      h: [{ h: [fromTheme('height')] }]
    }
  }
})

export function cn(...inputs: ClassValue[]) {
  return customTwMergeConfig(clsx(inputs))
}
