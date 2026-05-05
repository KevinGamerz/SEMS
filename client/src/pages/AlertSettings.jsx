import { useEffect, useState } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/appStore';
import { Settings, Plus, Trash2 } from 'lucide-react';

export default function AlertSettings() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [thresholds, setThresholds] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ zoneId: '', thresholdKwh: '' });

  const fetchData = () => {
    api.get('/alerts/thresholds/list').then(({ data }) => setThresholds(data.thresholds)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    api.get('/zones').then(({ data }) => setZones(data.zones));
  }, []);

  const handleCreate = async () => {
    if (!form.zoneId || !form.thresholdKwh) { addToast({ type: 'warning', message: 'Fill required fields' }); return; }
    try {
      await api.post('/alerts/thresholds', { zoneId: form.zoneId, thresholdKwh: parseFloat(form.thresholdKwh) });
      addToast({ type: 'success', message: 'Threshold created' });
      setShowForm(false);
      setForm({ zoneId: '', thresholdKwh: '' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this threshold?')) return;
    try {
      await api.delete(`/alerts/thresholds/${id}`);
      addToast({ type: 'success', message: 'Threshold deleted' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete' });
    }
  };

  return (
    <div>
      <Topbar title="Alert Settings" breadcrumbs={[{ label: 'Settings' }, { label: 'Alerts' }]} />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Alert Thresholds</h2>
            <p className="text-sm text-text-secondary">Configure when alerts should trigger based on consumption levels</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark">
            <Plus size={16} /> Add Threshold
          </button>
        </div>

        {showForm && (
          <div className="bg-surface border border-border rounded-xl p-5 space-y-3 card-animate">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Zone</label>
                <select value={form.zoneId} onChange={e => setForm({ ...form, zoneId: e.target.value })} className="w-full text-sm">
                  <option value="">Select zone...</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Threshold (kWh)</label>
                <input type="number" step="0.01" value={form.thresholdKwh} onChange={e => setForm({ ...form, thresholdKwh: e.target.value })}
                  className="w-full text-sm" placeholder="e.g. 500" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-border rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-3 py-1.5 text-sm bg-brand text-white rounded-lg">Create</button>
            </div>
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {thresholds.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              <Settings size={32} className="mx-auto mb-2" />
              <p>No alert thresholds configured.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary">
                  <th className="text-left px-4 py-3 font-medium">Scope</th>
                  <th className="text-left px-4 py-3 font-medium">Threshold</th>
                  <th className="text-left px-4 py-3 font-medium">Created By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {thresholds.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-surface-elevated/30">
                    <td className="px-4 py-3 text-sm">
                      {t.zone?.name || t.building?.name || t.device?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold">{t.thresholdKwh} kWh</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{t.creator?.name}</td>
                    <td className="px-4 py-3">
                      {user?.role === 'super_admin' && (
                        <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-surface-elevated rounded">
                          <Trash2 size={14} className="text-danger" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
