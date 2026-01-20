import React from 'react';
import { 
  BarChart3, FileText, Clock, TrendingUp, 
  Calendar, Activity, Database, Users 
} from 'lucide-react';

/**
 * Statistics Dashboard Component
 */
export function Dashboard({ stats, history, theme }) {
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatCard = ({ icon: Icon, label, value, subtext, color = 'blue' }) => (
    <div className={`p-4 rounded-lg border ${theme.card} ${theme.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${theme.textMuted}`}>{label}</p>
          <p className={`text-2xl font-bold mt-1 ${theme.text}`}>{value}</p>
          {subtext && (
            <p className={`text-xs mt-1 ${theme.textMuted}`}>{subtext}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-${color}-500/10`}>
          <Icon className={`w-5 h-5 text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  const recentHistory = history?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Generated"
          value={formatNumber(stats?.totalGenerated || 0)}
          subtext="XML files"
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Total Accounts"
          value={formatNumber(stats?.totalAccounts || 0)}
          subtext="Processed"
          color="green"
        />
        <StatCard
          icon={Activity}
          label="Last Generation"
          value={stats?.lastGeneration ? 'Recent' : 'Never'}
          subtext={formatDate(stats?.lastGeneration)}
          color="purple"
        />
        <StatCard
          icon={Database}
          label="Active Module"
          value={Object.entries(stats?.byModule || {})
            .sort((a, b) => b[1] - a[1])[0]?.[0]?.toUpperCase() || 'N/A'}
          subtext="Most used"
          color="amber"
        />
      </div>

      {/* Module Breakdown */}
      <div className={`p-4 rounded-lg border ${theme.card} ${theme.border}`}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className={`w-5 h-5 ${theme.accentText}`} />
          <h3 className={`font-medium ${theme.text}`}>Generation by Module</h3>
        </div>
        <div className="space-y-3">
          {['crs', 'fatca', 'cbc'].map((module) => {
            const count = stats?.byModule?.[module] || 0;
            const total = stats?.totalGenerated || 1;
            const percentage = Math.round((count / total) * 100) || 0;
            
            return (
              <div key={module}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${theme.text}`}>{module.toUpperCase()}</span>
                  <span className={`text-sm ${theme.textMuted}`}>{count} ({percentage}%)</span>
                </div>
                <div className={`h-2 rounded-full ${theme.bg} overflow-hidden`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      module === 'crs' ? 'bg-blue-500' :
                      module === 'fatca' ? 'bg-green-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={`p-4 rounded-lg border ${theme.card} ${theme.border}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${theme.accentText}`} />
            <h3 className={`font-medium ${theme.text}`}>Recent Activity</h3>
          </div>
          {history?.length > 5 && (
            <span className={`text-xs ${theme.textMuted}`}>
              Showing 5 of {history.length}
            </span>
          )}
        </div>
        
        {recentHistory.length === 0 ? (
          <p className={`text-sm ${theme.textMuted}`}>No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentHistory.map((entry, index) => (
              <div
                key={entry.id || index}
                className={`flex items-center gap-3 p-3 rounded-lg ${theme.bg}`}
              >
                <div className={`p-2 rounded-lg ${
                  entry.success ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  <FileText className={`w-4 h-4 ${
                    entry.success ? 'text-green-500' : 'text-red-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${theme.text}`}>
                    {entry.module?.toUpperCase()} - {entry.type || 'Generation'}
                  </p>
                  <p className={`text-xs ${theme.textMuted}`}>
                    {entry.accountCount ? `${entry.accountCount} accounts • ` : ''}
                    {formatDate(entry.timestamp)}
                  </p>
                </div>
                {entry.outputPath && (
                  <span className={`text-xs truncate max-w-32 ${theme.textMuted}`}>
                    {entry.outputPath.split(/[/\\]/).pop()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
