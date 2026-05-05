import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import api from '../../lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Zap, Leaf, AlertTriangle, DollarSign, Building2 } from 'lucide-react';

function KPICard({ icon: Icon, label, value, sub, color = 'brand', delay = '' }) {
  return (
    <div className={`glass border border-border rounded-xl p-5 card-animate hover-lift ${delay} relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-${color}/20 transition-colors`}></div>
      <div className="flex items-center gap-3 mb-3 relative z-10">
        <div className={`w-10 h-10 rounded-lg bg-${color}/15 flex items-center justify-center`}>
          <Icon size={20} className={`text-${color}`} />
        </div>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="text-3xl font-bold text-text-primary">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-1">{sub}</div>}
    </div>
  );
}

function ZoneCard({ zone, onClick, delay = '' }) {
  const healthColors = { healthy: 'bg-success', warning: 'bg-warning', critical: 'bg-danger' };
  return (
    <button
      onClick={onClick}
      className={`glass border border-border rounded-xl p-5 text-left hover:border-brand/40 hover-lift card-animate ${delay} group relative overflow-hidden`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary group-hover:text-brand transition-colors">{zone.name}</h3>
        <div className={`w-3 h-3 rounded-full ${healthColors[zone.health]}`} title={zone.health} />
      </div>
      <p className="text-xs text-text-secondary mb-3 line-clamp-2">{zone.description}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="text-text-secondary">
          <span className="font-medium text-text-primary">{zone.kwh.toLocaleString()}</span> kWh
        </div>
        <div className="text-text-secondary">
          <span className="font-medium text-text-primary">{zone.buildingCount}</span> buildings
        </div>
        <div className="text-text-secondary">
          <span className="font-medium text-text-primary">{zone.deviceCount}</span> devices
        </div>
        <div className="text-text-secondary">
          <span className={`font-medium ${zone.alertCount > 0 ? 'text-warning' : 'text-success'}`}>{zone.alertCount}</span> alerts
        </div>
      </div>
    </button>
  );
}

export default function CityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/city')
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <Topbar title="City Overview" breadcrumbs={[{ label: 'Dashboard' }, { label: 'City Overview' }]} />
      <div className="p-6 grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    </div>
  );

  if (!data) return null;

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass border border-border rounded-lg px-3 py-2 shadow-2xl backdrop-blur-xl">
        <div className="text-xs text-text-secondary mb-1 font-medium">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="text-sm" style={{ color: p.color }}>
            {p.name}: {p.value?.toLocaleString()} kWh
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Topbar title="City Overview" breadcrumbs={[{ label: 'Dashboard' }, { label: 'City Overview' }]} />
      <div className="p-6 max-w-[1440px] mx-auto space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={Zap} label="Total Consumption" value={`${data.kpis.totalKwh.toLocaleString()} kWh`} sub="Last 24 hours" delay="delay-1" />
          <KPICard icon={Leaf} label="Renewable Ratio" value={`${data.kpis.renewablePercent}%`} sub="Solar + Wind" color="success" delay="delay-2" />
          <KPICard icon={AlertTriangle} label="Active Alerts" value={data.kpis.activeAlerts} sub="Requires attention" color="warning" delay="delay-3" />
          <KPICard icon={DollarSign} label="Cost Estimate" value={`₹${data.kpis.costEstimate.toLocaleString()}`} sub={`@ ₹${data.kpis.tariffRate}/kWh`} color="info" delay="delay-4" />
        </div>

        {/* Zone Grid + Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zone Cards */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Building2 size={20} /> Zones
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.zones.map((zone, idx) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  onClick={() => navigate(`/dashboard/zone/${zone.id}`)}
                  delay={`delay-${(idx % 5) + 1}`}
                />
              ))}
            </div>
          </div>

          {/* 7-Day Consumption Trend */}
          <div className="glass border border-border rounded-xl p-5 card-animate delay-3">
            <h2 className="text-lg font-semibold text-text-primary mb-4">7-Day Consumption Trend</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={customTooltip} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="grid" stroke="#3B82F6" fillOpacity={1} fill="url(#colorGrid)" strokeWidth={2} name="Grid" />
                <Area type="monotone" dataKey="solar" stroke="#10B981" fillOpacity={1} fill="url(#colorSolar)" strokeWidth={2} name="Solar" />
                <Area type="monotone" dataKey="wind" stroke="#F59E0B" fillOpacity={1} fill="url(#colorWind)" strokeWidth={2} name="Wind" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latest Alerts */}
        <div className="glass border border-border rounded-xl p-5 card-animate delay-4">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Latest Alerts</h2>
          {data.latestAlerts?.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <AlertTriangle size={32} className="mx-auto mb-2 text-success" />
              No active alerts. System is operating normally.
            </div>
          ) : (
            <div className="space-y-2">
              {data.latestAlerts?.map(alert => {
                const sevColors = { critical: 'text-danger bg-danger/10', warning: 'text-warning bg-warning/10', info: 'text-info bg-info/10' };
                const statusColors = { new: 'bg-danger', acknowledged: 'bg-warning', resolved: 'bg-success' };
                return (
                  <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated/50 hover:bg-surface-elevated transition-colors">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sevColors[alert.severity]}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-sm text-text-primary flex-1">{alert.message}</span>
                    <span className="text-xs text-text-secondary">{alert.zone?.name}</span>
                    <span className={`w-2 h-2 rounded-full ${statusColors[alert.status]}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
