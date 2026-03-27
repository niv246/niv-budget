import clsx from 'clsx';
import { formatCurrency } from '../utils/format';

interface StatCardProps {
  label: string;
  amount: number;
  color: 'emerald' | 'amber' | 'rose' | 'blue';
  icon?: string;
}

const colorMap = {
  emerald: 'text-emerald-400 border-emerald-400/30',
  amber: 'text-amber-400 border-amber-400/30',
  rose: 'text-rose-400 border-rose-400/30',
  blue: 'text-blue-400 border-blue-400/30',
};

export default function StatCard({ label, amount, color, icon }: StatCardProps) {
  return (
    <div className={clsx('bg-slate-800 rounded-xl p-3 border', colorMap[color])}>
      <div className="text-slate-400 text-xs mb-1">
        {icon && <span className="ml-1">{icon}</span>}
        {label}
      </div>
      <div className={clsx('text-lg font-bold', `text-${color}-400`)}>
        {formatCurrency(amount)}
      </div>
    </div>
  );
}
