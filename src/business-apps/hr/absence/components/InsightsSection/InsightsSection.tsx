import { Typography } from 'antd'

const { Title, Text } = Typography

export const InsightsSection = () => {
  return (
    <div className="w-full bg-white rounded-2xl shadow-md p-6">
      <Title level={4} style={{ margin: '0 0 1rem 0' }}>Insights</Title>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-rose-400 rounded-full mr-2"></div>
          <Text>Sales</Text>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></div>
          <Text>Marketing</Text>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-violet-400 rounded-full mr-2"></div>
          <Text>Development</Text>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-sky-400 rounded-full mr-2"></div>
          <Text>HR</Text>
        </div>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <div>
          <Text strong>Sales</Text>
          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
            <div className="h-full bg-sky-400 rounded-full" style={{ width: "4.2%" }}></div>
          </div>
        </div>
        <div>
          <Text strong>Marketing</Text>
          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
            <div className="h-full bg-sky-400 rounded-full" style={{ width: "3.8%" }}></div>
          </div>
        </div>
        <div>
          <Text strong>Development</Text>
          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
            <div className="h-full bg-sky-400 rounded-full" style={{ width: "5.1%" }}></div>
          </div>
        </div>
        <div>
          <Text strong>HR</Text>
          <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: "2.9%" }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
