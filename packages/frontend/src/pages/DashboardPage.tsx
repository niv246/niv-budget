import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import { formatCurrency, formatShortDate } from '../utils/format';
import clsx from 'clsx';

interface DashboardData {
  totalIncome: number;
  totalFixed: number;
  loanMonthlyPayment: number;
  totalVariable: number;
  remaining: number;
  budgetPercent: number;
  availableBudget: number;
  byCategory: { id: string; name: string; icon: string; color: string; total: number; percent: number }[];
  recentExpenses: { id: string; description: string; amount: number; source: string; createdAt: string; category: { icon: string; name: string } }[];
  loanStatus: { total: number; paid: number; remaining: number; monthsLeft: number };
  weeklyComparison: { thisWeek: number; lastWeek: number; trend: 'up' | 'down' | 'same' };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/api/settings').then((r) => r.data),
  });

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', month, year],
    queryFn: () => api.get(`/api/dashboard?month=${month}&year=${year}`).then((r) => r.data),
  });

  // Redirect to onboarding if not onboarded
  if (settings && !settings.isOnboarded) {
    navigate('/onboarding', { replace: true });
    return null;
  }

  if (isLoading || !data) {
    return <div className="text-center py-12 text-slate-400">טוען...</div>;
  }

  const remainColor = data.budgetPercent < 70 ? 'text-emerald-400' : data.budgetPercent < 90 ? 'text-amber-400' : 'text-rose-400';
  const barColor = data.budgetPercent < 70 ? 'bg-emerald-500' : data.budgetPercent < 90 ? 'bg-amber-500' : 'bg-rose-500';

  const TrendIcon = data.weeklyComparison.trend === 'up' ? TrendingUp : data.weeklyComparison.trend === 'down' ? TrendingDown : Minus;
  const trendColor = data.weeklyComparison.trend === 'down' ? 'text-emerald-400' : data.weeklyComparison.trend === 'up' ? 'text-rose-400' : 'text-slate-400';

  return (
    <div className="space-y-4">
      {/* Hero - remaining budget */}
      <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700">
        <p className="text-slate-400 text-sm mb-1">נשאר להוציא</p>
        <p className={clsx('text-4xl font-bold', remainColor)}>
          {formatCurrency(data.remaining)}
        </p>
        <div className="mt-3 bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(data.budgetPercent, 100)}%` }}
          />
        </div>
        <p className="text-slate-400 text-xs mt-2">
          {data.budgetPercent}% מהתקציב נוצל
        </p>
      </div>

      {/* Weekly comparison badge */}
      <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between border border-slate-700">
        <div className="flex items-center gap-2">
          <TrendIcon size={16} className={trendColor} />
          <span className="text-sm text-slate-400">השבוע:</span>
          <span className="text-sm font-medium">{formatCurrency(data.weeklyComparison.thisWeek)}</span>
        </div>
        <span className="text-xs text-slate-500">
          שבוע קודם: {formatCurrency(data.weeklyComparison.lastWeek)}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="הכנסות" amount={data.totalIncome} color="emerald" icon="💰" />
        <StatCard label="קבועות" amount={data.totalFixed + data.loanMonthlyPayment} color="amber" icon="📌" />
        <StatCard label="משתנות" amount={data.totalVariable} color="rose" icon="🛒" />
      </div>

      {/* Loan mini card */}
      {data.loanStatus.total > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">הלוואה</span>
            <span className="text-xs text-slate-500">{data.loanStatus.monthsLeft} חודשים נותרו</span>
          </div>
          <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(data.loanStatus.paid / data.loanStatus.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {formatCurrency(data.loanStatus.paid)} מתוך {formatCurrency(data.loanStatus.total)}
          </p>
        </div>
      )}

      {/* Category pie chart */}
      {data.byCategory.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm text-slate-400 mb-3">לפי קטגוריה</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byCategory}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                >
                  {data.byCategory.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', direction: 'rtl' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.byCategory.map((cat) => (
              <span key={cat.id} className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.icon} {cat.name} ({cat.percent}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm text-slate-400 mb-3">הוצאות אחרונות</h3>
        {data.recentExpenses.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">אין הוצאות החודש</p>
        ) : (
          <div className="space-y-2">
            {data.recentExpenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span>{exp.category.icon}</span>
                  <div>
                    <span className="text-sm">{exp.description}</span>
                    <span className="text-xs text-slate-500 mr-2">{formatShortDate(exp.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCurrency(exp.amount)}</span>
                  <span className="text-xs">{exp.source === 'TELEGRAM' ? '🤖' : '🖥️'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
