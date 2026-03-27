import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { formatCurrency } from '../utils/format';

const FIXED_SUGGESTIONS = ['שכירות', 'חשמל', 'מים', 'אינטרנט', 'סלולר', 'ביטוח', 'ועד בית', 'גז'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1 - Loan
  const [loanTotal, setLoanTotal] = useState('');
  const [loanMonthly, setLoanMonthly] = useState('');
  const [noLoan, setNoLoan] = useState(false);

  // Step 2 - Income
  const [incomes, setIncomes] = useState<{ name: string; amount: string }[]>([{ name: '', amount: '' }]);

  // Step 3 - Fixed
  const [fixedExpenses, setFixedExpenses] = useState<{ name: string; amount: string }[]>(
    FIXED_SUGGESTIONS.map((name) => ({ name, amount: '' })),
  );
  const [customFixed, setCustomFixed] = useState<{ name: string; amount: string }[]>([]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save loan settings
      await api.put('/api/settings', {
        loanTotal: noLoan ? 0 : parseFloat(loanTotal) || 0,
        loanMonthlyPayment: noLoan ? 0 : parseFloat(loanMonthly) || 0,
        isOnboarded: true,
      });

      // Save income sources
      for (const inc of incomes) {
        if (inc.name && inc.amount) {
          await api.post('/api/income', { name: inc.name, amount: parseFloat(inc.amount) });
        }
      }

      // Save fixed expenses (suggestions + custom)
      const allFixed = [...fixedExpenses, ...customFixed];
      for (const exp of allFixed) {
        if (exp.name && exp.amount && parseFloat(exp.amount) > 0) {
          await api.post('/api/fixed', { name: exp.name, amount: parseFloat(exp.amount) });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      navigate('/', { replace: true });
    },
  });

  const totalIncome = incomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalFixed = [...fixedExpenses, ...customFixed].reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
  const loanPayment = noLoan ? 0 : parseFloat(loanMonthly) || 0;
  const variableBudget = totalIncome - totalFixed - loanPayment;

  const canProceed = () => {
    if (step === 1) return noLoan || (loanTotal && loanMonthly);
    if (step === 2) return incomes.some((i) => i.name && i.amount);
    return true;
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-8">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-slate-700'}`}
            />
          ))}
        </div>

        {/* Step 1 - Loan */}
        {step === 1 && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-1">כמה ההלוואה?</h2>
            <p className="text-slate-400 text-sm mb-6">נעקוב אחרי ההחזר החודשי שלך</p>

            {!noLoan ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">סכום הלוואה</label>
                  <input
                    type="number"
                    value={loanTotal}
                    onChange={(e) => setLoanTotal(e.target.value)}
                    placeholder="50000"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-lg placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">החזר חודשי</label>
                  <input
                    type="number"
                    value={loanMonthly}
                    onChange={(e) => setLoanMonthly(e.target.value)}
                    placeholder="4166"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-lg placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-4xl mb-2">🎉</p>
                <p>מצוין! אין הלוואה</p>
              </div>
            )}

            <button
              onClick={() => setNoLoan(!noLoan)}
              className="mt-4 text-sm text-slate-400 hover:text-slate-300 underline"
            >
              {noLoan ? 'יש לי הלוואה' : 'אין לי הלוואה'}
            </button>
          </div>
        )}

        {/* Step 2 - Income */}
        {step === 2 && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-1">מה ההכנסות שלך?</h2>
            <p className="text-slate-400 text-sm mb-6">הוסף מקורות הכנסה חודשיים</p>

            <div className="space-y-3">
              {incomes.map((inc, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={inc.name}
                    onChange={(e) => { const arr = [...incomes]; arr[i].name = e.target.value; setIncomes(arr); }}
                    placeholder="שם (משכורת, פרילנס...)"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={inc.amount}
                    onChange={(e) => { const arr = [...incomes]; arr[i].amount = e.target.value; setIncomes(arr); }}
                    placeholder="סכום"
                    className="w-28 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                  {incomes.length > 1 && (
                    <button
                      onClick={() => setIncomes(incomes.filter((_, j) => j !== i))}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setIncomes([...incomes, { name: '', amount: '' }])}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Plus size={14} /> הוסף מקור הכנסה
            </button>
          </div>
        )}

        {/* Step 3 - Fixed expenses */}
        {step === 3 && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-1">הוצאות קבועות</h2>
            <p className="text-slate-400 text-sm mb-4">הזן סכום ליד הרלוונטיים, השאר ריק לדלג</p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {fixedExpenses.map((exp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm w-24 text-slate-300">{exp.name}</span>
                  <input
                    type="number"
                    value={exp.amount}
                    onChange={(e) => { const arr = [...fixedExpenses]; arr[i].amount = e.target.value; setFixedExpenses(arr); }}
                    placeholder="₪"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                </div>
              ))}

              {customFixed.map((exp, i) => (
                <div key={`custom-${i}`} className="flex items-center gap-2">
                  <input
                    value={exp.name}
                    onChange={(e) => { const arr = [...customFixed]; arr[i].name = e.target.value; setCustomFixed(arr); }}
                    placeholder="שם"
                    className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={exp.amount}
                    onChange={(e) => { const arr = [...customFixed]; arr[i].amount = e.target.value; setCustomFixed(arr); }}
                    placeholder="₪"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                  <button onClick={() => setCustomFixed(customFixed.filter((_, j) => j !== i))} className="text-slate-500"><X size={16} /></button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setCustomFixed([...customFixed, { name: '', amount: '' }])}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Plus size={14} /> הוסף הוצאה קבועה
            </button>
          </div>
        )}

        {/* Step 4 - Summary */}
        {step === 4 && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold mb-4">סיכום</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">הכנסות</span>
                <span className="text-emerald-400 font-medium">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">הוצאות קבועות</span>
                <span className="text-amber-400 font-medium">{formatCurrency(totalFixed)}</span>
              </div>
              {loanPayment > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">החזר הלוואה</span>
                  <span className="text-amber-400 font-medium">{formatCurrency(loanPayment)}</span>
                </div>
              )}
              <hr className="border-slate-700" />
              <div className="flex justify-between">
                <span className="font-medium">תקציב משתנה חודשי</span>
                <span className={`text-xl font-bold ${variableBudget > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(variableBudget)}
                </span>
              </div>
            </div>

            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg text-lg transition-colors"
            >
              {saveMutation.isPending ? 'שומר...' : 'הכל נכון? יאללה! 🚀'}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-300"
            >
              <ChevronRight size={18} />
              חזרה
            </button>
          ) : <div />}
          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
            >
              הבא
              <ChevronLeft size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
