import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export interface SpiderDataPoint {
  axis: string;
  [key: string]: string | number;
}

export interface PersonaRadar {
  name: string;
  color: string;
  dataKey: string;
}

interface SpiderChartProps {
  data: SpiderDataPoint[];
  personas: PersonaRadar[];
  title?: string;
  valueLabel?: string;
}

export function SpiderChart({ data, personas, title, valueLabel = 'Rate' }: SpiderChartProps) {
  if (data.length === 0 || personas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-100 text-center mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[-10, 100]}
            tick={false}
            axisLine={false}
          />
          {personas.map((persona) => (
            <Radar
              key={persona.dataKey}
              name={persona.name}
              dataKey={persona.dataKey}
              stroke={persona.color}
              fill={persona.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F3F4F6' }}
            formatter={(value) => {
              const numValue = typeof value === 'number' ? value : 0;
              return [`${numValue.toFixed(1)}%`, valueLabel];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => (
              <span style={{ color: '#D1D5DB' }}>{value}</span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
