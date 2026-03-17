/**
 * App Icon Utilities
 *
 * Provides a collection of Lucide icons for spreadsheet app icons
 * and utilities for rendering them.
 */

import {
  Table,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  Calculator,
  DollarSign,
  Wallet,
  CreditCard,
  Users,
  UserCircle,
  Building2,
  Briefcase,
  ShoppingCart,
  Package,
  Truck,
  Calendar,
  Clock,
  CheckSquare,
  ListTodo,
  FileText,
  FolderOpen,
  Archive,
  Inbox,
  Mail,
  Globe,
  Map,
  Target,
  Award,
  Star,
  Heart,
  Zap,
  Rocket,
  Lightbulb,
  BookOpen,
  GraduationCap,
  Clipboard,
  ClipboardList,
  Database,
  Sparkles,
  Layers,
  LayoutDashboard,
  Settings,
  type LucideIcon
} from 'lucide-react'

export interface AppIconConfig {
  name: string
  icon: LucideIcon
  category: string
}

// Available icons for the app icon picker
export const APP_ICONS: AppIconConfig[] = [
  // Data & Analytics
  { name: 'table', icon: Table, category: 'Data' },
  { name: 'fileSpreadsheet', icon: FileSpreadsheet, category: 'Data' },
  { name: 'database', icon: Database, category: 'Data' },
  { name: 'barChart3', icon: BarChart3, category: 'Analytics' },
  { name: 'pieChart', icon: PieChart, category: 'Analytics' },
  { name: 'lineChart', icon: LineChart, category: 'Analytics' },
  { name: 'trendingUp', icon: TrendingUp, category: 'Analytics' },
  { name: 'calculator', icon: Calculator, category: 'Data' },
  // Finance
  { name: 'dollarSign', icon: DollarSign, category: 'Finance' },
  { name: 'wallet', icon: Wallet, category: 'Finance' },
  { name: 'creditCard', icon: CreditCard, category: 'Finance' },
  // People & Business
  { name: 'users', icon: Users, category: 'People' },
  { name: 'userCircle', icon: UserCircle, category: 'People' },
  { name: 'building2', icon: Building2, category: 'Business' },
  { name: 'briefcase', icon: Briefcase, category: 'Business' },
  // Commerce & Logistics
  { name: 'shoppingCart', icon: ShoppingCart, category: 'Commerce' },
  { name: 'package', icon: Package, category: 'Logistics' },
  { name: 'truck', icon: Truck, category: 'Logistics' },
  // Time & Tasks
  { name: 'calendar', icon: Calendar, category: 'Time' },
  { name: 'clock', icon: Clock, category: 'Time' },
  { name: 'checkSquare', icon: CheckSquare, category: 'Tasks' },
  { name: 'listTodo', icon: ListTodo, category: 'Tasks' },
  { name: 'clipboard', icon: Clipboard, category: 'Tasks' },
  { name: 'clipboardList', icon: ClipboardList, category: 'Tasks' },
  // Documents & Files
  { name: 'fileText', icon: FileText, category: 'Documents' },
  { name: 'folderOpen', icon: FolderOpen, category: 'Documents' },
  { name: 'archive', icon: Archive, category: 'Documents' },
  { name: 'inbox', icon: Inbox, category: 'Documents' },
  { name: 'mail', icon: Mail, category: 'Communication' },
  // General
  { name: 'globe', icon: Globe, category: 'General' },
  { name: 'map', icon: Map, category: 'General' },
  { name: 'target', icon: Target, category: 'Goals' },
  { name: 'award', icon: Award, category: 'Goals' },
  { name: 'star', icon: Star, category: 'General' },
  { name: 'heart', icon: Heart, category: 'General' },
  { name: 'zap', icon: Zap, category: 'General' },
  { name: 'rocket', icon: Rocket, category: 'General' },
  { name: 'lightbulb', icon: Lightbulb, category: 'Ideas' },
  { name: 'bookOpen', icon: BookOpen, category: 'Education' },
  { name: 'graduationCap', icon: GraduationCap, category: 'Education' },
  { name: 'sparkles', icon: Sparkles, category: 'General' },
  { name: 'layers', icon: Layers, category: 'General' },
  { name: 'layoutDashboard', icon: LayoutDashboard, category: 'General' },
  { name: 'settings', icon: Settings, category: 'General' }
]

// Default icon when none is selected
export const DEFAULT_APP_ICON = Table

/**
 * Get icon component by name
 */
export const getIconByName = (name: string | undefined): LucideIcon | null => {
  if (!name) return null
  const iconConfig = APP_ICONS.find(i => i.name === name)
  return iconConfig?.icon || null
}

/**
 * Get icon categories
 */
export const getIconCategories = (): string[] => {
  return Array.from(new Set(APP_ICONS.map(i => i.category)))
}

/**
 * Get icons by category
 */
export const getIconsByCategory = (category: string): AppIconConfig[] => {
  return APP_ICONS.filter(i => i.category === category)
}
