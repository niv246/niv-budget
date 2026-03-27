import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../api/client';

export default function LoginPage() {
  const [token, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('הזן קוד גישה');
      return;
    }
    setToken(token.trim());
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700">
        <h1 className="text-2xl font-bold text-center mb-2">NivBudget</h1>
        <p className="text-slate-400 text-center mb-6">ניהול תקציב אישי</p>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-400 mb-2">קוד גישה</label>
          <input
            type="text"
            value={token}
            onChange={(e) => { setTokenInput(e.target.value); setError(''); }}
            placeholder="הזן קוד גישה..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 mb-3"
            dir="ltr"
          />
          {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            כניסה
          </button>
        </form>
      </div>
    </div>
  );
}
