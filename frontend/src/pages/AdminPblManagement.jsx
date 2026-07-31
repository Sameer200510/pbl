import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const AdminPblManagement = () => {
  const [pbls, setPbls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    subjectShort: '',
    semester: 3,
    session: '',
    moodleCourseId: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Timeline Modal State
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedPbl, setSelectedPbl] = useState(null);
  const [timelineData, setTimelineData] = useState({ start: '', end: '' });

  const fetchPbls = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get('/api/admin/pbl', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setPbls(res.data);
    } catch (err) {
      console.error('Failed to fetch PBLs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPbls();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (isEditing) {
        await axios.put(`/api/admin/pbl/${editId}`, formData, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
      } else {
        await axios.post('/api/admin/pbl', formData, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
      }
      setShowModal(false);
      setIsEditing(false);
      setEditId(null);
      setFormData({ subject: '', subjectShort: '', semester: 3, session: '', moodleCourseId: '' });
      fetchPbls();
    } catch (err) {
      console.error('Failed to save PBL', err);
      alert(err.response?.data?.message || 'Failed to save PBL');
    }
  };

  const openEditModal = (pbl) => {
    setIsEditing(true);
    setEditId(pbl.id);
    setFormData({
      subject: pbl.subject,
      subjectShort: pbl.subjectShort,
      semester: pbl.semester,
      session: pbl.session,
      moodleCourseId: pbl.moodleCourseId || ''
    });
    setShowModal(true);
  };


  const handleDeletePbl = async (id, subject) => {
    if (!window.confirm(`Are you SURE you want to completely delete the PBL "${subject}"?\n\nWARNING: This will permanently erase all associated phases, teams, submissions, and grades!`)) {
      return;
    }
    
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.delete(`/api/admin/pbl/hard/${id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      fetchPbls();
      alert('PBL successfully deleted.');
    } catch (err) {
      console.error('Failed to delete PBL', err);
      alert(err.response?.data?.message || 'Failed to delete PBL');
    }
  };

  const openTimelineModal = (pbl) => {
    setSelectedPbl(pbl);
    setTimelineData({
      start: pbl.teamFormationStart ? new Date(pbl.teamFormationStart) : null,
      end: pbl.teamFormationEnd ? new Date(pbl.teamFormationEnd) : null
    });
    setShowTimelineModal(true);
  };

  const handleSaveTimeline = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post(`/api/admin/pbl/${selectedPbl.id}/timeline`, {
        start: timelineData.start ? timelineData.start.toISOString() : null,
        end: timelineData.end ? timelineData.end.toISOString() : null
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert('Timeline updated successfully!');
      setShowTimelineModal(false);
      fetchPbls();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating timeline');
    }
  };

  return (
    <div className="space-y-6 fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">PBL Subjects</h2>
          <button 
            onClick={() => {
              setIsEditing(false);
              setEditId(null);
              setFormData({ subject: '', subjectShort: '', semester: 3, session: '', moodleCourseId: '' });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow flex items-center gap-2"
          >
            <span>+ Add New Subject</span>
          </button>
        </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1c1f58] text-white text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold rounded-tl-lg">Subject</th>
                <th className="p-4 font-semibold">Code</th>
                <th className="p-4 font-semibold">Semester</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : pbls.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No PBLs found. Create one above!</td></tr>
              ) : (
                Object.entries(
                  pbls.reduce((acc, pbl) => {
                    const session = pbl.session || '2024-2025';
                    if (!acc[session]) acc[session] = [];
                    acc[session].push(pbl);
                    return acc;
                  }, {})
                ).map(([session, sessionPbls]) => (
                  <React.Fragment key={session}>
                    <tr className="bg-gray-100 dark:bg-gray-700/50">
                      <td colSpan="6" className="p-3 font-bold text-gray-800 dark:text-gray-200">
                        Session: {session}
                      </td>
                    </tr>
                    {sessionPbls.map((pbl) => (
                      <tr key={pbl.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors group">
                        <td className="p-4">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{pbl.subject}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                            {pbl.subjectShort}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">Semester {pbl.semester}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            !pbl.isArchived 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {!pbl.isArchived ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openEditModal(pbl)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" 
                              title="Edit PBL"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => openTimelineModal(pbl)}
                              className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors" 
                              title="Set Timeline"
                            >
                              ⏳ Set Timeline
                            </button>
                            <button 
                              onClick={() => handleDeletePbl(pbl.id, pbl.subject)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" 
                              title="Delete PBL Permanently"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit PBL Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {isEditing ? 'Edit PBL Subject' : 'Create New PBL'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject Name</label>
                <input 
                  type="text" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Operating Systems"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject Code / Short</label>
                <input 
                  type="text" required value={formData.subjectShort} onChange={e => setFormData({...formData, subjectShort: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. OS"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                <input 
                  type="number" required min="1" max="8" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Session</label>
                <input 
                  type="text" required value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 2024-2025"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Moodle Course ID (Optional)</label>
                <input 
                  type="text" value={formData.moodleCourseId} onChange={e => setFormData({...formData, moodleCourseId: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 123"
                />
                <p className="text-xs text-gray-500 mt-1">If provided, students will be automatically enrolled when they form a team.</p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => {
                  setShowModal(false);
                  setIsEditing(false);
                  setEditId(null);
                }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {isEditing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {showTimelineModal && selectedPbl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Manage Team Formation Timeline: {selectedPbl.subject}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date & Time</label>
                <DatePicker
                  selected={timelineData.start}
                  onChange={(date) => setTimelineData({...timelineData, start: date})}
                  showTimeSelect
                  timeFormat="hh:mm aa"
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  placeholderText="Select Start Date and Time"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date & Time</label>
                <DatePicker
                  selected={timelineData.end}
                  onChange={(date) => setTimelineData({...timelineData, end: date})}
                  showTimeSelect
                  timeFormat="hh:mm aa"
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  placeholderText="Select End Date and Time"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-8">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Phase timeline management is handled through Moodle assignments.
              </span>
              <div className="flex gap-3">
                <button onClick={() => setShowTimelineModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={handleSaveTimeline} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Timeline</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPblManagement;
