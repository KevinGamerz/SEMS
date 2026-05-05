import { useEffect, useState } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/appStore';
import { Cpu, Power, Plus, X } from 'lucide-react';

export default function DevicesPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [filters, setFilters] = useState({ status: '', type: '' });

  const [modalOpen, setModalOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'light', impactLevel: 'low', zoneId: '', buildingId: '' });
  const [creating, setCreating] = useState(false);

  const fetchDevices = () => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.type) params.set('type', filters.type);

    api.get(`/devices?${params}`)
      .then(({ data }) => setDevices(data.devices))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchPending = () => {
    if (user?.role === 'super_admin' || user?.role === 'zone_manager') {
      api.get('/devices/control-requests/pending')
        .then(({ data }) => setPendingRequests(data.requests))
        .catch(() => {});
    }
  };

  useEffect(() => { fetchDevices(); fetchPending(); }, [filters]);

  const fetchZones = () => {
    api.get('/zones').then(({ data }) => {
      setZones(data.zones);
      if (data.zones.length > 0 && !form.zoneId) {
        setForm(f => ({ ...f, zoneId: data.zones[0].id }));
      }
    }).catch(console.error);
  };

  useEffect(() => {
    if (modalOpen && zones.length === 0) fetchZones();
  }, [modalOpen]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post('/devices', form);
      addToast({ type: 'success', message: 'Device created successfully' });
      setModalOpen(false);
      setForm({ name: '', type: 'light', impactLevel: 'low', zoneId: '', buildingId: '' });
      fetchDevices();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed to create device' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (device) => {
    if (device.status === 'stale') return;
    const isHighImpact = device.impactLevel === 'high' && user?.role === 'field_operator';
    setToggling(device.id);
    try {
      if (isHighImpact) {
        await api.post(`/devices/${device.id}/request-control`);
        addToast({ type: 'info', message: 'Approval request sent to Zone Manager' });
      } else {
        await api.patch(`/devices/${device.id}/toggle`);
        addToast({ type: 'success', message: 'Command sent ✓' });
      }
      fetchDevices();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    } finally {
      setToggling(null);
    }
  };

  const handleReview = async (requestId, action) => {
    try {
      await api.patch(`/devices/control-requests/${requestId}/review`, { action });
      addToast({ type: 'success', message: `Request ${action}` });
      fetchPending();
      fetchDevices();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    }
  };

  const statusIcons = { online: '🟢', controlled_off: '🔴', stale: '🟡' };

  return (
    <div>
      <Topbar title="Devices" breadcrumbs={[{ label: 'Devices' }]} />
      <div className="p-6 max-w-[1440px] mx-auto space-y-6">
        {/* Pending Requests Banner */}
        {pendingRequests.length > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-warning mb-3">Pending Approval Requests ({pendingRequests.length})</h3>
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 bg-surface rounded-lg p-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{req.device?.name}</span>
                    <span className="text-xs text-text-secondary ml-2">
                      {req.device?.building?.zone?.name} → {req.requestedState.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-text-secondary ml-2">by {req.requester?.name}</span>
                  </div>
                  <button onClick={() => handleReview(req.id, 'approved')} className="px-3 py-1 text-xs bg-success text-navy rounded font-semibold">Approve</button>
                  <button onClick={() => handleReview(req.id, 'rejected')} className="px-3 py-1 text-xs bg-danger text-white rounded font-semibold">Reject</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="text-sm">
            <option value="">All Status</option>
            <option value="online">Online</option>
            <option value="controlled_off">Controlled Off</option>
            <option value="stale">Stale</option>
          </select>
          <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="text-sm">
            <option value="">All Types</option>
            <option value="light">Light</option>
            <option value="hvac">HVAC</option>
            <option value="street_lamp">Street Lamp</option>
            <option value="smart_meter">Smart Meter</option>
            <option value="solar_inverter">Solar Inverter</option>
            <option value="wind_inverter">Wind Inverter</option>
          </select>
          <span className="text-sm text-text-secondary ml-auto mr-2">{devices.length} devices</span>
          {(user?.role === 'super_admin' || user?.role === 'zone_manager') && (
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark">
              <Plus size={16} /> Add Device
            </button>
          )}
        </div>

        {/* Device Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map(device => (
            <div key={device.id} className="bg-surface border border-border rounded-xl p-5 card-animate">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{statusIcons[device.status]}</span>
                  <h4 className="font-semibold text-sm">{device.name}</h4>
                </div>
                {device.impactLevel === 'high' && (
                  <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded">HIGH</span>
                )}
              </div>
              <div className="text-xs text-text-secondary mb-3">
                {device.building?.zone?.name} → {device.building?.name}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-secondary">{device.type}</span>
                {user?.role !== 'auditor' && (
                  <button
                    onClick={() => handleToggle(device)}
                    disabled={device.status === 'stale' || toggling === device.id}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      device.status === 'online' ? 'bg-success' : device.status === 'stale' ? 'bg-border cursor-not-allowed' : 'bg-border'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      device.status === 'online' ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Device Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-navy/60 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Device</h3>
              <button onClick={() => setModalOpen(false)}><X size={20} className="text-text-secondary" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Device Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full text-sm" placeholder="e.g. Zone A - Lights" />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full text-sm">
                  <option value="light">Light</option>
                  <option value="hvac">HVAC</option>
                  <option value="street_lamp">Street Lamp</option>
                  <option value="smart_meter">Smart Meter</option>
                  <option value="solar_inverter">Solar Inverter</option>
                  <option value="wind_inverter">Wind Inverter</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Impact Level</label>
                <select value={form.impactLevel} onChange={e => setForm({ ...form, impactLevel: e.target.value })} className="w-full text-sm">
                  <option value="low">Low (Direct Toggle)</option>
                  <option value="high">High (Requires Approval)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Zone</label>
                <select value={form.zoneId} onChange={e => setForm({ ...form, zoneId: e.target.value, buildingId: '' })} className="w-full text-sm">
                  <option value="">Select Zone</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Building</label>
                <select value={form.buildingId} onChange={e => setForm({ ...form, buildingId: e.target.value })} className="w-full text-sm" disabled={!form.zoneId}>
                  <option value="">Select Building</option>
                  {zones.find(z => z.id === form.zoneId)?.buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-elevated">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !form.name || !form.buildingId}
                  className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Device'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
