import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Check, X, Copy } from 'lucide-react';
import api from '../api/client';
import { formatCurrency } from '../utils/format';

interface IncomeSource { id: string; name: string; amount: number; isActive: boolean }
interface FixedExpense { id: string; name: string; amount: number; isActive: boolean }

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/api/settings').then(r => r.data) });
  const { data: income = [] } = useQuery<IncomeSource[]>({ queryKey: ['income'], queryFn: () => api.get('/api/income').then(r => r.data) });
  const { data: fixed = [] } = useQuery<FixedExpense[]>({ queryKey: ['fixed'], queryFn: () => api.get('/api/fixed').then(r => r.data) });

  const isOwner = settings?.userRole === 'OWNER';

  // Inline editing state
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newIncome, setNewIncome] = useState({ name: '', amount: '' });
  const [newFixed, setNewFixed] = useState({ name: '', amount: '' });
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateSettings = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put('/api/settings', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const addIncomeMut = useMutation({
    mutationFn: (data: { name: string; amount: number }) => api.post('/api/income', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['income'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowAddIncome(false); setNewIncome({ name: '', amount: '' }); },
  });

  const updateIncomeMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; name?: string }) => api.put(`/api/income/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['income'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setEditField(null); },
  });

  const deleteIncomeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/income/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['income'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const addFixedMut = useMutation({
    mutationFn: (data: { name: string; amount: number }) => api.post('/api/fixed', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fixed'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowAddFixed(false); setNewFixed({ name: '', amount: '' }); },
  });

  const updateFixedMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; amount?: number; name?: string }) => api.put(`/api/fixed/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fixed'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setEditField(null); },
  });

  const deleteFixedMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/fixed/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fixed'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const totalIncome = income.filter(i => i.isActive).reduce((s, i) => s + i.amount, 0);
  const totalFixed = fixed.filter(f => f.isActive).reduce((s, f) => s + f.amount, 0);
  const loanPayment = settings?.loanMonthlyPayment || 0;
  const variableBudget = totalIncome - totalFixed - loanPayment;

  // viewerLink is rendered inline below

  const saveInlineEdit = (type: string, id: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val)) return;
    if (type === 'income') updateIncomeMut.mutate({ id, amount: val });
    else if (type === 'fixed') updateFixedMut.mutate({ id, amount: val });
    else if (type === 'loanTotal') updateSettings.mutate({ loanTotal: val });
    else if (type === 'loanMonthly') updateSettings.mutate({ loanMonthlyPayment: val });
    else if (type === 'alertThreshold') updateSettings.mutate({ alertThreshold: val });
  };

  const InlineAmount = ({ value, type, id }: { value: number; type: string; id: string }) => {
    const fieldKey = `${type}-${id}`;
    if (editField === fieldKey && isOwner) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-24 bg-slate-700 border border-blue-500 rounded px-2 py-0.5 text-sm"
            dir="ltr"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(type, id); if (e.key === 'Escape') setEditField(null); }}
          />
          <button onClick={() => saveInlineEdit(type, id)} className="text-emerald-400"><Check size={14} /></button>
          <button onClick={() => setEditField(null)} className="text-slate-400"><X size={14} /></button>
        </div>
      );
    }
    return (
      <span
        className={isOwner ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}
        onClick={() => { if (isOwner) { setEditField(fieldKey); setEditValue(value.toString()); } }}
      >
        {formatCurrency(value)}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">הגדרות</h2>

      {/* Budget summary */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
        <p className="text-sm text-slate-400">תקציב משתנה חודשי</p>
        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(variableBudget)}</p>
        <p className="text-xs text-slate-500 mt-1">
          הכנסות ({formatCurrency(totalIncome)}) - קבועות ({formatCurrency(totalFixed)}) - הלוואה ({formatCurrency(loanPayment)})
        </p>
      </div>

      {/* Income sources */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <h3 className="text-sm font-medium">הכנסות</h3>
          {isOwner && <button onClick={() => setShowAddIncome(true)} className="text-blue-400 hover:text-blue-300"><Plus size={18} /></button>}
        </div>
        {income.map((src) => (
          <div key={src.id} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50 last:border-0">
            <span className="text-sm">{src.name}</span>
            <div className="flex items-center gap-2">
              <InlineAmount value={src.amount} type="income" id={src.id} />
              {isOwner && <button onClick={() => { if (confirm('בטוח?')) deleteIncomeMut.mutate(src.id); }} className="text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>}
            </div>
          </div>
        ))}
        {showAddIncome && (
          <div className="p-3 border-t border-slate-700 flex gap-2">
            <input value={newIncome.name} onChange={(e) => setNewIncome({ ...newIncome, name: e.target.value })} placeholder="שם" className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm" />
            <input type="number" value={newIncome.amount} onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })} placeholder="סכום" className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm" dir="ltr" />
            <button onClick={() => addIncomeMut.mutate({ name: newIncome.name, amount: parseFloat(newIncome.amount) })} disabled={!newIncome.name || !newIncome.amount} className="text-emerald-400 disabled:opacity-50"><Check size={18} /></button>
            <button onClick={() => setShowAddIncome(false)} className="text-slate-400"><X size={18} /></button>
          </div>
        )}
      </div>

      {/* Fixed expenses */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <h3 className="text-sm font-medium">הוצאות קבועות</h3>
          {isOwner && <button onClick={() => setShowAddFixed(true)} className="text-blue-400 hover:text-blue-300"><Plus size={18} /></button>}
        </div>
        {fixed.map((exp) => (
          <div key={exp.id} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50 last:border-0">
            <span className="text-sm">{exp.name}</span>
            <div className="flex items-center gap-2">
              <InlineAmount value={exp.amount} type="fixed" id={exp.id} />
              {isOwner && <button onClick={() => { if (confirm('בטוח?')) deleteFixedMut.mutate(exp.id); }} className="text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>}
            </div>
          </div>
        ))}
        {showAddFixed && (
          <div className="p-3 border-t border-slate-700 flex gap-2">
            <input value={newFixed.name} onChange={(e) => setNewFixed({ ...newFixed, name: e.target.value })} placeholder="שם" className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm" />
            <input type="number" value={newFixed.amount} onChange={(e) => setNewFixed({ ...newFixed, amount: e.target.value })} placeholder="סכום" className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm" dir="ltr" />
            <button onClick={() => addFixedMut.mutate({ name: newFixed.name, amount: parseFloat(newFixed.amount) })} disabled={!newFixed.name || !newFixed.amount} className="text-emerald-400 disabled:opacity-50"><Check size={18} /></button>
            <button onClick={() => setShowAddFixed(false)} className="text-slate-400"><X size={18} /></button>
          </div>
        )}
      </div>

      {/* Loan settings */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 space-y-2">
        <h3 className="text-sm font-medium">הלוואה</h3>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">סכום מקורי</span>
          <InlineAmount value={settings?.loanTotal || 0} type="loanTotal" id="loan" />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">תשלום חודשי</span>
          <InlineAmount value={settings?.loanMonthlyPayment || 0} type="loanMonthly" id="loan" />
        </div>
      </div>

      {/* Alert settings */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 space-y-2">
        <h3 className="text-sm font-medium">התראות</h3>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">סף התראה (%)</span>
          <InlineAmount value={settings?.alertThreshold || 80} type="alertThreshold" id="alert" />
        </div>
        {isOwner && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">דוח שבועי</span>
            <button
              onClick={() => updateSettings.mutate({ weeklyReportEnabled: !settings?.weeklyReportEnabled })}
              className={`px-3 py-1 rounded-full text-xs ${settings?.weeklyReportEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}
            >
              {settings?.weeklyReportEnabled ? 'פעיל' : 'כבוי'}
            </button>
          </div>
        )}
      </div>

      {/* Viewer link */}
      {isOwner && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-3">
          <h3 className="text-sm font-medium mb-2">קישור לצפייה (לאמא)</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-700 rounded px-3 py-2 text-xs text-slate-300 overflow-x-auto" dir="ltr">
              {`${window.location.origin}?token=viewer-mom-budget-2026-secret-token`}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}?token=viewer-mom-budget-2026-secret-token`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
