import React from 'react';
import { Clock, Shield, AlertTriangle, LogIn, Trash2, Eye } from 'lucide-react';
import { ActivityLogEntry } from '../types';

interface ActivityLogProps {
  logs: ActivityLogEntry[];
  onClear: () => void;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs, onClear }) => {
  const getIcon = (action: string) => {
    if (action.includes('Login')) return <LogIn size={16} className="text-emerald-400" />;
    if (action.includes('Delete')) return <Trash2 size={16} className="text-red-400" />;
    if (action.includes('View') || action.includes('Copy')) return <Eye size={16} className="text-blue-400" />;
    if (action.includes('Failed')) return <AlertTriangle size={16} className="text-yellow-400" />;
    return <Clock size={16} className="text-slate-400" />;
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto w-full">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-blue-500" /> Activity Log
          </h2>
          <p className="text-slate-400 text-sm mt-1">Recent security events and actions.</p>
        </div>
        {logs.length > 0 && (
            <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-3 py-1 rounded-full">
                Clear History
            </button>
        )}
      </header>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Clock size={48} className="mx-auto mb-3 opacity-20" />
            <p>No activity recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {logs.slice().reverse().map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-700/30 transition-colors">
                <div className="mt-1 p-2 bg-slate-900 rounded-lg border border-slate-700">
                  {getIcon(log.action)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-medium text-sm">{log.action}</h4>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {log.details && <p className="text-xs text-slate-400 mt-1">{log.details}</p>}
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-500 font-mono">
                     IP: {log.ip}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;