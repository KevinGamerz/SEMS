import { useEffect, useState } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/appStore';
import { AlertTriangle, Check, Eye, X } from 'lucide-react';

export default function AlertsPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filters, setFilters] = useState({ severity: '', status: '', page: 1 });

  const fetchAlerts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.status) params.set('status', filters.status);
    params.set('page', filters.page);
    params.set('limit', 25);

    api.get(`/alerts?${params}`)
      .then(({ data }) => { setAlerts(data.alerts); setTotal(data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [filters]);

  const handleAction = async (alertId, action) => {
    try {
      await api.patch(`/alerts/${alertId}/${action}`);
      addToast({ type: 'success', message: `Alert ${action}d` });
      fetchAlerts();
      if (selectedAlert?.id === alertId) {
        const { data } = await api.get(`/alerts/${alertId}`);
        setSelectedAlert(data.alert);
      }
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Action failed' });
    }
  };

  const sevColors = { critical: 'text-danger bg-danger/10', warning: 'text-warning bg-warning/10', info: 'text-info bg-info/10' };
  const statusColors = { new: 'bg-danger', acknowledged: 'bg-warning', resolved: 'bg-success' };
  const statusLabels = { new: 'New', acknowledged: 'Acknowledged', resolved: 'Resolved' };

  return (
    <div>
      <Topbar title="Alerts" breadcrumbs={[{ label: 'Alerts' }]} />
      <div className="p-6 max-w-[1440px] mx-auto space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.severity} onChange={e => setFilters({ ...filters, severity: e.target.value, page: 1 })} className="text-sm">
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })} className="text-sm">
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <span className="text-sm text-text-secondary ml-auto">{total} alerts</span>
        </div>

        {/* Alert Table */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-secondary">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle size={40} className="mx-auto mb-3 text-success" />
              <h3 className="text-lg font-semibold text-text-primary mb-1">No active alerts</h3>
              <p className="text-sm text-text-secondary">System is operating normally.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary">
                  <th className="text-left px-4 py-3 font-medium">Severity</th>
                  <th className="text-left px-4 py-3 font-medium">Zone</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Building</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Device</th>
                  <th className="text-left px-4 py-3 font-medium">Message</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.id} className="border-b border-border/50 hover:bg-surface-elevated/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sevColors[alert.severity]}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{alert.zone?.name}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary hidden md:table-cell">{alert.building?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary hidden lg:table-cell">{alert.device?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{alert.message}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white ${statusColors[alert.status]}`}>
                        {statusLabels[alert.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Eye size={14} className="text-text-secondary" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > 25 && (
          <div className="flex items-center justify-end gap-2">
            <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg disabled:opacity-40 hover:bg-surface-elevated">Prev</button>
            <span className="text-sm text-text-secondary">Page {filters.page} of {Math.ceil(total / 25)}</span>
            <button disabled={filters.page >= Math.ceil(total / 25)} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg disabled:opacity-40 hover:bg-surface-elevated">Next</button>
          </div>
        )}
      </div>

      {/* Slide-in Drawer */}
      {selectedAlert && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedAlert(null)} />
          <div className="drawer-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Alert Detail</h2>
              <button onClick={() => setSelectedAlert(null)} className="p-1 hover:bg-surface-elevated rounded">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className={`text-sm font-semibold px-3 py-1 rounded ${sevColors[selectedAlert.severity]}`}>
                  {selectedAlert.severity.toUpperCase()}
                </span>
                <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full text-white ${statusColors[selectedAlert.status]}`}>
                  {statusLabels[selectedAlert.status]}
                </span>
              </div>

              <p className="text-sm text-text-primary">{selectedAlert.message}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-text-secondary">Zone:</span> <span className="text-text-primary">{selectedAlert.zone?.name}</span></div>
                <div><span className="text-text-secondary">Building:</span> <span className="text-text-primary">{selectedAlert.building?.name || '—'}</span></div>
                <div><span className="text-text-secondary">Device:</span> <span className="text-text-primary">{selectedAlert.device?.name || '—'}</span></div>
                <div><span className="text-text-secondary">Created:</span> <span className="text-text-primary">{new Date(selectedAlert.createdAt).toLocaleString()}</span></div>
              </div>

              {selectedAlert.acknowledger && (
                <div className="text-sm border-t border-border pt-3">
                  <span className="text-text-secondary">Acknowledged by:</span> {selectedAlert.acknowledger.name} at {new Date(selectedAlert.acknowledgedAt).toLocaleString()}
                </div>
              )}
              {selectedAlert.resolver && (
                <div className="text-sm">
                  <span className="text-text-secondary">Resolved by:</span> {selectedAlert.resolver.name} at {new Date(selectedAlert.resolvedAt).toLocaleString()}
                </div>
              )}

              {/* Action Buttons */}
              {(user?.role === 'super_admin' || user?.role === 'zone_manager') && (
                <div className="flex gap-3 pt-4 border-t border-border">
                  {selectedAlert.status === 'new' && (
                    <button onClick={() => handleAction(selectedAlert.id, 'acknowledge')}
                      className="flex items-center gap-2 px-4 py-2 bg-warning text-navy font-medium rounded-lg text-sm hover:opacity-90">
                      <Check size={16} /> Acknowledge
                    </button>
                  )}
                  {(selectedAlert.status === 'new' || selectedAlert.status === 'acknowledged') && (
                    <button onClick={() => handleAction(selectedAlert.id, 'resolve')}
                      className="flex items-center gap-2 px-4 py-2 bg-success text-navy font-medium rounded-lg text-sm hover:opacity-90">
                      <Check size={16} /> Mark Resolved
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
