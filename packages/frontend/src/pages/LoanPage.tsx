import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';

interface LoanData {
  total: number;
  paid: number;
  remaining: number;
  monthsLeft: number;
  monthlyPayment: number;
  payments: { id: string; amount: number; note: string | null; paidAt: string }[];
}

export default function LoanPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const qc = useQueryClient();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/api/settings').then(r => r.data) });
  const isOwner = settings?.userRole === 'OWNER';

  const { data, isLoading } = useQuery<LoanData>({
    queryKey: ['loan'],
    queryFn: () => api.get('/api/loan').then((r) => r.data),
  });

  const addPayment = useMutation({
    mutationFn: (payload: { amount: number; note?: string }) =>
      api.post('/api/loan/payment', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAdd(false);
      setNewAmount('');
      setNewNote('');
    },
  });

  if (isLoading || !data) return <div className="text-center py-12 text-slate-400">טוען...</div>;

  const paidPercent = data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">מעקב הלוואה</h2>

      {/* Progress */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#334155" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="8"
              strokeDasharray={`${paidPercent * 2.51} 251`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-400">{paidPercent}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">שולם</p>
            <p className="text-emerald-400 font-bold text-lg">{formatCurrency(data.paid)}</p>
          </div>
          <div>
            <p className="text-slate-400">נותר</p>
            <p className="text-rose-400 font-bold text-lg">{formatCurrency(data.remaining)}</p>
          </div>
          <div>
            <p className="text-slate-400">סה"כ הלוואה</p>
            <p className="font-medium">{formatCurrency(data.total)}</p>
          </div>
          <div>
            <p className="text-slate-400">חודשים נותרו</p>
            <p className="font-medium">{data.monthsLeft}</p>
          </div>
        </div>
      </div>

      {/* Add payment */}
      {isOwner && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} />
          הוסף תשלום
        </button>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
            <h3 className="text-lg font-bold mb-4">תשלום חדש</h3>
            <div className="space-y-3">
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="סכום"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                dir="ltr"
              />
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="הערה (אופציונלי)"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => addPayment.mutate({ amount: parseFloat(newAmount), note: newNote || undefined })}
                disabled={!newAmount}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg transition-colors"
              >
                שמור
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg transition-colors">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <h3 className="text-sm text-slate-400 p-3 border-b border-slate-700">היסטוריית תשלומים</h3>
        {data.payments.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">אין תשלומים</p>
        ) : (
          <div className="divide-y divide-slate-700">
            {data.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <span className="text-sm">{formatDate(p.paidAt)}</span>
                  {p.note && <span className="text-xs text-slate-500 mr-2">{p.note}</span>}
                </div>
                <span className="text-sm font-medium text-emerald-400">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
