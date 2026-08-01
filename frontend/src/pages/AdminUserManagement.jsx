import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '', firstname: '', lastname: '', email: '', role1: 'student', course1: '', password: ''
  });

  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo'))?.token}` }
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, getAuthHeader());
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const [showMappingModal, setShowMappingModal] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    username: '', email: '', role1: '', firstname: '', lastname: '', password: '', semester: '', section: '', rollno: '', 
    course1: '', role2: '', course2: '', role3: '', course3: '', role4: '', course4: '', role5: '', course5: ''
  });

  const systemFields = [
    { key: 'username', label: 'Username (Moodle ID)', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'role1', label: 'Role 1', required: true },
    { key: 'course1', label: 'Course 1', required: false },
    { key: 'role2', label: 'Role 2', required: false },
    { key: 'course2', label: 'Course 2', required: false },
    { key: 'role3', label: 'Role 3', required: false },
    { key: 'course3', label: 'Course 3', required: false },
    { key: 'role4', label: 'Role 4', required: false },
    { key: 'course4', label: 'Course 4', required: false },
    { key: 'role5', label: 'Role 5', required: false },
    { key: 'course5', label: 'Course 5', required: false },
    { key: 'firstname', label: 'First Name', required: false },
    { key: 'lastname', label: 'Last Name', required: false },
    { key: 'password', label: 'Password', required: false },
    { key: 'semester', label: 'Semester', required: false },
    { key: 'section', label: 'Section', required: false },
    { key: 'rollno', label: 'University Roll No', required: false }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setUploadFile(file);
    setUploadError('');
    setUploadSuccess('');
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          setExcelHeaders(headers);
          setExcelData(data);
          
          // Auto-map if headers match exactly
          const initialMapping = { ...columnMapping };
          systemFields.forEach(field => {
            const match = headers.find(h => h.toLowerCase().replace(/\s+/g, '') === field.key.toLowerCase());
            if (match) initialMapping[field.key] = match;
          });
          setColumnMapping(initialMapping);
          setShowMappingModal(true);
        } else {
          setUploadError('The uploaded file is empty or invalid.');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const confirmMappingAndUpload = async () => {
    // Validate required fields
    if (!columnMapping.username || !columnMapping.email || !columnMapping.role1) {
      return alert('Username, Email, and Role fields are REQUIRED. Please map them to a column.');
    }
    
    // Transform data based on mapping, keeping all original fields
    const mappedData = excelData.map(row => {
      let newRow = { ...row }; // KEEP ALL original Excel fields
      Object.keys(columnMapping).forEach(sysField => {
        const excelCol = columnMapping[sysField];
        if (excelCol && row[excelCol] !== undefined) {
          newRow[sysField] = row[excelCol];
        }
      });
      return newRow;
    });

    try {
      setShowMappingModal(false);
      setUploadLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/users/bulk-json`, mappedData, getAuthHeader());
      setUploadSuccess(res.data.message);
      setUploadFile(null);
      document.getElementById('fileUploadInput').value = '';
      fetchUsers();
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/users`, formData, getAuthHeader());
      setShowAddModal(false);
      setFormData({ username: '', firstname: '', lastname: '', email: '', role1: 'student', course1: '', password: '' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/users/${selectedUser.id}`, 
        { name: formData.firstname, email: formData.email }, 
        getAuthHeader()
      );
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/${id}`, getAuthHeader());
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/users/${selectedUser.id}/reset-password`, 
        { newPassword: formData.password }, 
        getAuthHeader()
      );
      alert(res.data.message);
      setShowResetModal(false);
      setFormData({...formData, password: ''});
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleBulkDelete = async () => {
    const confirmation = window.prompt(`Type 'DELETE' to confirm deletion of ${selectedUserIds.length} selected user(s):`);
    if (confirmation !== 'DELETE' && confirmation !== 'delete') {
      if (confirmation !== null) alert("Deletion cancelled. You must type 'DELETE' to confirm.");
      return;
    }
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/users/bulk-delete`, 
        { userIds: selectedUserIds },
        getAuthHeader()
      );
      alert(res.data.message);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (id) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Management</h1>
        <div className="flex gap-3">
          {selectedUserIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete Selected ({selectedUserIds.length})
            </button>
          )}
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Add User Manually
          </button>
        </div>
      </div>

      {/* Bulk Upload Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Bulk Upload (Moodle Format CSV)</h2>
        <p className="text-sm text-gray-500 mb-4">CSV Columns required: username, firstname, lastname, email, course1, role1, password. (role1 must be 'student' or 'editingteacher')</p>
        
        {uploadError && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg">{uploadError}</div>}
        {uploadSuccess && <div className="p-3 mb-4 bg-green-100 text-green-700 rounded-lg">{uploadSuccess}</div>}

        <div className="flex gap-4 items-center">
          <input 
            type="file" 
            id="fileUploadInput"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-400"
          />
        </div>
      </div>

      {/* Users Table Controls */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <input 
                  type="checkbox" 
                  checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No / ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sem/Sec</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-4 text-center dark:text-gray-300">Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-4 text-center dark:text-gray-300">No users found</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input 
                      type="checkbox" 
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {user.studentProfile?.enrollmentNumber || user.facultyProfile?.moodleId || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {user.studentProfile ? `Sem ${user.studentProfile.semester} / Sec ${user.studentProfile.section}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'FACULTY' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setFormData({ firstname: user.name, email: user.email });
                        setShowEditModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mx-2"
                    >Edit</button>
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setFormData({ password: '' });
                        setShowResetModal(true);
                      }}
                      className="text-orange-600 hover:text-orange-900 mx-2"
                    >Reset Pass</button>
                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 mx-2">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Add New User</h2>
            <form onSubmit={handleManualAdd}>
              <div className="space-y-4">
                <input required type="text" placeholder="Username (Moodle ID / Enrollment)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                <input required type="text" placeholder="First Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} />
                <input type="text" placeholder="Last Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.lastname} onChange={e => setFormData({...formData, lastname: e.target.value})} />
                <input required type="email" placeholder="Email" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.role1} onChange={e => setFormData({...formData, role1: e.target.value})}>
                  <option value="student">Student</option>
                  <option value="editingteacher">Teacher</option>
                </select>
                <input type="text" placeholder="Course Short Name (Optional)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.course1} onChange={e => setFormData({...formData, course1: e.target.value})} />
                <input type="password" placeholder="Password (default: Pbl@1234)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Edit User</h2>
            <form onSubmit={handleEdit}>
              <div className="space-y-4">
                <input required type="text" placeholder="Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} />
                <input required type="email" placeholder="Email" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Reset Password (Syncs with Moodle)</h2>
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4">
                <input required type="password" placeholder="New Password" minLength="8" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowResetModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Column Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Map Excel Columns</h2>
            <p className="text-sm text-gray-500 mb-6">
              Match your Excel headers to the system's fields. Fields marked with <span className="text-red-500">*</span> are required.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemFields.map(field => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    value={columnMapping[field.key]}
                    onChange={(e) => setColumnMapping({...columnMapping, [field.key]: e.target.value})}
                  >
                    <option value="">-- Ignore / Not Provided --</option>
                    {excelHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-end gap-3 border-t dark:border-gray-700 pt-4">
              <button 
                type="button" 
                onClick={() => {
                  setShowMappingModal(false);
                  setUploadFile(null);
                  document.getElementById('fileUploadInput').value = '';
                }} 
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmMappingAndUpload}
                disabled={uploadLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {uploadLoading ? 'Uploading...' : 'Confirm & Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUserManagement;
