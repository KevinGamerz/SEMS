import { useEffect, useState } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/appStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import { BarChart3, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

export default function PredictionsPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [forecastDays, setForecastDays] = useState('7');
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [tariffRate, setTariffRate] = useState('');

  useEffect(() => {
    api.get('/zones').then(({ data }) => {
      setZones(data.zones);
      if (data.zones.length) setSelectedZone(data.zones[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedZone) return;
    setLoading(true);
    api.get(`/predictions?zoneId=${selectedZone}&days=${forecastDays}`)
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedZone, forecastDays]);

  const handleTariffSave = async () => {
    try {
      await api.patch('/predictions/tariff', { rate: parseFloat(tariffRate) });
      addToast({ type: 'success', message: 'Tariff rate updated' });
      setShowTariffModal(false);
      // Refresh predictions
      setLoading(true);
      const { data: newData } = await api.get(`/predictions?zoneId=${selectedZone}&days=${forecastDays}`);
      setData(newData);
      setLoading(false);
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    }
  };

  // Merge historical and forecast data for combined chart
  const chartData = data && !data.insufficient ? [
    ...data.historical.map(h => ({ date: h.date, historical: h.kwh })),
    ...(data.historical.length > 0 ? [{
      date: data.historical[data.historical.length - 1].date,
      historical: data.historical[data.historical.length - 1].kwh,
      forecast: data.historical[data.historical.length - 1].kwh,
      min: data.historical[data.historical.length - 1].kwh,
      max: data.historical[data.historical.length - 1].kwh,
    }] : []),
    ...data.forecast.map(f => ({ date: f.date, forecast: f.predicted, min: f.min, max: f.max })),
  ] : [];

  return (
    <div>
      <Topbar title="Predictions" breadcrumbs={[{ label: 'Predictions' }]} />
      <div className="p-6 max-w-[1440px] mx-auto space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="text-sm">
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
            <button onClick={() => setForecastDays('7')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${forecastDays === '7' ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              7-day
            </button>
            <button onClick={() => setForecastDays('30')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${forecastDays === '30' ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              30-day
            </button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton h-96 rounded-xl" />
        ) : data?.insufficient ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <BarChart3 size={48} className="mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-semibold mb-2">Not enough data to forecast</h3>
            <p className="text-sm text-text-secondary">
              At least 7 days of readings are required. Currently have {data.daysAvailable} day(s).
            </p>
          </div>
        ) : data ? (
          <>
            {/* Forecast Chart */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4">Consumption Forecast</h2>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#243044', border: '1px solid #2D3F55', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="max" stroke="transparent" fill="#3B82F6" fillOpacity={0.08} />
                  <Area type="monotone" dataKey="min" stroke="transparent" fill="#0A1628" fillOpacity={1} />
                  <Line type="monotone" dataKey="historical" stroke="#0D7377" strokeWidth={2} dot={false} name="Historical" />
                  <Line type="monotone" dataKey="forecast" stroke="#3B82F6" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Forecast" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-3 text-xs text-text-secondary">
                <span className="flex items-center gap-2"><span className="w-4 h-0.5 bg-brand inline-block" /> Historical</span>
                <span className="flex items-center gap-2"><span className="w-4 h-0.5 bg-info inline-block border-dashed" style={{ borderTop: '2px dashed #3B82F6' }} /> Forecast</span>
                <span className="flex items-center gap-2"><span className="w-4 h-2 bg-info/10 inline-block rounded" /> Confidence Band</span>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="text-sm text-text-secondary mb-1">Predicted Cost ({forecastDays} days)</div>
                <div className="text-3xl font-bold">₹{data.summary.predictedCost.toLocaleString()}</div>
                <div className={`text-sm mt-1 flex items-center gap-1 ${data.summary.changePercent > 0 ? 'text-danger' : 'text-success'}`}>
                  <TrendingUp size={14} />
                  {data.summary.changePercent > 0 ? '↑' : '↓'} {Math.abs(data.summary.changePercent)}% vs previous period
                </div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="text-sm text-text-secondary mb-1">Tariff Rate</div>
                <div className="text-3xl font-bold">₹{data.summary.tariffRate} <span className="text-lg text-text-secondary">/ kWh</span></div>
                {user?.role === 'super_admin' && (
                  <button onClick={() => { setTariffRate(String(data.summary.tariffRate)); setShowTariffModal(true); }}
                    className="text-sm text-brand hover:underline mt-2">Edit Rate</button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Tariff Modal */}
      {showTariffModal && (
        <div className="fixed inset-0 bg-navy/60 flex items-center justify-center z-50" onClick={() => setShowTariffModal(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Configure Tariff Rate</h3>
            <label className="text-sm text-text-secondary">Rate (₹/kWh)</label>
            <input type="number" step="0.01" value={tariffRate} onChange={e => setTariffRate(e.target.value)} className="w-full mt-1 mb-4" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowTariffModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-elevated">Cancel</button>
              <button onClick={handleTariffSave} className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
