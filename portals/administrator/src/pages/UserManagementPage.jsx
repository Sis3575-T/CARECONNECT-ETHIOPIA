import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  X,
  Phone,
  Mail,
  Building2,
  Filter,
  Download,
  Eye,
  Key,
  ShieldAlert
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function UserManagementPage() {
  const { users, facilities, createUser, updateUser, toggleUserStatus } = useCareConnectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Health Centre Staff',
    facility: facilities[0]?.name || 'Yeka Health Centre',
    phone: '+251 9',
    permissions: ['create_referral', 'view_patients']
  });

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const name = u.fullName || u.name || '';
      const email = u.email || '';
      const role = u.role || '';
      const phone = u.phone || '';

      const matchSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm);

      const matchRole = selectedRole === 'All' || u.role === selectedRole;
      const matchStatus = selectedStatus === 'All' || u.status === selectedStatus;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, selectedRole, selectedStatus]);

  const handleOpenCreate = () => {
    setFormData({
      fullName: '',
      email: '',
      role: 'Health Centre Staff',
      facility: facilities[0]?.name || 'Yeka Health Centre',
      phone: '+251 9',
      permissions: ['create_referral', 'view_patients']
    });
    setIsCreateOpen(false);
    setTimeout(() => setIsCreateOpen(true), 10);
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName || user.name || '',
      email: user.email || '',
      role: user.role || 'Health Centre Staff',
      facility: user.facility || '',
      phone: user.phone || '+251 9',
      permissions: user.permissions || []
    });
    setIsEditOpen(true);
  };

  const handleOpenView = (user) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    await createUser({
      name: formData.fullName,
      fullName: formData.fullName,
      email: formData.email,
      role: formData.role,
      facility: formData.facility,
      phone: formData.phone,
      permissions: formData.permissions
    });

    setIsCreateOpen(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    await updateUser(selectedUser.id, {
      name: formData.fullName,
      fullName: formData.fullName,
      email: formData.email,
      role: formData.role,
      facility: formData.facility,
      phone: formData.phone,
      permissions: formData.permissions
    });

    setIsEditOpen(false);
  };

  const handleToggle = async (id) => {
    await toggleUserStatus(id);
  };

  const handleExportCSV = () => {
    const headers = ['User ID', 'Full Name', 'Email', 'Role', 'Facility', 'Phone', 'Status', 'Last Active'];
    const rows = filteredUsers.map(u => [
      u.id,
      `"${u.fullName || u.name}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${u.facility}"`,
      `"${u.phone || ''}"`,
      `"${u.status}"`,
      `"${u.lastLogin || u.lastActive || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careconnect_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            User Accounts & Roles (Section 9.C, FR-04)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authorized health workers, clinical staff, EMS coordinators, and platform access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-xl font-bold shadow-xs flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Role Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Total Accounts</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{users.length}</p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">
            {users.filter(u => u.status === 'Active').length} Active Users
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Health Centre Clinicians</span>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
            {users.filter(u => u.role === 'Health Centre Staff').length}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Referring Primary Centers</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Hospital Specialists</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {users.filter(u => u.role === 'Hospital Staff').length}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">Triage & Receiving Staff</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[11px]">Transport & Fleet</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {users.filter(u => u.role === 'Transport Coordinator').length}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">EMS Dispatch Coordinators</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by full name, email, role, phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="All">All Roles</option>
              <option value="Health Centre Staff">Health Centre Staff</option>
              <option value="Hospital Staff">Hospital Staff</option>
              <option value="Transport Coordinator">Transport Coordinator</option>
              <option value="System Administrator">System Administrator</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-5">User</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Affiliated Facility</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Account Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {filteredUsers.map((u) => {
              const displayName = u.fullName || u.name || 'Unnamed User';
              const isActive = u.status === 'Active';

              return (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {displayName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">{displayName}</span>
                        <span className="text-[11px] text-slate-400">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      u.role === 'System Administrator'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        : u.role === 'Hospital Staff'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : u.role === 'Transport Coordinator'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{u.facility || 'Central'}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                    {u.phone || '—'}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {u.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenView(u)}
                        title="View Details"
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Edit User"
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(u.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                          isActive
                            ? 'bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700 dark:bg-slate-700 dark:text-slate-300'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Authorized Healthcare User</h3>
              <button onClick={() => setIsCreateOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Dr. Dawit Mengistu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="dawit.mengistu@moh.gov.et"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Role Assignment</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Health Centre Staff">Health Centre Staff</option>
                    <option value="Hospital Staff">Hospital Staff</option>
                    <option value="Transport Coordinator">Transport Coordinator</option>
                    <option value="System Administrator">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Facility Affiliation</label>
                <select
                  value={formData.facility}
                  onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.name}>{f.name} ({f.type})</option>
                  ))}
                  <option value="Ministry of Health Head Office">Ministry of Health Head Office</option>
                  <option value="Central EMS Dispatch Command">Central EMS Dispatch Command</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#1e3a8a] text-white font-bold rounded-xl">Save & Provision User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit User Account: {selectedUser.id}</h3>
              <button onClick={() => setIsEditOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Role Assignment</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Health Centre Staff">Health Centre Staff</option>
                    <option value="Hospital Staff">Hospital Staff</option>
                    <option value="Transport Coordinator">Transport Coordinator</option>
                    <option value="System Administrator">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Facility Affiliation</label>
                <select
                  value={formData.facility}
                  onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.name}>{f.name} ({f.type})</option>
                  ))}
                  <option value="Ministry of Health Head Office">Ministry of Health Head Office</option>
                  <option value="Central EMS Dispatch Command">Central EMS Dispatch Command</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#1e3a8a] text-white font-bold rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {isViewOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">{selectedUser.id}</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">{selectedUser.fullName || selectedUser.name}</h3>
              </div>
              <button onClick={() => setIsViewOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Assigned Role:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.role}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Health Facility:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.facility}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Email Address:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUser.email}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedUser.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Account Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedUser.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {selectedUser.status}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5 text-[11px]">Enforced Permissions:</span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedUser.permissions || ['read_access']).map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono text-[10px]">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}