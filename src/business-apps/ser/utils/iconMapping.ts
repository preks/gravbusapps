/**
 * Icon Mapping for Service Categories
 * Maps service category IDs to Phosphor React icons
 */

import { 
  Users, 
  Laptop, 
  Airplane, 
  Buildings, 
  CurrencyDollar, 
  ShoppingCart, 
  FileText, 
  Shield, 
  Key, 
  ChartBar, 
  GraduationCap, 
  Car, 
  Clipboard,
  Tree,
  Icon
} from '@phosphor-icons/react';

export const categoryIcons: Record<string, Icon> = {
  'hr': Users,
  'it': Laptop,
  'travel': Airplane,
  'facilities': Buildings,
  'finance': CurrencyDollar,
  'procurement': ShoppingCart,
  'legal': FileText,
  'security': Shield,
  'access-identity': Key,
  'data-analytics': ChartBar,
  'learning-development': GraduationCap,
  'fleet': Car,
  'admin': Clipboard,
  'flow-templates': Tree,
  'workflow': Tree // Alias for flow-templates
};

export const getCategoryIcon = (categoryId: string): Icon => {
  return categoryIcons[categoryId] || Clipboard;
};
