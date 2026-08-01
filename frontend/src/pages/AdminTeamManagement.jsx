import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminTeamManagement = () => {
  const [pbls, setPbls] = useState([]);
  const [selectedPbl, setSelectedPbl] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPbls = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get('/api/admin/pbl', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setPbls(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Interactions State
  const [showInteractions, setShowInteractions] = useState(false);
  const [interactionTeam, setInteractionTeam] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [interactionLoading, setInteractionLoading] = useState(false);

  const viewInteractions = async (team) => {
    setInteractionTeam(team);
    setShowInteractions(true);
    setInteractionLoading(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get(`/api/admin/team/${team.id}/interactions`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setInteractions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setInteractionLoading(false);
    }
  };

  const [autoFormLoading, setAutoFormLoading] = useState(false);
  
  const handleAutoFormTeams = async () => {
    if (!selectedPbl) return alert('Select a PBL first');
    if (!window.confirm('Are you sure? This will randomly assign all remaining unassigned students into teams of up to 4. Ensure the Team Formation Timeline is over.')) return;
    
    try {
      setAutoFormLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.post(`/api/admin/pbl/${selectedPbl}/auto-form-teams`, {}, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert(res.data.message);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to auto-form teams');
    } finally {
      setAutoFormLoading(false);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPblId, setCreatePblId] = useState('');
  const [createMembers, setCreateMembers] = useState([
    { rollNo: '', section: '' }
  ]);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState('');
  const [newMember, setNewMember] = useState({ rollNo: '', section: '' });

  useEffect(() => {
    fetchPbls();
  }, []);

  const fetchTeams = async () => {
    if (!selectedPbl) return;
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get(`/api/admin/teams/pbl/${selectedPbl}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setTeams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    if (selectedPbl) setCreatePblId(selectedPbl);
  }, [selectedPbl]);

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.delete(`/api/admin/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      fetchTeams();
    } catch (err) {
      alert("Error deleting team");
    }
  };

  const handleRemoveMember = async (teamId, studentId) => {
    if (!window.confirm("Are you sure you want to remove this member from the team?")) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.delete(`/api/admin/teams/${teamId}/members/${studentId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || "Error removing member");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post(`/api/admin/teams/${addMemberTeamId}/members`, newMember, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setShowAddMemberModal(false);
      setNewMember({ rollNo: '', section: '' });
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || "Error adding member");
    }
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...createMembers];
    updated[index][field] = value;
    setCreateMembers(updated);
  };

  const addMemberField = () => {
    if (createMembers.length < 4) {
      setCreateMembers([...createMembers, { rollNo: '', section: '' }]);
    }
  };

  const removeMemberField = (index) => {
    if (createMembers.length > 1) {
      const updated = [...createMembers];
      updated.splice(index, 1);
      setCreateMembers(updated);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createPblId) {
      return setCreateError('Please select a PBL subject first.');
    }
    
    // validate
    for (let m of createMembers) {
      if (!m.rollNo || !m.section) {
        return setCreateError('All roll numbers and sections must be filled.');
      }
    }

    try {
      setCreateLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post('/api/admin/teams', 
        { pblId: createPblId, members: createMembers },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      
      setShowCreateModal(false);
      setCreateMembers([
        { rollNo: '', section: '' }
      ]);
      if (selectedPbl === createPblId) {
        fetchTeams();
      } else {
        setSelectedPbl(createPblId);
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setCreateLoading(false);
    }
  };

  const [selectedTeamIds, setSelectedTeamIds] = useState([]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTeamIds(teams.map(t => t.id));
    } else {
      setSelectedTeamIds([]);
    }
  };

  const handleSelectTeam = (id) => {
    if (selectedTeamIds.includes(id)) {
      setSelectedTeamIds(selectedTeamIds.filter(tid => tid !== id));
    } else {
      setSelectedTeamIds([...selectedTeamIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    const confirmation = window.prompt(`Type 'DELETE' to confirm deletion of ${selectedTeamIds.length} selected team(s):`);
    if (confirmation !== 'DELETE' && confirmation !== 'delete') {
      if (confirmation !== null) alert("Deletion cancelled. You must type 'DELETE' to confirm.");
      return;
    }
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.post(`/api/admin/teams/bulk-delete`, 
        { teamIds: selectedTeamIds },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      alert(res.data.message);
      setSelectedTeamIds([]);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const handleFileUpload = (e) => {
    setUploadFile(e.target.files[0]);
  };

  const submitBulkUpload = async () => {
    if (!selectedPbl) return alert('Select a PBL first');
    if (!uploadFile) return alert('Please select an Excel file');
    
    const data = new FormData();
    data.append('file', uploadFile);

    try {
      setUploadLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.post(`/api/admin/pbl/${selectedPbl}/teams/bulk`, data, {
        headers: { 
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      let msg = res.data.message;
      if (res.data.skipped && res.data.skipped.length > 0) {
        msg += `\n\nSkipped Rows:\n${res.data.skipped.join('\n')}`;
      }
      alert(msg);
      
      setUploadFile(null);
      document.getElementById('teamUploadInput').value = '';
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Team Management</h2>
        <div className="flex flex-wrap gap-3 items-center">
          {selectedTeamIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
              Delete Selected ({selectedTeamIds.length})
            </button>
          )}
          
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <input 
              type="file" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileUpload}
              className="text-sm w-48 text-gray-700 dark:text-gray-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
              id="teamUploadInput"
            />
            <button 
              onClick={submitBulkUpload}
              disabled={!uploadFile || uploadLoading || !selectedPbl}
              className={`px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors ${
                !uploadFile || uploadLoading || !selectedPbl ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {uploadLoading ? 'Uploading...' : 'Upload Excel'}
            </button>
          </div>

          <button 
            onClick={handleAutoFormTeams}
            disabled={!selectedPbl || autoFormLoading}
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${
              !selectedPbl || autoFormLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}>
            {autoFormLoading ? 'Running...' : '⚡ Auto-Form Teams'}
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            + Create Team
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full md:w-auto">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select PBL</label>
            <select 
              value={selectedPbl} 
              onChange={(e) => { setSelectedPbl(e.target.value); setSelectedTeamIds([]); }}
              className="w-full md:w-1/2 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Select a PBL to view teams --</option>
              {pbls.map(p => (
                <option key={p.id} value={p.id}>{p.subject} ({p.subjectShort} - Sem {p.semester})</option>
              ))}
            </select>
          </div>
          {teams.length > 0 && (
            <div className="flex items-center gap-2 pb-2">
              <input 
                type="checkbox" 
                id="selectAll"
                checked={selectedTeamIds.length === teams.length}
                onChange={handleSelectAll}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 cursor-pointer"
              />
              <label htmlFor="selectAll" className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Select All Teams</label>
            </div>
          )}
        </div>

        {selectedPbl && (
          loading ? (
            <div className="text-center p-8 text-gray-500">Loading teams...</div>
          ) : teams.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-gray-500 border border-dashed border-gray-200">
              No teams formed yet for this PBL.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {teams.map(team => (
                  <div key={team.id} className={`border ${selectedTeamIds.includes(team.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'} rounded-xl p-5 shadow-sm hover:border-blue-300 transition-colors relative`}>
                    <div className="absolute top-4 right-4">
                      <input 
                        type="checkbox"
                        checked={selectedTeamIds.includes(team.id)}
                        onChange={() => handleSelectTeam(team.id)}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between items-start mb-4 pr-8">
                      <div>
                        <h4 className="text-lg font-bold text-primary">{team.teamIdFormatted}</h4>
                        <p className="text-xs text-gray-500 mt-1">Created: {new Date(team.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDeleteTeam(team.id)} className="text-gray-400 hover:text-red-500">🗑️</button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {team.members.map(m => (
                        <div key={m.id} className="flex items-center text-sm">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mr-2">
                            {m.student.user.name.charAt(0)}
                          </span>
                          <div>
                            <p className="text-gray-800 dark:text-gray-200 font-medium">{m.student.user.name} {team.leaderId === m.student.id && <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded ml-1">L</span>}</p>
                            <p className="text-xs text-gray-500">{m.student.enrollmentNumber} | Sec {m.student.section}</p>
                          </div>
                          {team.leaderId !== m.student.id && (
                            <button 
                              onClick={() => handleRemoveMember(team.id, m.student.id)} 
                              className="ml-auto text-red-500 hover:text-red-700 text-xs font-medium"
                              title="Remove Member"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mb-4 flex justify-between items-center">
                       <button onClick={() => viewInteractions(team)} className="text-xs text-orange-600 dark:text-orange-400 font-bold hover:underline">
                         👁️ View Visits
                       </button>
                       <button 
                         onClick={() => { setAddMemberTeamId(team.id); setShowAddMemberModal(true); }} 
                         className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                       >
                         + Add Member
                       </button>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between text-xs text-gray-500">
                      <span>Mentor: {team.mentor?.user?.name || 'None'}</span>
                      <span>Phase Evals: {team.phaseEvaluators ? team.phaseEvaluators.length : 0} Assigned</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Create Team Manually</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {createError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-800">
                  {createError}
                </div>
              )}
              
              <form id="create-team-form" onSubmit={handleCreateTeam} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Target PBL Subject</label>
                  <select 
                    value={createPblId} 
                    onChange={(e) => setCreatePblId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">-- Select PBL --</option>
                    {pbls.map(p => (
                      <option key={p.id} value={p.id}>{p.subject} ({p.subjectShort} - Sem {p.semester})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">Team Members</h4>
                  {createMembers.map((member, index) => (
                    <div key={index} className="flex gap-4 items-end bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {index === 0 ? 'Member 1 (Leader) Roll No' : `Member ${index + 1} Roll No`}
                        </label>
                        <input
                          type="text"
                          required
                          value={member.rollNo}
                          onChange={(e) => handleMemberChange(index, 'rollNo', e.target.value)}
                          placeholder="e.g. 2023001"
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Section</label>
                        <input
                          type="text"
                          required
                          value={member.section}
                          onChange={(e) => handleMemberChange(index, 'section', e.target.value.toUpperCase())}
                          placeholder="e.g. A"
                          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800"
                        />
                      </div>
                      {index >= 1 && (
                        <button type="button" onClick={() => removeMemberField(index)} className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {createMembers.length < 4 && (
                  <button type="button" onClick={addMemberField} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center">
                    + Add Member
                  </button>
                )}
              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="create-team-form"
                disabled={createLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center"
              >
                {createLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span> Creating...</>
                ) : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Add Team Member</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Roll Number</label>
                <input 
                  type="text" required 
                  value={newMember.rollNo} 
                  onChange={e => setNewMember({...newMember, rollNo: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 2023005"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Section</label>
                <input 
                  type="text" required 
                  value={newMember.section} 
                  onChange={e => setNewMember({...newMember, section: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. C"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddMemberModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactions Modal */}
      {showInteractions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="text-orange-500">📝</span> Team Interactions: {interactionTeam?.teamIdFormatted}
              </h3>
              <button onClick={() => setShowInteractions(false)} className="text-gray-500 hover:text-gray-700 font-bold">✕</button>
            </div>
            
            {interactionLoading ? (
              <p className="text-center text-gray-500 p-8">Loading interactions...</p>
            ) : interactions.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 italic">No mentor interactions logged for this team yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {interactions.map(int => (
                  <div key={int.id} className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 relative">
                    <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                      Visit #{int.visitNumber}
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 font-semibold">{new Date(int.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-xs text-gray-400 mt-1">Mentor: {int.mentor.user.name}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {int.studentRecords.map(rec => (
                        <div key={rec.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                          <p className="font-semibold text-sm flex justify-between items-center text-gray-800 dark:text-gray-200">
                            {rec.student.user.name} 
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${rec.isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {rec.isPresent ? 'Present' : 'Absent'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-100 dark:border-gray-600">
                            "{rec.remark || 'No remark'}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTeamManagement;
