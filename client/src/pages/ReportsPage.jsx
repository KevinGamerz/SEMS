import { useEffect, useState } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/appStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FileText, Download, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [zones, setZones] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    zoneId: '', dateFrom: '', dateTo: '', energySource: ''
  });

  useEffect(() => {
    api.get('/zones').then(({ data }) => setZones(data.zones));
    api.get('/reports').then(({ data }) => setReports(data.reports)).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!form.dateFrom || !form.dateTo) {
      addToast({ type: 'warning', message: 'Please select date range' });
      return;
    }
    setGenerating(true);
    try {
      const body = {
        dateFrom: new Date(form.dateFrom).toISOString(),
        dateTo: new Date(form.dateTo).toISOString(),
      };
      if (form.zoneId) body.zoneId = form.zoneId;
      if (form.energySource) body.energySource = form.energySource;

      const { data } = await api.post('/reports/generate', body);

      if (data.rowCount > 10000) {
        addToast({ type: 'warning', message: `Report contains ${data.rowCount.toLocaleString()} rows. Results may be truncated.` });
      }

      addToast({ type: 'success', message: 'Report generated' });
      // Fetch the report data
      const reportRes = await api.get(`/reports/${data.report.id}`);
      setActiveReport(data.report);
      setReportData(reportRes.data);

      // Refresh list
      const listRes = await api.get('/reports');
      setReports(listRes.data.reports);
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Generation failed' });
    } finally {
      setGenerating(false);
    }
  };

  const viewReport = async (report) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/${report.id}`);
      setActiveReport(report);
      setReportData(data);
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to load report' });
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!reportData || !activeReport) {
      addToast({ type: 'error', message: 'No report data available to export' });
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor(13, 115, 119); // Brand color #0D7377
      doc.text('SEMS Energy Report', 14, 22);
      
      // Subtitle / Info
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Zone: ${activeReport?.zone?.name || 'All Zones'}`, 14, 36);
      doc.text(`Period: ${new Date(activeReport.dateFrom).toLocaleDateString()} to ${new Date(activeReport.dateTo).toLocaleDateString()}`, 14, 42);
      
      // Summary
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Summary', 14, 55);
      
      doc.setFontSize(11);
      doc.text(`Total Energy (kWh): ${reportData.summary.totalKwh.toLocaleString()}`, 14, 63);
      doc.text(`Total Readings: ${reportData.summary.readingCount.toLocaleString()}`, 14, 69);
      
      const sourceKeys = Object.keys(reportData.summary.sourceBreakdown);
      if (sourceKeys.length > 0) {
        const sourceText = sourceKeys.map(k => `${k} (${Math.round(reportData.summary.sourceBreakdown[k])} kWh)`).join(', ');
        doc.text(`Sources: ${sourceText}`, 14, 75);
      }
      
      // Table Header and Body
      const tableData = reportData.readings.map(r => [
        new Date(r.recordedAt).toLocaleString(),
        r.device?.building?.zone?.name || '-',
        r.device?.name || '-',
        r.kwh.toFixed(2),
        r.energySource || '-'
      ]);
      
      autoTable(doc, {
        startY: 85,
        head: [['Date', 'Zone', 'Device', 'kWh', 'Source']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [13, 115, 119] },
        styles: { fontSize: 9 },
      });
      
      doc.save(`SEMS_Report_${activeReport.id}.pdf`);
      addToast({ type: 'success', message: 'PDF downloaded successfully' });
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast({ type: 'error', message: 'Failed to generate PDF' });
    }
  };

  return (
    <div>
      <Topbar title="Reports" breadcrumbs={[{ label: 'Reports' }]} />
      <div className="p-6 max-w-[1440px] mx-auto space-y-6">
        {/* Report Builder */}
        {user?.role !== 'auditor' && user?.role !== 'field_operator' && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Date From</label>
                <input type="date" value={form.dateFrom} onChange={e => setForm({ ...form, dateFrom: e.target.value })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Date To</label>
                <input type="date" value={form.dateTo} onChange={e => setForm({ ...form, dateTo: e.target.value })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Zone</label>
                <select value={form.zoneId} onChange={e => setForm({ ...form, zoneId: e.target.value })} className="w-full text-sm">
                  <option value="">All Zones</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Energy Source</label>
                <select value={form.energySource} onChange={e => setForm({ ...form, energySource: e.target.value })} className="w-full text-sm">
                  <option value="">All Sources</option>
                  <option value="grid">Grid</option>
                  <option value="solar">Solar</option>
                  <option value="wind">Wind</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleGenerate} disabled={generating}
                  className="w-full py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark disabled:opacity-50">
                  {generating ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Past Reports */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-secondary mb-3">Past Reports</h3>
            {reports.length === 0 ? (
              <div className="text-center py-6 text-text-secondary text-sm">No reports generated yet.</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {reports.map(r => (
                  <button key={r.id} onClick={() => viewReport(r)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      activeReport?.id === r.id ? 'border-brand bg-brand/5' : 'border-border hover:bg-surface-elevated'
                    }`}>
                    <div className="text-sm font-medium">{r.zone?.name || 'All Zones'}</div>
                    <div className="text-xs text-text-secondary">
                      {new Date(r.dateFrom).toLocaleDateString()} — {new Date(r.dateTo).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">{r.rowCount?.toLocaleString()} rows • by {r.user?.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Report View */}
          <div className="lg:col-span-2">
            {!reportData ? (
              <div className="bg-surface border border-border rounded-xl p-12 text-center">
                <FileText size={48} className="mx-auto mb-3 text-text-secondary" />
                <h3 className="text-lg font-semibold mb-1">Select or Generate a Report</h3>
                <p className="text-sm text-text-secondary">Choose filters and generate a report to view data.</p>
              </div>
            ) : loading ? (
              <div className="skeleton h-96 rounded-xl" />
            ) : reportData.summary.readingCount === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-12 text-center">
                <BarChart3 size={48} className="mx-auto mb-3 text-text-secondary" />
                <h3 className="text-lg font-semibold mb-1">No data for this range</h3>
                <p className="text-sm text-text-secondary">No data available for the selected date range and filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Report Summary</h3>
                    <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark">
                      <Download size={14} /> Export PDF
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{reportData.summary.totalKwh.toLocaleString()}</div>
                      <div className="text-xs text-text-secondary">Total kWh</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{reportData.summary.readingCount.toLocaleString()}</div>
                      <div className="text-xs text-text-secondary">Readings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{Object.keys(reportData.summary.sourceBreakdown).length}</div>
                      <div className="text-xs text-text-secondary">Energy Sources</div>
                    </div>
                  </div>
                </div>

                {/* Daily Chart */}
                {reportData.summary.dailyData?.length > 0 && (
                  <div className="bg-surface border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold mb-3">Daily Consumption</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={reportData.summary.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#243044', border: '1px solid #2D3F55', borderRadius: 8 }} />
                        <Bar dataKey="kwh" fill="#0D7377" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Data Table Preview */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold">Data Preview (first {Math.min(reportData.readings.length, 100)} rows)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-text-secondary">
                          <th className="text-left px-4 py-2">Date</th>
                          <th className="text-left px-4 py-2">Zone</th>
                          <th className="text-left px-4 py-2">Device</th>
                          <th className="text-right px-4 py-2">kWh</th>
                          <th className="text-left px-4 py-2">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.readings.slice(0, 25).map(r => (
                          <tr key={r.id} className="border-b border-border/30 hover:bg-surface-elevated/30">
                            <td className="px-4 py-2 text-xs">{new Date(r.recordedAt).toLocaleString()}</td>
                            <td className="px-4 py-2 text-xs">{r.device?.building?.zone?.name}</td>
                            <td className="px-4 py-2 text-xs">{r.device?.name}</td>
                            <td className="px-4 py-2 text-xs text-right font-mono">{r.kwh.toFixed(2)}</td>
                            <td className="px-4 py-2 text-xs">{r.energySource}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
