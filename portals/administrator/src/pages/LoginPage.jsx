import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin.sara@moh.gov.et');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1e3a8a] to-[#2563eb] flex items-center justify-center text-white shadow-md shadow-blue-700/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white tracking-tight">CareConnect Ethiopia</h2>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">
            System Administrator Portal
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
            Ministry of Health system-wide administrative control, security auditing, and AI performance governance.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Administrator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Security Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 text-center text-[11px] text-slate-400">
          <span>Federal Ministry of Health • Ethiopia</span>
        </div>
      </div>
    </div>
  );
}
