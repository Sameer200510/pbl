import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FacultyEvaluatorTeams = () => {
  const [teams, setTeams] = useState([]);
  const [reevaluations, setReevaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePhaseFilter, setActivePhaseFilter] = useState(1);
  const [activeTab, setActiveTab] = useState('ASSIGNED'); // 'ASSIGNED' | 'REEVALUATIONS'

  // Venue State
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venue, setVenue] = useState('');
  const [venueLoading, setVenueLoading] = useState(false);

  // Evaluate Modal State
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [activeStudentId, setActiveStudentId] = useState('');
  const [marksData, setMarksData] = useState({}); // { fieldName: marks }
  const [unsavedMarks, setUnsavedMarks] = useState({}); // { studentId: { marks, isPresent } }
  const [isPresent, setIsPresent] = useState(true);
  const [evalLoading, setEvalLoading] = useState(false);
  
  // Re-evaluate Modal State
  const [selectedReeval, setSelectedReeval] = useState(null);
  
  // Team Details Modal State
  const [selectedTeamDetails, setSelectedTeamDetails] = useState(null);

  const [existingEvaluations, setExistingEvaluations] = useState([]);
  const [previousRemarks, setPreviousRemarks] = useState(null);
  const [finishRemarks, setFinishRemarks] = useState('');
  const [projectLevel, setProjectLevel] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  // Interactions State
  const [interactions, setInteractions] = useState([]);
  const [showInteractions, setShowInteractions] = useState(false);
  const [interactionLoading, setInteractionLoading] = useState(false);

  const fetchTeamsAndReevals = async () => {
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const [teamsRes, reevalsRes] = await Promise.all([
        axios.get('/api/faculty/evaluator/teams', { headers: { Authorization: `Bearer ${userInfo.token}` } }),
        axios.get('/api/faculty/evaluator/re-evaluations', { headers: { Authorization: `Bearer ${userInfo.token}` } })
      ]);
      setTeams(teamsRes.data);
      setReevaluations(reevalsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVenue = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get('/api/faculty/venue', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setVenue(res.data.venue || '');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateVenue = async (e) => {
    e.preventDefault();
    try {
      setVenueLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.put('/api/faculty/venue', { venue }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert('Venue updated successfully!');
      setShowVenueModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update venue');
    } finally {
      setVenueLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndReevals();
    fetchVenue();
  }, []);

  const fetchEvaluations = async () => {
    if (!selectedTeam || !selectedPhase) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get(`/api/faculty/evaluator/evaluations/${selectedPhase.id}/${selectedTeam.id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setExistingEvaluations(res.data);

      const remarksRes = await axios.get(`/api/faculty/evaluator/previous-remarks/${selectedPhase.phaseNumber}/${selectedTeam.id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setPreviousRemarks(remarksRes.data.remarks);
    } catch (err) {
      console.error("Failed to fetch evaluations", err);
    }
  };

  useEffect(() => {
    fetchTeamsAndReevals();
  }, []);

  useEffect(() => {
    fetchEvaluations();
    if (selectedTeam) {
      fetchTeamInteractions();
    }
  }, [selectedTeam, selectedPhase]);

  const fetchTeamInteractions = async () => {
    try {
      setInteractionLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get(`/api/faculty/team/${selectedTeam.id}/interactions`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setInteractions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setInteractionLoading(false);
    }
  };

  useEffect(() => {
    if (activeStudentId) {
      if (unsavedMarks[activeStudentId]) {
        setMarksData(unsavedMarks[activeStudentId].marks);
        setIsPresent(unsavedMarks[activeStudentId].isPresent);
      } else {
        const studentEval = existingEvaluations.find(e => e.studentId === activeStudentId);
        if (studentEval) {
          setMarksData(studentEval.marksData);
          const hasAbsent = Object.values(studentEval.marksData).some(val => val === 'AB');
          setIsPresent(!hasAbsent);
        } else {
          setMarksData({});
          setIsPresent(true);
        }
      }
    } else {
      setMarksData({});
      setIsPresent(true);
    }
  }, [activeStudentId, existingEvaluations]);

  const handlePresenceToggle = (status) => {
    setIsPresent(status);
    let newMarks = {};
    if (!status) {
      selectedPhase.evaluationCriteria?.forEach(crit => {
        newMarks[crit.field] = 'AB';
      });
    } else {
      selectedPhase.evaluationCriteria?.forEach(crit => {
        newMarks[crit.field] = '';
      });
    }
    setMarksData(newMarks);
    if (activeStudentId) {
      setUnsavedMarks(prev => ({ ...prev, [activeStudentId]: { marks: newMarks, isPresent: status } }));
    }
  };

  const handleEvaluateSubmit = async (e) => {
    e.preventDefault();
    setEvalLoading(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post(`/api/faculty/evaluator/evaluate/${selectedPhase.id}/${activeStudentId}`, {
        marksData
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert('Marks saved for this student!');
      fetchEvaluations(); // Refresh evaluations list to show green tick
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setEvalLoading(false);
    }
  };

  const handleReevaluateSubmit = async (e) => {
    e.preventDefault();
    setEvalLoading(true);
    let finalTotal = 0;
    if (isPresent) {
      finalTotal = Object.values(marksData).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }
    
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post(`/api/faculty/evaluator/re-evaluations/submit`, {
        studentId: selectedReeval.studentId,
        phaseId: selectedReeval.phaseId,
        marksData: isPresent ? marksData : { 'Status': 'AB' },
        totalMarks: finalTotal
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert('Re-evaluation marks saved!');
      setSelectedReeval(null);
      fetchTeamsAndReevals(); // Refresh list to remove it
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setEvalLoading(false);
    }
  };

  const handleFinishTeamEvaluation = async () => {
    if (!window.confirm("Are you sure you want to finish the evaluation? This will mark the team phase as evaluated.")) return;
    setIsFinishing(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.put(`/api/faculty/evaluator/finish/${selectedPhase.id}/${selectedTeam.id}`, {
        remarks: finishRemarks,
        projectLevel: projectLevel
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert('Team Evaluation Finished!');
      setSelectedTeam(null);
      setFinishRemarks('');
      setProjectLevel('');
      fetchTeams(); // refresh list to show EVALUATED
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to finish evaluation');
    } finally {
      setIsFinishing(false);
    }
  };

  const [selectedPbl, setSelectedPbl] = useState('All');

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Evaluated Teams...</div>;

  // Extract unique PBLs for the filter dropdown
  const uniquePbls = [...new Map(teams.map(team => [team.pbl.id, team.pbl])).values()];

  const filteredTeams = teams.filter(team => {
    if (selectedPbl !== 'All' && team.pbl.id !== selectedPbl) return false;
    const phase = team.pbl.phases?.find(p => p.phaseNumber === activePhaseFilter);
    if (!phase) return false;
    return team.phaseEvaluators?.some(pe => pe.phaseId === phase.id);
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Evaluations Dashboard</h2>
          {uniquePbls.length > 0 && (
            <select
              value={selectedPbl}
              onChange={(e) => setSelectedPbl(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="All">All PBLs</option>
              {uniquePbls.map(pbl => (
                <option key={pbl.id} value={pbl.id}>
                  {pbl.subject} (Sem {pbl.semester})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('ASSIGNED')}
          className={`pb-3 font-semibold text-sm transition-colors ${activeTab === 'ASSIGNED' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          My Assigned Teams
        </button>
        <button
          onClick={() => setActiveTab('REEVALUATIONS')}
          className={`pb-3 font-semibold text-sm transition-colors flex items-center space-x-2 ${activeTab === 'REEVALUATIONS' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          <span>Re-evaluations</span>
          {reevaluations.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{reevaluations.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'ASSIGNED' ? (
        <>
          <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 pb-4 mt-6">
        {[1, 2, 3].map(phaseNum => (
          <button
            key={phaseNum}
            onClick={() => setActivePhaseFilter(phaseNum)}
            className={`px-6 py-2.5 font-bold rounded-xl text-sm transition-all ${
              activePhaseFilter === phaseNum
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Phase {phaseNum}
          </button>
        ))}
      </div>
      
      {filteredTeams.length === 0 ? (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <p className="text-gray-500">No teams assigned to you as an Evaluator yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredTeams.map((team) => (
            <div key={team.id} className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary">{team.teamIdFormatted}</h3>
                    <p className="text-sm text-gray-500 mt-1">{team.pbl.subject} (Sem {team.pbl.semester})</p>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      Evaluator ID: {team.pbl.pblFaculties?.[0]?.evaluatorIdFormatted || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right text-sm flex flex-col items-end">
                    <p className="font-semibold text-gray-800 dark:text-white">Leader: {team.leader?.user?.name}</p>
                    <p className="text-gray-500">{team.members.length} Members</p>
                    <button 
                      onClick={() => setSelectedTeamDetails(team)}
                      className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                {(() => {
                  const phase = team.pbl.phases?.find(p => p.phaseNumber === activePhaseFilter);
                  const evaluatorRec = team.phaseEvaluators?.find(pe => pe.phaseId === phase?.id);
                  const isEvaluated = evaluatorRec?.status === 'EVALUATED';
                  const submission = team.submissions?.find(s => s.phaseId === phase?.id);
                  const lastGrade = submission?.mentorGrades?.[0];
                  const isResubmitted = submission?.status === 'PENDING' && submission?.mentorGrades?.length > 0;

                  return (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Synopsis Status:</span>
                          {!submission ? (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded text-xs font-bold uppercase">Not Submitted</span>
                          ) : isResubmitted ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded text-xs font-bold uppercase">2nd Sub (Pending)</span>
                          ) : submission.status === 'PENDING' ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 rounded text-xs font-bold uppercase">Pending Review</span>
                          ) : lastGrade && lastGrade.grade === 0 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded text-xs font-bold uppercase">Rejected</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded text-xs font-bold uppercase">Approved</span>
                          )}
                        </div>
                        {submission?.synopsisUrl && (
                          <div className="mt-2 text-right">
                            <a href={submission.synopsisUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold">
                              📄 View Document
                            </a>
                          </div>
                        )}

                        {(() => {
                          const mmAssignment = team.examineeAssignments?.find(a => a.phaseId === phase?.id);
                          if (!mmAssignment) return null;
                          const evalsCount = mmAssignment.evaluations?.length || 0;
                          const avgScore = evalsCount > 0
                            ? (mmAssignment.evaluations.reduce((sum, ev) => sum + ev.totalMarks, 0) / evalsCount).toFixed(2)
                            : 'Pending';
                          return (
                            <div className="mt-2 text-sm font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 p-2 rounded border border-indigo-100 dark:border-indigo-800 text-center">
                              🤝 Peer Review Avg Score: {avgScore} ({evalsCount} reviews)
                            </div>
                          );
                        })()}
                      </div>

                      <button 
                        onClick={() => {
                          setSelectedTeam(team);
                          setSelectedPhase(phase);
                          setActiveStudentId(team.members[0].studentId);
                          setMarksData({});
                          setFinishRemarks(evaluatorRec?.remarks || '');
                        }}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition-colors border ${
                          isEvaluated 
                            ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-100 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400'
                        }`}
                      >
                        {isEvaluated ? `Phase ${activePhaseFilter} Evaluated ✓` : `Evaluate Phase ${activePhaseFilter}`}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {reevaluations.length === 0 ? (
            <div className="col-span-full text-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <p className="text-gray-500">No re-evaluations assigned to you.</p>
            </div>
          ) : (
            reevaluations.map((reeval) => (
              <div key={reeval.id} className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-blue-100 dark:border-blue-900/50 p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">RE-EVAL</div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{reeval.student.user.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{reeval.student.enrollmentNumber} • Phase {reeval.phase.phaseNumber}</p>
                  
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 mb-4">
                    <p><strong>Team:</strong> {reeval.student.teamMembers[0]?.team?.teamIdFormatted}</p>
                    <p><strong>Subject:</strong> {reeval.student.teamMembers[0]?.team?.pbl?.subjectShort}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setSelectedReeval(reeval);
                    setMarksData({});
                    setIsPresent(true);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow transition-colors mt-auto"
                >
                  Grade Student
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Team Details Modal */}
      {selectedTeamDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Team {selectedTeamDetails.teamIdFormatted}</h3>
              <button onClick={() => setSelectedTeamDetails(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                <h4 className="font-bold text-gray-800 dark:text-white mb-2">Project Details</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Subject:</strong> {selectedTeamDetails.pbl.subject} (Sem {selectedTeamDetails.pbl.semester})</p>
                <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Leader:</strong> {selectedTeamDetails.leader?.user?.name}</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-3">Team Members ({selectedTeamDetails.members.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedTeamDetails.members.map((member) => (
                    <div key={member.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
                      <p className="font-bold text-gray-800 dark:text-white">{member.student?.user?.name}</p>
                      <p className="text-sm text-gray-500">Roll No: {member.student?.enrollmentNumber}</p>
                      <p className="text-sm text-gray-500">Section: {member.student?.section}</p>
                      {selectedTeamDetails.leaderId === member.studentId && (
                        <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">TEAM LEADER</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTeam && selectedPhase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Evaluate Phase {selectedPhase.phaseNumber}</h3>
                <p className="text-sm text-gray-500">{selectedTeam.teamIdFormatted}</p>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden gap-6">
              {/* Left sidebar: Student List */}
              <div className="w-full md:w-1/3 md:border-r border-b md:border-b-0 border-gray-100 dark:border-gray-700 pb-4 md:pb-0 md:pr-4 overflow-y-auto">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Select Student</h4>
                <div className="space-y-2">
                  {selectedTeam.members.map(m => {
                    const studentEval = existingEvaluations.find(e => e.studentId === m.studentId);
                    return (
                      <button
                        key={m.studentId}
                        onClick={() => setActiveStudentId(m.studentId)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors flex justify-between items-center ${
                          activeStudentId === m.studentId 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{m.student.user.name}</p>
                          <p className="text-xs text-gray-500">{m.student.enrollmentNumber}</p>
                        </div>
                        {studentEval && (
                          <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                            {studentEval.totalMarks} Marks
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Finish Evaluation Section */}
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Finish Evaluation</h4>
                  
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Project Complexity Level</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Foundation / Basic', 'Intermediate / Standard', 'Advanced / Complex', 'Expert / Innovative'].map(level => (
                        <button
                          key={level}
                          onClick={() => setProjectLevel(level)}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors ${
                            projectLevel === level 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">Add remarks for the entire team to finish the evaluation. These remarks will be visible to the evaluator in the next phase.</p>
                  <textarea 
                    value={finishRemarks}
                    onChange={(e) => setFinishRemarks(e.target.value)}
                    placeholder="Enter team remarks..."
                    className="w-full px-3 py-2 border rounded-lg text-sm mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                    rows="3"
                  />
                  <button
                    onClick={handleFinishTeamEvaluation}
                    disabled={isFinishing || existingEvaluations.length < selectedTeam.members.length}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
                  >
                    {isFinishing ? 'Finishing...' : 'Finish Team Evaluation'}
                  </button>
                  {existingEvaluations.length < selectedTeam.members.length && (
                    <p className="text-xs text-red-500 mt-2 font-medium">Please grade all students to finish.</p>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Mentor Interactions ({interactions.length})</h4>
                  <button onClick={() => setShowInteractions(true)} className="w-full py-2 bg-orange-100 text-orange-700 font-bold rounded-lg hover:bg-orange-200 text-sm border border-orange-200">
                    👁️ View Mentor Visits
                  </button>
                </div>
              </div>

              {/* Right side: Grading Form */}
              <div className="flex-1 overflow-y-auto pl-2">
                {previousRemarks && (
                  <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <h4 className="font-bold text-yellow-800 dark:text-yellow-400 text-sm mb-1">Remarks from Previous Phase Evaluator</h4>
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">{previousRemarks}</p>
                  </div>
                )}
                
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                    Grading Form: {selectedTeam.members.find(m => m.studentId === activeStudentId)?.student.user.name}
                  </h4>
                  <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button 
                      type="button"
                      onClick={() => handlePresenceToggle(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${isPresent ? 'bg-white dark:bg-gray-800 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Present
                    </button>
                    <button 
                      type="button"
                      onClick={() => handlePresenceToggle(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${!isPresent ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
                
                {selectedPhase.evaluationCriteria?.length > 0 ? (
                  <form onSubmit={handleEvaluateSubmit} className="space-y-4">
                    {selectedPhase.evaluationCriteria.map((crit, idx) => (
                      <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border ${!isPresent ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700'}`}>
                        <label className={`text-sm font-medium ${!isPresent ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {crit.field} <span className={`text-xs ${!isPresent ? 'text-red-400' : 'text-gray-400'}`}>(Max: {crit.maxMarks})</span>
                        </label>
                        {!isPresent ? (
                          <div className="w-24 px-3 py-2 text-center font-black text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            AB
                          </div>
                        ) : (
                          <input 
                            type="number"
                            min="0"
                            max={crit.maxMarks}
                            required
                            value={marksData[crit.field] || ''}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val !== '' && Number(val) > Number(crit.maxMarks)) {
                                val = crit.maxMarks;
                              }
                              const newMarks = {...marksData, [crit.field]: val};
                              setMarksData(newMarks);
                              setUnsavedMarks(prev => ({ ...prev, [activeStudentId]: { marks: newMarks, isPresent: isPresent } }));
                            }}
                            className="w-24 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-sm font-bold text-gray-800 dark:text-white">
                        Total: {!isPresent ? '0 (Absent)' : Object.values(marksData).reduce((sum, val) => sum + (Number(val) || 0), 0)}
                      </div>
                      <button disabled={evalLoading} type="submit" className={`px-6 py-2 text-white rounded-lg font-bold shadow-sm ${!isPresent ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        {evalLoading ? 'Saving...' : !isPresent ? 'Save Absent' : 'Save Student Marks'}
                      </button>
                    </div>
                  </form>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                  <span className="text-4xl mb-3">👈</span>
                  <p>Select a student from the list to evaluate.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Interactions Modal */}
      {showInteractions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="text-orange-500">📝</span> Mentor Interactions History
              </h3>
              <button onClick={() => setShowInteractions(false)} className="text-gray-500 hover:text-gray-700">✕</button>
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

      {/* Re-evaluation Grading Modal */}
      {selectedReeval && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Re-evaluate Phase {selectedReeval.phase.phaseNumber}</h3>
                <p className="text-sm text-gray-500">{selectedReeval.student.user.name} ({selectedReeval.student.enrollmentNumber})</p>
              </div>
              <button onClick={() => setSelectedReeval(null)} className="text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
            </div>

            {/* Project Level & Mentor Visits */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Project Level</p>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{selectedReeval.student.projectLevel || 'Not Set'}</p>
              </div>
              <div className="flex-1 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Mentor Visits</p>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-200">{interactions.length} / 8</p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 mt-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                Grading Form
              </h4>
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button 
                  type="button"
                  onClick={() => handlePresenceToggle(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${isPresent ? 'bg-white dark:bg-gray-800 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Present
                </button>
                <button 
                  type="button"
                  onClick={() => handlePresenceToggle(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${!isPresent ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Absent
                </button>
              </div>
            </div>
            
            {selectedReeval.phase.evaluationCriteria?.length > 0 ? (
              <form onSubmit={handleReevaluateSubmit} className="space-y-4">
                {selectedReeval.phase.evaluationCriteria.map((crit, idx) => (
                  <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border ${!isPresent ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700'}`}>
                    <label className={`text-sm font-medium ${!isPresent ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {crit.field} <span className={`text-xs ${!isPresent ? 'text-red-400' : 'text-gray-400'}`}>(Max: {crit.maxMarks})</span>
                    </label>
                    {!isPresent ? (
                      <div className="w-24 px-3 py-2 text-center font-black text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        AB
                      </div>
                    ) : (
                      <input 
                        type="number"
                        min="0"
                        max={crit.maxMarks}
                        required
                        value={marksData[crit.field] || ''}
                        onChange={(e) => setMarksData({...marksData, [crit.field]: e.target.value})}
                        className="w-24 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                  <div className="text-sm font-bold text-gray-800 dark:text-white">
                    Total: {!isPresent ? '0 (Absent)' : Object.values(marksData).reduce((sum, val) => sum + (Number(val) || 0), 0)}
                  </div>
                  <button disabled={evalLoading} type="submit" className={`px-6 py-2 text-white rounded-lg font-bold shadow-sm ${!isPresent ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {evalLoading ? 'Saving...' : !isPresent ? 'Save Absent' : 'Submit Re-evaluation'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-gray-500 italic">No evaluation criteria defined for this phase.</p>
            )}
          </div>
        </div>
      )}

      {/* Venue Modal */}
      {showVenueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Set Your Venue</h3>
            <p className="text-sm text-gray-500 mb-4">This location will be visible to your assigned students.</p>
            <form onSubmit={handleUpdateVenue}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Venue / Cabin / Location</label>
                <input 
                  type="text" 
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Lab 4, Cabin 201..."
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setShowVenueModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button disabled={venueLoading} type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">
                  {venueLoading ? 'Saving...' : 'Save Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FacultyEvaluatorTeams;
