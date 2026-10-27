'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface FindingSeverityChartProps {
  counts: {
    high: number;
    medium: number;
    low: number;
  };
}

const SEVERITIES = [
  { key: 'high', label: 'High', color: 'var(--overview-high)' },
  { key: 'medium', label: 'Medium', color: 'var(--overview-medium)' },
  { key: 'low', label: 'Low', color: 'var(--overview-low)' },
] as const;

export default function FindingSeverityChart({ counts }: FindingSeverityChartProps) {
  const chartData = SEVERITIES.map(({ key, label, color }) => ({ name: label, value: counts[key], color }))
    .filter((item) => item.value > 0);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="overview-severity-chart">
      {total > 0 ? (
        <>
          <div className="overview-severity-ring" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="88%"
                  paddingAngle={chartData.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {chartData.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="overview-severity-total">
              <strong>{total}</strong>
              <span>to review</span>
            </div>
          </div>
          <ul className="overview-severity-legend" aria-label="Finding counts by severity">
            {SEVERITIES.map(({ key, label, color }) => (
              <li key={key}>
                <span className="overview-severity-label">
                  <span className="overview-severity-dot" style={{ background: color }} aria-hidden="true" />
                  {label}
                </span>
                <strong>{counts[key]}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="overview-severity-empty">No findings are waiting for review.</p>
      )}
    </div>
  );
}
