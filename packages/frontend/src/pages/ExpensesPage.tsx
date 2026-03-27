import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Check, X } from 'lucide-react';
import api from '../api/client';
import MonthSelector from '../components/MonthSelector';
import { formatCurrency, formatShortDate } from '../utils/format';
import clsx from 'clsx';

interface Expense {
  id: string;
  description: string;
  amount: number;
  source: string;
  createdAt: string;
  categoryId: string;
  category: { id: string; name: string; icon: string; color: string };
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function ExpensesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ description: '', amount: '', categoryId: '' });
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCatId, setNewCatId] = useState('');

  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/api/settings').then(r => r.data) });
  const isOwner = settings?.userRole === 'OWNER';

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data),
  });

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses', month, year, filterCat],
    queryFn: () => {
      let url = `/api/expenses?month=${month}&year=${year}`;
      if (filterCat) url += `&category=${filterCat}`;
      return api.get(url).then((r) => r.data);
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: { description: string; amount: number; categoryId?: string }) =>
      api.post('/api/expenses', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowAdd(false); setNewDesc(''); setNewAmount(''); setNewCatId(''); },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; description?: string; amount?: number; categoryId?: string }) =>
      api.put(`/api/expenses/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setEditId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  const filtered = expenses.filter((e) =>
    !search || e.description.includes(search),
  );

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  const startEdit = (exp: Expense) => {
    setEditId(exp.id);
    setEditValues({ description: exp.description, amount: exp.amount.toString(), categoryId: exp.categoryId });
  };

  const saveEdit = () => {
    if (!editId) return;
    editMutation.mutate({
      id: editId,
      description: editValues.description,
      amount: parseFloat(editValues.amount),
      categoryId: editValues.categoryId,
    });
  };

  return (
    <div className="space-y-4">
      <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />

      {/* Filters */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">כל הקטגוריות</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </div>

      {/* Add button */}
      {isOwner && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} />
          הוסף הוצאה
        </button>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
            <h3 className="text-lg font-bold mb-4">הוצאה חדשה</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="תיאור"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="סכום"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                dir="ltr"
              />
              <select
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">קטגוריה אוטומטית</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => addMutation.mutate({ description: newDesc, amount: parseFloat(newAmount), categoryId: newCatId || undefined })}
                disabled={!newDesc || !newAmount}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg transition-colors"
              >
                שמור
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expenses table */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-400">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-500">אין הוצאות</div>
      ) : (
        <div className="space-y-1">
          {filtered.map((exp) => (
            <div
              key={exp.id}
              className={clsx(
                'bg-slate-800 rounded-lg px-3 py-2.5 flex items-center justify-between border border-slate-700',
                isOwner && 'cursor-pointer hover:bg-slate-750',
              )}
              onClick={() => isOwner && editId !== exp.id && startEdit(exp)}
            >
              {editId === exp.id ? (
                <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    value={editValues.description}
                    onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={editValues.amount}
                    onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                    className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                  <button onClick={saveEdit} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={16} /></button>
                  <button onClick={() => setEditId(null)} className="p-1 text-slate-400 hover:text-slate-300"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <span>{exp.category.icon}</span>
                    <span className="text-sm">{exp.description}</span>
                    <span className="text-xs text-slate-500">{formatShortDate(exp.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(exp.amount)}</span>
                    <span className="text-xs">{exp.source === 'TELEGRAM' ? '🤖' : '🖥️'}</span>
                    {isOwner && (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('בטוח?')) deleteMutation.mutate(exp.id); }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-center">
        <span className="text-slate-400 text-sm">סה"כ: </span>
        <span className="font-bold text-lg">{formatCurrency(total)}</span>
        <span className="text-slate-500 text-xs mr-2">({filtered.length} הוצאות)</span>
      </div>
    </div>
  );
}
