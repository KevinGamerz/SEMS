import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/appStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Cpu, Power, AlertTriangle, Clock } from 'lucide-react';

export default function BuildingDetail() {
  const { zoneId, buildingId } = useParams();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const fetchBuilding = () => {
    api.get(`/buildings/${buildingId}`)
      .then(({ data }) => setBuilding(data.building))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBuilding(); }, [buildingId]);

  const handleToggle = async (device) => {
    if (device.status === 'stale') {
      addToast({ type: 'warning', message: 'Device is not responding. Cannot send command.' });
      return;
    }

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
      fetchBuilding();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed to toggle device' });
    } finally {
      setToggling(null);
    }
  };

  if (loading) return (
    <div>
      <Topbar title="Building Detail" breadcrumbs={[{ label: 'Dashboard' }, { label: 'Building' }]} />
      <div className="p-6"><div className="skeleton h-96 rounded-xl" /></div>
    </div>
  );
  if (!building) return null;

  const statusIcons = { online: '🟢', controlled_off: '🔴', stale: '🟡' };
  const statusLabels = { online: 'Online', controlled_off: 'Controlled Off', stale: 'Stale' };

  return (
    <div>
      <Topbar
        title={building.name}
        breadcrumbs={[
          { label: 'Dashboard', to: user?.role === 'super_admin' ? '/dashboard/city' : `/dashboard/zone/${zoneId}` },
          { label: building.zone?.name, to: `/dashboard/zone/${zoneId}` },
          { label: building.name }
        ]}
      />
      <div className="p-6 max-w-[1440px] mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-xl font-bold">{building.name}</h2>
          <span className="text-sm text-text-secondary">{building.address}</span>
        </div>

        {/* Device Cards Grid */}
        <h3 className="text-lg font-semibold flex items-center gap-2"><Cpu size={20} /> Devices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {building.devices?.map(device => (
            <div key={device.id} className="bg-surface border border-border rounded-xl p-5 card-animate">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{statusIcons[device.status]}</span>
                  <h4 className="font-semibold text-text-primary">{device.name}</h4>
                </div>
                {device.impactLevel === 'high' && (
                  <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded">HIGH IMPACT</span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-text-secondary mb-4">
                <span className="flex items-center gap-1"><Cpu size={12} /> {device.type}</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${device.status === 'online' ? 'text-success' : device.status === 'stale' ? 'text-warning' : 'text-danger'}`}>
                  {statusLabels[device.status]}
                </span>

                {user?.role !== 'auditor' && (
                  <button
                    onClick={() => handleToggle(device)}
                    disabled={device.status === 'stale' || toggling === device.id}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      device.status === 'online' ? 'bg-success' : device.status === 'stale' ? 'bg-border cursor-not-allowed' : 'bg-border'
                    }`}
                    title={device.status === 'stale' ? 'Device is not responding. Cannot send command.' : ''}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      device.status === 'online' ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                )}
              </div>

              {/* Mini trend from recent readings */}
              {device.readings?.length > 2 && (
                <div className="mt-4 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={device.readings.slice().reverse()}>
                      <Line type="monotone" dataKey="kwh" stroke="#0D7377" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
