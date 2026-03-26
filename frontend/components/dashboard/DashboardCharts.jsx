'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const colors = ['#d4af37', '#22c55e', '#ef4444'];

export function DashboardCharts({ weeklyIncome = 0, directIncome = 0, rewardIncome = 0 }) {
  const matching = Number(weeklyIncome || 0);
  const direct = Number(directIncome || 0);
  const reward = Number(rewardIncome || 0);
  const hasData = matching + direct + reward > 0;

  const lineData = hasData
    ? [
        { day: 'Mon', value: matching * 0.1 },
        { day: 'Tue', value: matching * 0.2 },
        { day: 'Wed', value: matching * 0.3 },
        { day: 'Thu', value: matching * 0.55 },
        { day: 'Fri', value: matching * 0.8 },
        { day: 'Sat', value: matching * 0.95 },
        { day: 'Sun', value: matching }
      ]
    : [
        { day: 'Mon', value: 0 },
        { day: 'Tue', value: 0 },
        { day: 'Wed', value: 0 },
        { day: 'Thu', value: 0 },
        { day: 'Fri', value: 0 },
        { day: 'Sat', value: 0 },
        { day: 'Sun', value: 0 }
      ];

  const splitData = [
    { name: 'Matching', value: matching },
    { name: 'Direct', value: direct },
    { name: 'Rewards', value: reward }
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card-surface h-72 p-4">
        <p className="mb-3 text-sm text-muted">Weekly Earnings Trend</p>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={lineData}>
            <XAxis dataKey="day" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ background: '#151515', border: '1px solid #2a2a2a' }} />
            <Line type="monotone" dataKey="value" stroke="#d4af37" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        {!hasData ? <p className="-mt-8 text-center text-xs text-muted">No earnings data for this period yet.</p> : null}
      </div>

      <div className="card-surface h-72 p-4">
        <p className="mb-3 text-sm text-muted">Income Split</p>
        {splitData.length ? (
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={splitData} dataKey="value" nameKey="name" outerRadius={85}>
                {splitData.map((_, idx) => (
                  <Cell key={idx} fill={colors[idx % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#151515', border: '1px solid #2a2a2a' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[85%] items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03]">
            <p className="text-sm text-muted">Income split will appear after your first payout.</p>
          </div>
        )}
      </div>
    </div>
  );
}
