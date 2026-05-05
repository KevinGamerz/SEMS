import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Zap, Building2, Cpu, AlertTriangle, Leaf } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

export default function ZoneDashboard() {
  const { zoneId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeZoneId, setActiveZoneId] = useState(zoneId);

  useEffect(() => {
    // If no zoneId in URL, use first assigned zone
    if (!activeZoneId && user?.zoneIds?.length) {
      setActiveZoneId(user.zoneIds[0]);
      return;
    }
    if (!activeZoneId) {
      // Fetch zones list for super admin
      api.get('/zones').then(({ data }) => {
        if (data.zones?.length) setActiveZoneId(data.zones[0].id);
      });
      return;
    }

    setLoading(true);
    api.get(`/dashboard/zone/${activeZoneId}`)
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeZoneId, user]);

  if (loading) return (
    <div>
      <Topbar title="Zone Dashboard" breadcrumbs={[{ label: 'Dashboard' }, { label: 'Zone' }]} />
      <div className="p-6 grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    </div>
  );
  if (!data) return null;

  const pieData = [
    { name: 'Grid', value: data.energySources.grid },
    { name: 'Solar', value: data.energySources.solar },
    { name: 'Wind', value: data.energySources.wind },
  ].filter(d => d.value > 0);

  const healthColors = { healthy: 'bg-success', warning: 'bg-warning', critical: 'bg-danger' };

  return (
    <div>
      <Topbar
        title={data.zone.name}
        breadcrumbs={[
          { label: 'Dashboard', to: user?.role === 'super_admin' ? '/dashboard/city' : undefined },
          { label: data.zone.name }
        ]}
      />
      <div className="p-6 max-w-[1440px] mx-auto space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass border border-border rounded-xl p-5 card-animate delay-1 hover-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand/20 transition-colors"></div>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-2 relative z-10"><Zap size={16} /> Zone Consumption</div>
            <div className="text-3xl font-bold relative z-10">{data.kpis.zoneKwh.toLocaleString()} <span className="text-lg text-text-secondary">kWh</span></div>
          </div>
          <div className="glass border border-border rounded-xl p-5 card-animate delay-2 hover-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-info/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-info/20 transition-colors"></div>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-2 relative z-10"><Building2 size={16} /> Buildings Active</div>
            <div className="text-3xl font-bold relative z-10">{data.kpis.buildingsActive}</div>
          </div>
          <div className="glass border border-border rounded-xl p-5 card-animate delay-3 hover-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-warning/20 transition-colors"></div>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-2 relative z-10"><AlertTriangle size={16} /> Active Alerts</div>
            <div className={`text-3xl font-bold relative z-10 ${data.kpis.activeAlerts > 0 ? 'text-warning' : 'text-success'}`}>{data.kpis.activeAlerts}</div>
          </div>
          <div className="glass border border-border rounded-xl p-5 card-animate delay-4 hover-lift relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-success/20 transition-colors"></div>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-2 relative z-10"><Leaf size={16} /> Renewable</div>
            <div className="text-3xl font-bold text-success relative z-10">{data.kpis.renewableKwh.toLocaleString()} <span className="text-lg text-text-secondary">kWh</span></div>
          </div>
        </div>

        {/* Building Grid */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Buildings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.buildings.map((building, idx) => (
              <button
                key={building.id}
                onClick={() => navigate(`/dashboard/zone/${activeZoneId}/building/${building.id}`)}
                className={`glass border border-border rounded-xl p-5 text-left hover:border-brand/40 hover-lift transition-all card-animate delay-${(idx % 5) + 1} group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-text-primary group-hover:text-brand transition-colors">{building.name}</h3>
                  <div className={`w-2.5 h-2.5 rounded-full ${healthColors[building.health]}`} />
                </div>
                <p className="text-xs text-text-secondary mb-3">{building.address}</p>
                <div className="flex gap-4 text-xs text-text-secondary">
                  <span><strong className="text-text-primary">{building.kwh.toLocaleString()}</strong> kWh</span>
                  <span><strong className="text-text-primary">{building.deviceCount}</strong> devices</span>
                  <span><strong className="text-success">{building.onlineDevices}</strong> online</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Trend + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass border border-border rounded-xl p-5 card-animate delay-3">
            <h2 className="text-lg font-semibold text-text-primary mb-4">7-Day Zone Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D7377" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0D7377" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1A2332', border: '1px solid #2D3F55', borderRadius: 8, backdropFilter: 'blur(10px)' }} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Area type="monotone" dataKey="kwh" stroke="#0D7377" fill="url(#colorKwh)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass border border-border rounded-xl p-5 card-animate delay-4">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Energy Source Breakdown</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1A2332', border: '1px solid #2D3F55', borderRadius: 8, backdropFilter: 'blur(10px)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-text-secondary text-sm">No energy source data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
