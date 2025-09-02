import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';


interface ContactsByType {
  type: string;
  count: number;
  percentage: number;
}

interface ContactInsightsChartsProps {
  contactsByType: ContactsByType[];
}


export const ContactInsightsCharts: React.FC<ContactInsightsChartsProps> = ({
  contactsByType
}) => {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:mb-6">
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