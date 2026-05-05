import { useEffect, useState } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../lib/api';
import { useToastStore } from '../stores/appStore';
import { Users, Plus, Edit, Ban, CheckCircle, X } from 'lucide-react';

const roleLabels = { super_admin: 'Super Admin', zone_manager: 'Zone Manager', field_operator: 'Field Operator', auditor: 'Auditor' };
const roleColors = { super_admin: 'bg-brand/15 text-brand', zone_manager: 'bg-info/15 text-info', field_operator: 'bg-success/15 text-success', auditor: 'bg-warning/15 text-warning' };

export default function UserManagement() {
  const { addToast } = useToastStore();
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'field_operator', zoneIds: [] });

  const fetchUsers = () => {
    api.get('/users').then(({ data }) => setUsers(data.users)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    api.get('/zones').then(({ data }) => setZones(data.zones));
  }, []);

  const handleCreate = async () => {
    try {
      await api.post('/users', form);
      addToast({ type: 'success', message: 'User created' });
      setModal(null);
      setForm({ email: '', name: '', password: '', role: 'field_operator', zoneIds: [] });
      fetchUsers();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    }
  };

  const handleEdit = async () => {
    try {
      const updates = {};
      if (form.name) updates.name = form.name;
      if (form.role) updates.role = form.role;
      if (form.zoneIds) updates.zoneIds = form.zoneIds;
      await api.patch(`/users/${editUser.id}`, updates);
      addToast({ type: 'success', message: 'User updated' });
      setModal(null);
      fetchUsers();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    }
  };

  const handleDisable = async (userId) => {
    if (!confirm('Disable this user? Their session will be invalidated.')) return;
    try {
      await api.delete(`/users/${userId}`);
      addToast({ type: 'success', message: 'User disabled' });
      fetchUsers();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    }
  };

  const handleEnable = async (userId) => {
    if (!confirm('Enable this user? They will be able to log in again.')) return;
    try {
      await api.patch(`/users/${userId}`, { status: 'active' });
      addToast({ type: 'success', message: 'User enabled' });
      fetchUsers();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed' });
    }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      name: user.name,
      role: user.role,
      zoneIds: user.zoneAssignments?.map(za => za.zone?.id || za.zoneId) || [],
    });
    setModal('edit');
  };

  const toggleZone = (zoneId) => {
    setForm(f => ({
      ...f,
      zoneIds: f.zoneIds.includes(zoneId) ? f.zoneIds.filter(id => id !== zoneId) : [...f.zoneIds, zoneId]
    }));
  };

  return (
    <div>
      <Topbar title="User Management" breadcrumbs={[{ label: 'Admin' }, { label: 'Users' }]} />
      <div className="p-6 max-w-[1440px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">{users.length} users</div>
          <button onClick={() => { setForm({ email: '', name: '', password: '', role: 'field_operator', zoneIds: [] }); setModal('create'); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark">
            <Plus size={16} /> Add User
          </button>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Zones</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-surface-elevated/30">
                  <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary font-mono">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${roleColors[u.role]}`}>{roleLabels[u.role]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary hidden md:table-cell">
                    {u.zoneAssignments?.map(za => za.zone?.name).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${u.status === 'active' ? 'text-success' : 'text-danger'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} className="p-1 hover:bg-surface-elevated rounded" title="Edit">
                        <Edit size={14} className="text-text-secondary" />
                      </button>
                      {u.status === 'active' ? (
                        <button onClick={() => handleDisable(u.id)} className="p-1 hover:bg-surface-elevated rounded" title="Disable">
                          <Ban size={14} className="text-danger" />
                        </button>
                      ) : (
                        <button onClick={() => handleEnable(u.id)} className="p-1 hover:bg-surface-elevated rounded" title="Enable">
                          <CheckCircle size={14} className="text-success" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-navy/60 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{modal === 'create' ? 'Add User' : 'Edit User'}</h3>
              <button onClick={() => setModal(null)}><X size={20} className="text-text-secondary" /></button>
            </div>
            <div className="space-y-4">
              {modal === 'create' && (
                <>
                  <div>
                    <label className="text-sm text-text-secondary mb-1 block">Email</label>
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary mb-1 block">Password</label>
                    <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full text-sm" />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full text-sm">
                  <option value="super_admin">Super Admin</option>
                  <option value="zone_manager">Zone Manager</option>
                  <option value="field_operator">Field Operator</option>
                  <option value="auditor">Auditor</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Zone Assignments</label>
                <div className="space-y-1">
                  {zones.map(z => (
                    <label key={z.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.zoneIds.includes(z.id)} onChange={() => toggleZone(z.id)} className="w-4 h-4 accent-brand" />
                      {z.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-elevated">Cancel</button>
                <button onClick={modal === 'create' ? handleCreate : handleEdit}
                  className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark">
                  {modal === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
