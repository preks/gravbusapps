import { Typography } from 'antd'

const { Title, Text } = Typography

export const InsightsSection = () => {
  return (
    <div className="gba:w-full gba:bg-white gba:rounded-2xl gba:shadow-md gba:p-6">
      <Title level={4} style={{ margin: '0 0 1rem 0' }}>Insights</Title>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <div className="gba:flex gba:items-center">
          <div className="gba:w-3 gba:h-3 gba:bg-rose-400 gba:rounded-full gba:mr-2"></div>
          <Text>Sales</Text>
        </div>
        <div className="gba:flex gba:items-center">
          <div className="gba:w-3 gba:h-3 gba:bg-emerald-400 gba:rounded-full gba:mr-2"></div>
          <Text>Marketing</Text>
        </div>
        <div className="gba:flex gba:items-center">
          <div className="gba:w-3 gba:h-3 gba:bg-violet-400 gba:rounded-full gba:mr-2"></div>
          <Text>Development</Text>
        </div>
        <div className="gba:flex gba:items-center">
          <div className="gba:w-3 gba:h-3 gba:bg-sky-400 gba:rounded-full gba:mr-2"></div>
          <Text>HR</Text>
        </div>
      </div>
      <div className="gba:flex gba:justify-between gba:text-sm gba:text-gray-600">
        <div>
          <Text strong>Sales</Text>
          <div className="gba:w-24 gba:h-2 gba:bg-gray-200 gba:rounded-full gba:mt-1">
            <div className="gba:h-full gba:bg-sky-400 gba:rounded-full" style={{ width: "4.2%" }}></div>
          </div>
        </div>
        <div>
          <Text strong>Marketing</Text>
          <div className="gba:w-24 gba:h-2 gba:bg-gray-200 gba:rounded-full gba:mt-1">
            <div className="gba:h-full gba:bg-sky-400 gba:rounded-full" style={{ width: "3.8%" }}></div>
          </div>
        </div>
        <div>
          <Text strong>Development</Text>
          <div className="gba:w-24 gba:h-2 gba:bg-gray-200 gba:rounded-full gba:mt-1">
            <div className="gba:h-full gba:bg-sky-400 gba:rounded-full" style={{ width: "5.1%" }}></div>
          </div>
        </div>
        <div>
          <Text strong>HR</Text>
          <div className="gba:w-24 gba:h-2 gba:bg-gray-200 gba:rounded-full gba:mt-1">
            <div className="gba:h-full gba:bg-blue-500 gba:rounded-full" style={{ width: "2.9%" }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InsightsSection;