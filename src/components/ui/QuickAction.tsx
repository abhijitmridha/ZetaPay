'use client';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}

export function QuickAction({ icon, title, description, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-500 hover:shadow-lg"
    >
      <div className="rounded-lg bg-emerald-50 p-2">{icon}</div>
      <div className="text-left">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </button>
  );
}
