'use client';

interface StatsCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    type: 'up' | 'down' | 'neutral';
  };
}

export function StatsCard({ icon, label, value, trend }: StatsCardProps) {
  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-slate-500',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon && icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {trend && <p className={`text-xs ${trendColors[trend.type]}`}>{trend.value}</p>}
    </div>
  );
}
