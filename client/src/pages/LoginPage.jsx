import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const roleRedirects = {
    super_admin: '/dashboard/city',
    zone_manager: '/dashboard/zone',
    field_operator: '/dashboard/zone',
    auditor: '/reports',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.accessToken, data.refreshToken, data.user);
      navigate(roleRedirects[data.user.role] || '/dashboard/city');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Demo account quick-login
  const demoAccounts = [
    { label: 'Super Admin', email: 'admin@sems.gov' },
    { label: 'Zone Manager', email: 'zone1@sems.gov' },
    { label: 'Operator', email: 'operator1@sems.gov' },
    { label: 'Auditor', email: 'auditor@sems.gov' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg p-4 relative overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-info/20 rounded-full mix-blend-screen filter blur-3xl opacity-50"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/25">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">SEMS</h1>
            <p className="text-xs text-text-secondary">Sustainable Energy Monitoring</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-8 card-animate">
          <h2 className="text-xl font-semibold text-text-primary mb-1">Sign In</h2>
          <p className="text-sm text-text-secondary mb-6">Access your energy monitoring dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sems.gov"
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/20 text-white font-medium rounded-lg hover-lift disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-text-secondary mb-3">Quick Demo Login:</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(account => (
                <button
                  key={account.email}
                  onClick={() => { setEmail(account.email); setPassword('Admin@12345'); }}
                  className="text-xs py-1.5 px-2 bg-surface-elevated border border-border rounded-md hover:border-brand text-text-secondary hover:text-brand transition-all"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-text-secondary">
          Sustainable Energy Monitoring System v1.0 — District 1
        </p>
      </div>
    </div>
  );
}
