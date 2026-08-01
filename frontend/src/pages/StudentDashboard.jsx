import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const StudentDashboard = () => {
  const [teams, setTeams] = useState([]);
  const [pbls, setPbls] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingTeam, setViewingTeam] = useState(null); // The team currently being viewed

  // Create Team Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPbl, setSelectedPbl] = useState(null);
  const [membersData, setMembersData] = useState([
    { rollNo: '', section: '', name: '', email: '', isFetched: false },
    { rollNo: '', section: '', name: '', email: '', isFetched: false },
    { rollNo: '', section: '', name: '', email: '', isFetched: false },
    { rollNo: '', section: '', name: '', email: '', isFetched: false }
  ]);
  const [customData, setCustomData] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [inviteData, setInviteData] = useState({ rollNo: '', section: '', name: '', email: '', isFetched: false });
  const [showInviteForm, setShowInviteForm] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const [teamRes, pblsRes, invRes] = await Promise.all([
        axios.get('/api/student/team/my-team', { headers: { Authorization: `Bearer ${userInfo.token}` } }),
        axios.get('/api/student/pbls', { headers: { Authorization: `Bearer ${userInfo.token}` } }),
        axios.get('/api/student/invitations', { headers: { Authorization: `Bearer ${userInfo.token}` } })
      ]);
      setTeams(teamRes.data || []);
      
      // The API now returns { pbls, moodleDebug }, handle it properly
      const pblData = Array.isArray(pblsRes.data) ? pblsRes.data : pblsRes.data.pbls || [];
      setPbls(pblData);
      
      if (pblsRes.data && pblsRes.data.moodleDebug) {
        console.log("Moodle Debug Info:", pblsRes.data.moodleDebug);
      }

      setInvitations(invRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading your dashboard...</div>;
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      
      const payload = {
        pblId: selectedPbl.id,
        members: membersData.filter(m => m.rollNo).map(m => ({
          rollNo: m.rollNo,
          section: m.section,
          name: m.name,
          email: m.email
        }))
      };

      await axios.post('/api/student/team', payload, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      
      setShowCreateModal(false);
      setMembersData([
        { rollNo: '', section: '', name: '', email: '', isFetched: false },
        { rollNo: '', section: '', name: '', email: '', isFetched: false },
        { rollNo: '', section: '', name: '', email: '', isFetched: false },
        { rollNo: '', section: '', name: '', email: '', isFetched: false }
      ]);
      fetchData(); // Refresh the list
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRollNoBlur = async (idx, rollNo) => {
    if (!rollNo) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get(`/api/student/by-roll/${rollNo}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      const newArr = [...membersData];
      newArr[idx].name = res.data.name;
      newArr[idx].email = res.data.email;
      newArr[idx].section = res.data.section;
      newArr[idx].isFetched = true;
      setMembersData(newArr);
    } catch (err) {
      const newArr = [...membersData];
      newArr[idx].isFetched = false;
      setMembersData(newArr);
      console.log('Student not found for roll no:', rollNo);
    }
  };

  const respondToInvitation = async (teamId, action) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post(`/api/student/invitations/${teamId}/respond`, { action }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action.toLowerCase()} invitation`);
    }
  };

  const removeMember = async (teamId, studentId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.delete(`/api/student/team/${teamId}/member/${studentId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      fetchData();
      if (viewingTeam && viewingTeam.id === teamId) {
        setViewingTeam(prev => ({
          ...prev,
          members: prev.members.filter(m => m.studentId !== studentId)
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };


  
  const handleInviteBlur = async (rollNo) => {
    if (!rollNo) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get(`/api/student/by-roll/${rollNo}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setInviteData(prev => ({ ...prev, name: res.data.name, email: res.data.email, section: res.data.section, isFetched: true }));
    } catch (err) {
      setInviteData(prev => ({ ...prev, isFetched: false }));
    }
  };

  const handleInviteMember = async (teamId, e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post('/api/student/team/invite', {
        teamId, ...inviteData
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setInviteData({ rollNo: '', section: '', name: '', email: '', isFetched: false });
      setShowInviteForm(false);
      fetchData();
      setViewingTeam(null); // Simple way to refresh viewing team
      alert('Member invited successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to invite member');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // If viewing a specific team dashboard
  if (viewingTeam) {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setViewingTeam(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 text-gray-600">
            ←
          </button>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{viewingTeam.pbl.subject} Dashboard</h2>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Team ID: <span className="text-blue-600">{viewingTeam.teamIdFormatted}</span></h3>
              <p className="text-gray-500">
                Mentor: {viewingTeam.mentor?.user?.name ? (
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {viewingTeam.mentor.user.name} 
                    {(viewingTeam.mentor.venue || viewingTeam.phaseEvaluators?.[0]?.evaluator?.venue) && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">📍 {viewingTeam.mentor.venue || viewingTeam.phaseEvaluators?.[0]?.evaluator?.venue}</span>}
                  </span>
                ) : (
                  <span className="italic">Not assigned yet</span>
                )}
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Team Members</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {viewingTeam.members.map((m, idx) => {
              const userInfo = JSON.parse(localStorage.getItem('userInfo'));
              const isLeader = viewingTeam.leaderId === userInfo?.studentProfileId;
              const isDeadlinePassed = viewingTeam.pbl.teamFormationEnd && new Date() > new Date(viewingTeam.pbl.teamFormationEnd);
              
              return (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-blue-300 transition-colors">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 flex items-center justify-center font-bold text-xl uppercase">
                  {m.student.user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {m.student.user.name}
                    {m.status === 'PENDING' && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">PENDING</span>}
                    {m.status === 'REMOVAL_REQUESTED' && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">REMOVAL PENDING</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Roll No: {m.student.enrollmentNumber} • Section {m.student.section}</p>
                </div>
                {viewingTeam.leaderId === m.student.id ? (
                  <span className="ml-auto text-xs font-bold text-white bg-green-500 px-2 py-1 rounded">Leader</span>
                ) : (
                  isLeader && !isDeadlinePassed && (
                    m.status === 'REMOVAL_REQUESTED' ? (
                      <span className="ml-auto text-xs text-red-500 font-bold px-2 py-1">Removal Pending</span>
                    ) : (
                      <button onClick={() => removeMember(viewingTeam.id, m.studentId)} className="ml-auto text-xs text-red-500 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 p-1.5 rounded transition">Remove</button>
                    )
                  )
                )}
              </div>
            )})}
          </div>

          {JSON.parse(localStorage.getItem('userInfo'))?.studentProfileId === viewingTeam.leaderId && viewingTeam.members.length < 4 && (!viewingTeam.pbl.teamFormationEnd || new Date() < new Date(viewingTeam.pbl.teamFormationEnd)) && (
            <div className="mt-4">
              {!showInviteForm ? (
                <button onClick={() => setShowInviteForm(true)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold border border-blue-100 hover:bg-blue-100">+ Add Team Member</button>
              ) : (
                <form onSubmit={(e) => handleInviteMember(viewingTeam.id, e)} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 max-w-lg mt-2">
                  <h4 className="font-bold text-sm mb-3">Add New Team Member</h4>
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <input type="text" placeholder="Roll Number *" required value={inviteData.rollNo} onChange={e => setInviteData({...inviteData, rollNo: e.target.value})} onBlur={e => handleInviteBlur(e.target.value)} className="p-2 text-sm rounded border border-gray-300 w-full outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Section *" required value={inviteData.section} onChange={e => setInviteData({...inviteData, section: e.target.value.toUpperCase()})} readOnly={inviteData.isFetched} className={`p-2 text-sm rounded border border-gray-300 w-full outline-none focus:border-blue-500 ${inviteData.isFetched ? 'bg-gray-100' : 'bg-white'}`} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <input type="text" placeholder="Full Name *" required value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} readOnly={inviteData.isFetched} className={`p-2 text-sm rounded border border-gray-300 w-full outline-none focus:border-blue-500 ${inviteData.isFetched ? 'bg-gray-100' : 'bg-white'}`} />
                    <input type="email" placeholder="Email" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} readOnly={inviteData.isFetched} className={`p-2 text-sm rounded border border-gray-300 w-full outline-none focus:border-blue-500 ${inviteData.isFetched ? 'bg-gray-100' : 'bg-white'}`} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 flex-1">Add Member</button>
                    <button type="button" onClick={() => setShowInviteForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-bold hover:bg-gray-300 flex-1">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mt-10 mb-4">Project Phases & Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(phase => {
              const phaseConfig = viewingTeam.pbl.phases?.find(p => p.phaseNumber === phase);
              const deadline = phaseConfig?.submissionEnd;
              const sub = viewingTeam.submissions?.find(s => s.phaseId === phaseConfig?.id);
              const userInfo = JSON.parse(localStorage.getItem('userInfo'));
              const isLeader = viewingTeam.leaderId === userInfo?.studentProfileId;
              
              const evaluatorMap = viewingTeam.phaseEvaluators?.find(pe => pe.phaseId === phaseConfig?.id);
              const evaluator = evaluatorMap?.evaluator;

              return (
                <Link key={phase} to={`/student/phase/${phase}?teamId=${viewingTeam.id}`} className="block group h-full">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">P{phase}</span>
                      {sub ? (
                        sub.status === 'GRADED' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">Graded ✔</span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">Uploaded ⏳</span>
                        )
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">Not Uploaded</span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Phase {phase} Synopsis / Report</h4>

                    {deadline && (
                      <div className="text-xs text-red-500 font-semibold mb-2 mt-1">
                        Deadline: {formatDate(deadline)}
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mb-4 flex-1 mt-2">
                      {sub ? (
                        sub.status === 'GRADED' ? "Synopsis & Report graded by mentor. Click to view marks and remarks." : "Synopsis submitted! Awaiting evaluation and grading by mentor."
                      ) : (
                        isLeader ? "You (Team Leader) are required to upload the Synopsis and Phase Report." : "Only Team Leader can upload. You can check upload status and grades here."
                      )}
                    </p>
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 text-blue-600 font-medium text-sm flex items-center group-hover:text-blue-700">
                      {sub ? "View Submission & Grade →" : isLeader ? "Upload Synopsis →" : "Check Phase Status →"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const studentSemester = pbls.length > 0 ? pbls[0].semester : '';

  return (
    <div className="space-y-6 fade-in">
      {invitations.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-6 rounded-2xl shadow-sm mb-6">
          <h3 className="text-xl font-bold text-orange-800 dark:text-orange-400 mb-4 flex items-center gap-2">
            <span className="text-2xl">📨</span> Pending Team Requests
          </h3>
          <div className="space-y-4">
            {invitations.map(inv => (
              <div key={inv.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-orange-100 dark:border-orange-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <p className="font-bold text-gray-800 dark:text-white text-lg">
                    {inv.team.pbl.subject} <span className="text-gray-500 text-base font-medium">({inv.team.pbl.subjectShort})</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {inv.status === 'REMOVAL_REQUESTED' ? (
                      <>Leader <span className="font-semibold text-red-600">{inv.team.leader.user.name}</span> requested to remove you • Team ID: </>
                    ) : (
                      <>Invited by <span className="font-semibold text-blue-600">{inv.team.leader.user.name}</span> • Team ID: </>
                    )}
                    <span className="font-mono text-gray-800 dark:text-gray-200">{inv.team.teamIdFormatted}</span>
                  </p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={() => respondToInvitation(inv.teamId, 'ACCEPT')} className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 hover:shadow-lg transition-all">Accept</button>
                  <button onClick={() => respondToInvitation(inv.teamId, 'REJECT')} className="flex-1 sm:flex-none px-6 py-2.5 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 transition-all">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Active PBL Subjects</h2>
          {studentSemester && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Showing subjects for <span className="font-bold text-blue-600 dark:text-blue-400">Semester {studentSemester}</span>
            </p>
          )}
        </div>
      </div>

      {pbls.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-dashed border-gray-200 dark:border-gray-700">
          <div className="text-5xl mb-3">📚</div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">No PBL Subjects Assigned</h3>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            There are currently no active PBL subjects scheduled for your semester. Check back later or contact your admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pbls.map((pbl) => {
            const userTeam = teams.find(t => t.pblId === pbl.id);
            return (
              <div key={pbl.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{pbl.subject}</h4>
                    <p className="text-sm text-gray-500">Code: {pbl.subjectShort} | Sem: {pbl.semester}</p>
                    {pbl.teamFormationEnd && (
                      <p className="text-xs font-semibold text-red-500 mt-1">Deadline: {formatDate(pbl.teamFormationEnd)}</p>
                    )}
                  </div>
                  {userTeam ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">Enrolled</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md">Pending</span>
                  )}
                </div>
                <div className="flex-1 text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {pbl.description || 'No description provided.'}
                </div>
                {userTeam ? (
                  <button 
                    onClick={() => setViewingTeam(userTeam)}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-xl transition font-semibold flex items-center justify-center gap-2"
                  >
                    View Team Dashboard →
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setSelectedPbl(pbl);
                      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                      setMembersData([
                        { rollNo: '', section: '', name: '', email: userInfo.email || '' },
                        { rollNo: '', section: '', name: '', email: '' },
                        { rollNo: '', section: '', name: '', email: '' },
                        { rollNo: '', section: '', name: '', email: '' },
                      ]);
                      setCustomData({});
                      setShowCreateModal(true);
                    }}
                    className="w-full py-2.5 bg-primary text-white rounded-xl hover:bg-blue-600 transition font-medium shadow-sm"
                  >
                    + Create Team
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && selectedPbl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Create Team for {selectedPbl.subject}</h3>
            <p className="text-sm text-gray-500 mb-6">
              Enter the enrollment numbers of all your team members (including yourself). Minimum 3, Maximum 4 members. <br />
              <strong className="text-red-500 dark:text-red-400 mt-1 inline-block">Note: Every team member must belong to a different section!</strong>
            </p>
            
            {createError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">{createError}</div>}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Team Members Info</h4>
                {[0, 1, 2, 3].map(idx => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <h5 className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                      {idx === 0 ? "Team Leader (You)" : `Member ${idx + 1} ${idx === 3 ? '(Optional)' : '*'}`}
                    </h5>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="text" 
                        placeholder="Univ. Roll No *"
                        required={idx < 3}
                        value={membersData[idx].rollNo}
                        onChange={e => {
                          const newArr = [...membersData];
                          newArr[idx].rollNo = e.target.value;
                          newArr[idx].isFetched = false; // reset on change
                          setMembersData(newArr);
                        }}
                        onBlur={(e) => handleRollNoBlur(idx, e.target.value)}
                        className="w-full sm:w-2/3 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Section (e.g. A) *"
                        required={idx < 3 || membersData[idx].rollNo !== ''}
                        value={membersData[idx].section}
                        onChange={e => {
                          const newArr = [...membersData];
                          newArr[idx].section = e.target.value;
                          setMembersData(newArr);
                        }}
                        readOnly={membersData[idx].isFetched}
                        className={`w-full sm:w-1/3 px-4 py-2 border rounded-lg outline-none uppercase ${
                          membersData[idx].isFetched ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed border-gray-200' : 'dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-3">
                      <input 
                        type="text" 
                        placeholder="Full Name *"
                        required={idx < 3 || membersData[idx].rollNo !== ''}
                        value={membersData[idx].name}
                        onChange={e => {
                          const newArr = [...membersData];
                          newArr[idx].name = e.target.value;
                          setMembersData(newArr);
                        }}
                        readOnly={membersData[idx].isFetched}
                        className={`w-full sm:w-1/2 px-4 py-2 border rounded-lg outline-none ${
                          membersData[idx].isFetched ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed border-gray-200' : 'focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600'
                        }`}
                      />
                      <input 
                        type="email" 
                        placeholder="Email Address"
                        required={idx < 3 || membersData[idx].rollNo !== ''}
                        value={membersData[idx].email || ''}
                        onChange={e => {
                          const newArr = [...membersData];
                          newArr[idx].email = e.target.value;
                          setMembersData(newArr);
                        }}
                        readOnly={membersData[idx].isFetched}
                        className={`w-full sm:w-1/2 px-4 py-2 border rounded-lg outline-none ${
                          membersData[idx].isFetched ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed border-gray-200' : 'focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button disabled={createLoading} type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md">
                  {createLoading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
