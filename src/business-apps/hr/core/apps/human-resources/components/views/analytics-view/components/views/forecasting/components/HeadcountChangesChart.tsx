import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface HeadcountChangesChartProps {
  data: Array<{
    month: string
    startHeadcount: number
    hires: number
    exits: number
    netChange: number
    endHeadcount: number
  }>
}

export function HeadcountChangesChart({ data }: HeadcountChangesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              hires: 'Hires',
              exits: 'Exits',
              netChange: 'Net change'
            }

            return [value, labels[name] || name]
          }}
        />
        <ReferenceLine y={0} stroke="#8c8c8c" />
        <Bar dataKey="hires" fill="#52c41a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="exits" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
        <Bar dataKey="netChange" fill="#1677ff" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
