'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LocalProjectRun } from '@/lib/local-worker/project-runs';

interface RunThroughputChartProps {
  runs: LocalProjectRun[];
}

interface WeeklyRunCount {
  week: string;
  label: string;
  started: number;
  completed: number;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildWeeklyRunCounts(runs: LocalProjectRun[], now = new Date()): WeeklyRunCount[] {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const currentDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const elapsedDays = Math.floor((currentDay.getTime() - monthStart.getTime()) / 86_400_000);
  const weekCount = Math.floor(elapsedDays / 7) + 1;
  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const start = new Date(monthStart);
    start.setUTCDate(start.getUTCDate() + (7 * index));
    return {
      week: dateKey(start),
      label: new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(start),
      started: 0,
      completed: 0,
    };
  });
  for (const run of runs) {
    const startedAt = parseDate(run.startedAt);
    const startedWeek = startedAt
      && startedAt.getUTCFullYear() === now.getUTCFullYear()
      && startedAt.getUTCMonth() === now.getUTCMonth()
      && weeks[Math.floor((startedAt.getUTCDate() - 1) / 7)];
    if (startedWeek) startedWeek.started += 1;

    if (run.status === 'completed') {
      const finishedAt = parseDate(run.finishedAt);
      const completedWeek = finishedAt
        && finishedAt.getUTCFullYear() === now.getUTCFullYear()
        && finishedAt.getUTCMonth() === now.getUTCMonth()
        && weeks[Math.floor((finishedAt.getUTCDate() - 1) / 7)];
      if (completedWeek) completedWeek.completed += 1;
    }
  }

  return weeks;
}

export default function RunThroughputChart({ runs }: RunThroughputChartProps) {
  const data = buildWeeklyRunCounts(runs);
  const hasActivity = data.some((week) => week.started > 0 || week.completed > 0);

  if (!hasActivity) {
    return <p className="overview-empty overview-throughput-empty">No runs started or completed this month in the latest 100 records.</p>;
  }

  return (
    <div
      className="overview-throughput-chart"
      role="img"
      aria-label="Weekly counts of runs started and completed this month, based on the latest 100 run records."
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted-text)', fontSize: 11 }}
            tickMargin={10}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted-text)', fontSize: 11 }}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--ivory)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--secondary-text)' }}
          />
          <Area
            type="linear"
            dataKey="started"
            name="Started"
            stroke="var(--secondary-text)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fill="none"
            isAnimationActive={false}
          />
          <Area
            type="linear"
            dataKey="completed"
            name="Completed"
            stroke="var(--sage)"
            strokeWidth={2}
            fill="var(--sage)"
            fillOpacity={0.06}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="overview-throughput-legend" aria-hidden="true">
        <span><i className="overview-throughput-key overview-throughput-key--started" />Runs started</span>
        <span><i className="overview-throughput-key overview-throughput-key--completed" />Runs completed</span>
      </div>
    </div>
  );
}
