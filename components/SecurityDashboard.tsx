import React, { useState } from 'react';
import { ShieldAlert, Search, Radar, CheckCircle } from 'lucide-react';
import { checkDarkWeb } from '../services/geminiService';

const SecurityDashboard: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const handleScan = async () => {
    if (!email) return;
    setLoading(true);
    const result = await checkDarkWeb(email);
    setReport(result);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto w-full">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Radar className="text-red-500" /> Dark Web Monitor
        </h2>
        <p className="text-slate-400 text-sm mt-1">Powered by Gemini AI</p>
      </header>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <label className="block text-sm font-medium text-slate-300 mb-2">Check for compromised identity</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-500" size={18} />
            <input 
              type="email" 
              placeholder="Enter email address"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button 
            onClick={handleScan}
            disabled={loading || !email}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      </div>

      {report && (
        <div className="bg-slate-800/50 border border-red-500/20 p-5 rounded-xl animate-fade-in">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <ShieldAlert className="text-red-400" size={20} /> Report Findings
          </h3>
          <p className="text-slate-300 leading-relaxed">
            {report}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle size={16} />
            <span>Monitoring active for {email}</span>
          </div>
        </div>
      )}

      {/* Mock Security Score */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-3xl font-bold text-emerald-400 mb-1">94%</div>
          <div className="text-xs text-slate-400">Overall Vault Health</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-3xl font-bold text-yellow-400 mb-1">2</div>
          <div className="text-xs text-slate-400">Reused Passwords</div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;