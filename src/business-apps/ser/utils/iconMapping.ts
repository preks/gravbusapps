/**
 * Icon Mapping for Service Categories
 * Maps service category IDs to Lucide React icons
 */

import { 
  Users, 
  Laptop, 
  Plane, 
  Building, 
  DollarSign, 
  ShoppingCart, 
  FileText, 
  Shield, 
  Key, 
  BarChart3, 
  GraduationCap, 
  Car, 
  Clipboard,
  LucideIcon
} from 'lucide-react';

export const categoryIcons: Record<string, LucideIcon> = {
  'hr': Users,
  'it': Laptop,
  'travel': Plane,
  'facilities': Building,
  'finance': DollarSign,
  'procurement': ShoppingCart,
  'legal': FileText,
  'security': Shield,
  'access-identity': Key,
  'data-analytics': BarChart3,
  'learning-development': GraduationCap,
  'fleet': Car,
  'admin': Clipboard
};

export const getCategoryIcon = (categoryId: string): LucideIcon => {
  return categoryIcons[categoryId] || Clipboard;
};
