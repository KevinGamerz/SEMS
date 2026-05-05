import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastContainer from '../ui/ToastContainer';
import { useSidebarStore } from '../../stores/appStore';
import { useEffect } from 'react';
import api from '../../lib/api';
import { useAlertStore } from '../../stores/appStore';

export default function AppShell() {
  const { collapsed } = useSidebarStore();
  const { setAlertCount } = useAlertStore();

  // Poll alert count every 30 seconds
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const { data } = await api.get('/alerts/count');
        setAlertCount(data.count);
      } catch {}
    };

    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 30000);
    return () => clearInterval(interval);
  }, [setAlertCount]);

  return (
    <div className="min-h-screen bg-navy">
      <Sidebar />
      <div
        className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}
      >
        <Outlet />
      </div>
      <ToastContainer />
    </div>
  );
}
