import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, { withCredentials: true });
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

  const handleFileUpload = (e) => {
    setUploadFile(e.target.files[0]);
    setUploadError('');
    setUploadSuccess('');
  };

  const submitBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return setUploadError('Please select a file');
    
    const data = new FormData();
    data.append('file', uploadFile);

    try {
      setUploadLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/users/bulk`, data, { withCredentials: true });
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
      await axios.post(`${import.meta.env.VITE_API_URL}/api/users`, formData, { withCredentials: true });
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
        { withCredentials: true }
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
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/${id}`, { withCredentials: true });
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
        { withCredentials: true }
      );
      alert(res.data.message);
      setShowResetModal(false);
      setFormData({...formData, password: ''});
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Management</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          + Add User Manually
        </button>
      </div>

      {/* Bulk Upload Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Bulk Upload (Moodle Format CSV)</h2>
        <p className="text-sm text-gray-500 mb-4">CSV Columns required: username, firstname, lastname, email, course1, role1, password. (role1 must be 'student' or 'editingteacher')</p>
        
        {uploadError && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg">{uploadError}</div>}
        {uploadSuccess && <div className="p-3 mb-4 bg-green-100 text-green-700 rounded-lg">{uploadSuccess}</div>}

        <form onSubmit={submitBulkUpload} className="flex gap-4 items-center">
          <input 
            type="file" 
            id="fileUploadInput"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-400"
          />
          <button 
            type="submit" 
            disabled={uploadLoading || !uploadFile}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadLoading ? 'Uploading...' : 'Upload Users'}
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan="4" className="px-6 py-4 text-center dark:text-gray-300">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-4 text-center dark:text-gray-300">No users found</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
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

    </div>
  );
};

export default AdminUserManagement;
