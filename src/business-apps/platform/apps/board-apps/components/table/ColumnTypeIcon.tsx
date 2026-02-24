import React from 'react'
import {
  Type,
  Hash,
  CalendarDays,
  CheckSquare,
  ListChecks,
  Flag,
  Users,
  Link2,
  Mail,
  Phone,
  Globe,
  Copy,
  Calculator,
  Star,
  Percent,
  DollarSign,
  BarChart3,
  Tags,
  GanttChart,
  FileText,
  Paperclip,
  MousePointerClick
} from 'lucide-react'

const CLS = 'gba:w-3 gba:h-3 gba:text-muted-foreground/60 gba:flex-shrink-0'

export const ColumnTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'text':
      return <Type className={CLS} />
    case 'number':
      return <Hash className={CLS} />
    case 'currency':
      return <DollarSign className={CLS} />
    case 'percentage':
      return <Percent className={CLS} />
    case 'date':
    case 'datetime':
      return <CalendarDays className={CLS} />
    case 'boolean':
      return <CheckSquare className={CLS} />
    case 'status':
    case 'select':
    case 'multiselect':
      return <ListChecks className={CLS} />
    case 'priority':
      return <Flag className={CLS} />
    case 'people':
      return <Users className={CLS} />
    case 'email':
      return <Mail className={CLS} />
    case 'phone':
      return <Phone className={CLS} />
    case 'url':
    case 'link':
      return <Globe className={CLS} />
    case 'relation':
      return <Link2 className={CLS} />
    case 'mirror':
      return <Copy className={CLS} />
    case 'rollup':
      return <Calculator className={CLS} />
    case 'rating':
      return <Star className={CLS} />
    case 'progress':
      return <BarChart3 className={CLS} />
    case 'tags':
      return <Tags className={CLS} />
    case 'timeline':
      return <GanttChart className={CLS} />
    case 'formula':
      return <FileText className={CLS} />
    case 'attachment':
      return <Paperclip className={CLS} />
    case 'button':
      return <MousePointerClick className={CLS} />
    default:
      return null
  }
}
