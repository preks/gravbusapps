/**
 * Icon Mapping for Service Categories
 * Maps service category IDs to Phosphor React icons
 */

import * as PhosphorIcons from '@phosphor-icons/react';
import { Icon } from '@phosphor-icons/react';

// Category code mapping - fallback for category codes
export const categoryIcons: Record<string, Icon> = {
  'hr': PhosphorIcons.UsersIcon,
  'it': PhosphorIcons.LaptopIcon,
  'travel': PhosphorIcons.AirplaneIcon,
  'facilities': PhosphorIcons.BuildingsIcon,
  'finance': PhosphorIcons.CurrencyDollarIcon,
  'procurement': PhosphorIcons.ShoppingCartIcon,
  'legal': PhosphorIcons.FileTextIcon,
  'security': PhosphorIcons.ShieldIcon,
  'access-identity': PhosphorIcons.KeyIcon,
  'data-analytics': PhosphorIcons.ChartBarIcon,
  'learning-development': PhosphorIcons.GraduationCapIcon,
  'fleet': PhosphorIcons.CarIcon,
  'admin': PhosphorIcons.ClipboardIcon,
  'flow-templates': PhosphorIcons.TreeIcon,
  'workflow': PhosphorIcons.TreeIcon, // Alias for flow-templates
  'cbs': PhosphorIcons.BriefcaseIcon, // Core Business Services
  'uncategorized': PhosphorIcons.QuestionIcon, // For uncategorized templates
};

export const getCategoryIcon = (iconNameOrCategoryId: string): Icon => {
  // Check if it's a Phosphor icon with pi_ prefix
  if (iconNameOrCategoryId && iconNameOrCategoryId.startsWith('pi_')) {
    const phosphorIconName = iconNameOrCategoryId.substring(3); // Remove 'pi_' prefix
    if ((PhosphorIcons as any)[phosphorIconName]) {
      return (PhosphorIcons as any)[phosphorIconName];
    }
  }
  
  // Fallback to category code mapping
  return categoryIcons[iconNameOrCategoryId] || PhosphorIcons.ClipboardIcon;
};
