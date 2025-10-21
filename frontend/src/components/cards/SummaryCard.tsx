import { ReactNode } from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
}

const SummaryCard = ({ title, value, subtext, icon }: SummaryCardProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm ring-1 ring-slate-900/5">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      {icon}
    </div>
    <div className="mt-3 text-2xl font-semibold text-slate-800">{value}</div>
    {subtext && <p className="mt-2 text-xs text-slate-500">{subtext}</p>}
  </div>
);

export default SummaryCard;
