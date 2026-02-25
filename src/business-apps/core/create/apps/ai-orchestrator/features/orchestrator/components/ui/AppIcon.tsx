import {
  Users,
  UserPlus,
  Building2,
  Briefcase,
  Globe,
  BarChart2,
  TrendingUp,
  LineChart,
  PieChart,
  FileText,
  ClipboardList,
  CheckSquare,
  CheckCircle2,
  DollarSign,
  Receipt,
  CreditCard,
  ShoppingCart,
  Package,
  Truck,
  Calendar,
  Clock,
  Bell,
  Mail,
  MessageSquare,
  Workflow,
  GitBranch,
  Zap,
  Layers,
  Layout,
  Search,
  Sparkles
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Users,
  UserPlus,
  Building2,
  Briefcase,
  Globe,
  BarChart2,
  TrendingUp,
  LineChart,
  PieChart,
  FileText,
  ClipboardList,
  CheckSquare,
  CheckCircle2,
  DollarSign,
  Receipt,
  CreditCard,
  ShoppingCart,
  Package,
  Truck,
  Calendar,
  Clock,
  Bell,
  Mail,
  MessageSquare,
  Workflow,
  GitBranch,
  Zap,
  Layers,
  Layout,
  Search,
  Sparkles
}

interface AppIconProps extends LucideProps {
  name?: string
}

export function AppIcon({ name, ...props }: AppIconProps) {
  const Icon = (name && ICON_MAP[name]) || Sparkles
  return <Icon {...props} />
}
