import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/appStore';
import { Zap, Check } from 'lucide-react';

export default function DataEntryPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    deviceId: '',
    kwh: '',
    energySource: 'grid',
    recordedAt: new Date().toISOString().slice(0, 16),
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/devices').then(({ data }) => setDevices(data.devices));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    // Client validation
    const newErrors = {};
    if (!form.deviceId) newErrors.deviceId = 'Device is required';
    if (!form.kwh || parseFloat(form.kwh) <= 0) newErrors.kwh = 'Reading must be a positive number';
    if (!form.recordedAt) newErrors.recordedAt = 'Timestamp is required';
    if (new Date(form.recordedAt) > new Date()) newErrors.recordedAt = 'Timestamp cannot be in the future';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      await api.post('/ingest/manual', {
        deviceId: form.deviceId,
        kwh: parseFloat(form.kwh),
        energySource: form.energySource,
        recordedAt: new Date(form.recordedAt).toISOString(),
        notes: form.notes || undefined
      });
      addToast({ type: 'success', message: 'Reading saved.' });
      setForm({ deviceId: '', kwh: '', energySource: 'grid', recordedAt: new Date().toISOString().slice(0, 16), notes: '' });
    } catch (err) {
      const details = err.response?.data?.details;
      if (details) {
        setErrors(Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v[0]])));
      } else {
        addToast({ type: 'error', message: err.response?.data?.error || 'Failed to save reading' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Manual Data Entry" breadcrumbs={[{ label: 'Data Entry' }]} />
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center">
              <Zap size={20} className="text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Log Energy Reading</h2>
              <p className="text-xs text-text-secondary">Manually record a meter reading</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">Device *</label>
              <select value={form.deviceId} onChange={e => setForm({ ...form, deviceId: e.target.value })} className="w-full text-sm">
                <option value="">Select device...</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.building?.zone?.name} / {d.building?.name}
                  </option>
                ))}
              </select>
              {errors.deviceId && <p className="text-xs text-danger mt-1">{errors.deviceId}</p>}
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">Reading (kWh) *</label>
              <input type="number" step="0.0001" value={form.kwh} onChange={e => setForm({ ...form, kwh: e.target.value })}
                placeholder="0.0000" className="w-full text-sm" />
              {errors.kwh && <p className="text-xs text-danger mt-1">{errors.kwh}</p>}
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">Energy Source *</label>
              <select value={form.energySource} onChange={e => setForm({ ...form, energySource: e.target.value })} className="w-full text-sm">
                <option value="grid">Grid</option>
                <option value="solar">Solar</option>
                <option value="wind">Wind</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">Timestamp *</label>
              <input type="datetime-local" value={form.recordedAt} onChange={e => setForm({ ...form, recordedAt: e.target.value })}
                className="w-full text-sm" />
              {errors.recordedAt && <p className="text-xs text-danger mt-1">{errors.recordedAt}</p>}
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1.5 block">Notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3} className="w-full text-sm resize-none" placeholder="Additional notes..." maxLength={500} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Saving...' : <><Check size={16} /> Save Reading</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
