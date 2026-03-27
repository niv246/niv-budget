import { ChevronRight, ChevronLeft } from 'lucide-react';
import { getHebrewMonth } from '../utils/format';

interface MonthSelectorProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export default function MonthSelector({ month, year, onChange }: MonthSelectorProps) {
  const prev = () => {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  };

  const next = () => {
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  };

  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      <button onClick={next} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
        <ChevronRight size={20} />
      </button>
      <span className="text-lg font-medium min-w-[140px] text-center">
        {getHebrewMonth(month)} {year}
      </span>
      <button onClick={prev} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
        <ChevronLeft size={20} />
      </button>
    </div>
  );
}
