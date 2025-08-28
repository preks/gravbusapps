import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ContactsByRole {
  role: string;
  count: number;
  percentage: number;
}

interface ContactsByType {
  type: string;
  count: number;
  percentage: number;
}

interface ContactInsightsChartsProps {
  contactsByRole: ContactsByRole[];
  contactsByType: ContactsByType[];
}

const COLORS = ['#C8E6C9', '#DCEDC1', '#E8F5E8', '#A5D6A7', '#B2DFDB', '#C5E1A5'];

export const ContactInsightsCharts: React.FC<ContactInsightsChartsProps> = ({
  contactsByRole,
  contactsByType
}) => {
  return (
    <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mb-6">
      {/* Contacts by Role Pie Chart */}
      <div>
        <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Contacts by Role</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={contactsByRole}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
              label={({ role, percentage }) => `${role}: ${percentage}%`}
            >
              {contactsByRole.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [value, 'Contacts']} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Contacts by Type Bar Chart */}
      <div>
        <h4 className="gba:text-lg gba:font-semibold gba:mb-4">Contacts by Type</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={contactsByType}>
            <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#C8E6C9" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};