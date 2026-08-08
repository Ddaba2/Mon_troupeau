import React, { useState, useEffect } from 'react';
import { ClipboardList, Trash2, RefreshCw } from 'lucide-react';
import { ActivityLog as ActivityLogType } from '../../types';
import { getActivityLog, clearActivityLog } from '../../services/activityService';
import { getEntityIcon } from '../../utils/species';

export function ActivityLog() {
  const [logs, setLogs]       = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setLogs(await getActivityLog(200));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleClear = async () => {
    if (!confirm('Effacer tout le journal d\'activité ?')) return;
    await clearActivityLog();
    setLogs([]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-primary-600" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Journal d'activité</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-icon text-gray-500 bg-gray-100 dark:bg-gray-700">
            <RefreshCw size={16} />
          </button>
          {logs.length > 0 && (
            <button onClick={handleClear} className="btn-icon text-red-500 bg-red-50 dark:bg-red-900/20">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Chargement…</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Aucune activité enregistrée</div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 text-sm">
                {getEntityIcon(log.entity_type, log.details)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{log.action}</p>
                <div className="flex gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                  {log.user_name && <span className="font-medium text-primary-600 dark:text-primary-400">{log.user_name}</span>}
                  {log.created_at && (
                    <span>
                      {new Date(log.created_at).toLocaleDateString('fr-FR')}{' '}
                      {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {log.details && log.entity_type !== 'mouton' && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate italic">{log.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
