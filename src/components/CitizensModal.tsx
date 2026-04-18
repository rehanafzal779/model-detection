import React from 'react';
import { X, Award } from 'lucide-react';

interface Report {
  citizenName: string;
  [key: string]: any;
}

interface CitizensModalProps {
  reports: Report[];
  onClose: () => void;
}

export function CitizensModal({ reports, onClose }: CitizensModalProps) {
  // Calculate citizens leaderboard from reports
  const citizens = React.useMemo(() => {
    const citizenReports = reports.reduce((acc, r) => {
      acc[r.citizenName] = (acc[r.citizenName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(citizenReports)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, reports: count }));
  }, [reports]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl text-white">All Citizens Leaderboard</h2>
              <p className="text-sm text-slate-400">Ranked by number of reports submitted</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Citizens List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {citizens.map((citizen, index) => (
              <div
                key={`${citizen.name}-${index}`}
                className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                  index === 1 ? 'bg-slate-500/20 text-slate-400' :
                  index === 2 ? 'bg-orange-500/20 text-orange-500' :
                  'bg-slate-700/20 text-slate-400'
                }`}>
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white">{citizen.name}</p>
                  <p className="text-sm text-slate-400">{citizen.reports} reports submitted</p>
                </div>
                {index < 3 && (
                  <div className="flex items-center gap-1">
                    {index === 0 && <span className="text-2xl">🥇</span>}
                    {index === 1 && <span className="text-2xl">🥈</span>}
                    {index === 2 && <span className="text-2xl">🥉</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}