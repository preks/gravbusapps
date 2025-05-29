import { ClassValue, clsx } from 'clsx'
import { extendTailwindMerge, fromTheme } from 'tailwind-merge'
 
const customTwMergeConfig = extendTailwindMerge({
  extend: {
    classGroups: {
      'bg-image': ['bg-check', 'bg-indeterminate', 'bg-dot'],
      'font-size': ['text-button'],
      // @ts-ignore
      h: [{ h: [fromTheme('height')] }]
    }
  }
})
 
export function cn(...inputs: ClassValue[]) {
  return customTwMergeConfig(clsx(inputs))
}