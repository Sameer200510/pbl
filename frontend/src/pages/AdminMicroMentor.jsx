import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminMicroMentor = () => {
  const [pblList, setPblList] = useState([]);
  const [selectedPbl, setSelectedPbl] = useState('');
  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState('');
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchPbls();
  }, []);

  useEffect(() => {
    if (selectedPbl) {
      const pbl = pblList.find(p => p.id === selectedPbl);
      if (pbl && pbl.phases) {
        setPhases(pbl.phases);
        if (pbl.phases.length > 0) {
          setSelectedPhase(pbl.phases[0].id);
        }
      }
      fetchAssignments(selectedPbl, selectedPhase || (pbl?.phases[0]?.id));
    }
  }, [selectedPbl]);

  useEffect(() => {
    if (selectedPbl && selectedPhase) {
      fetchAssignments(selectedPbl, selectedPhase);
    }
  }, [selectedPhase]);

  const fetchPbls = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get('/api/admin/pbl', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setPblList(res.data);
      if (res.data.length > 0) {
        setSelectedPbl(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssignments = async (pblId, phaseId) => {
    if (!pblId) return;
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      let url = `/api/admin/micro-mentor/${pblId}`;
      if (phaseId) url += `?phaseId=${phaseId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMicroMentors = async () => {
    if (!selectedPbl || !selectedPhase) {
      return alert('Please select a PBL and a Phase first.');
    }
    if (!window.confirm('Are you sure? This will randomly assign peer reviews for the selected Phase. Existing assignments for this phase will be overwritten!')) {
      return;
    }

    try {
      setAssigning(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.post('/api/admin/micro-mentor/assign', {
        pblId: selectedPbl,
        phaseId: selectedPhase
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert(res.data.message);
      fetchAssignments(selectedPbl, selectedPhase);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign micro mentors');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Select PBL</label>
            <select
              value={selectedPbl}
              onChange={(e) => setSelectedPbl(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {pblList.map(p => (
                <option key={p.id} value={p.id}>{p.subject} (Sem {p.semester})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Select Phase</label>
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="w-full md:w-48 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={phases.length === 0}
            >
              {phases.length === 0 && <option value="">No Phases</option>}
              {phases.map(p => (
                <option key={p.id} value={p.id}>Phase {p.phaseNumber}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAssignMicroMentors}
            disabled={assigning || !selectedPhase}
            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
          >
            {assigning ? 'Assigning...' : '🎲 Assign Micro Mentors Randomly'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-[#1c1f58]">Peer Review Assignments (Phase {phases.find(p=>p.id === selectedPhase)?.phaseNumber})</h3>
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
            Total: {assignments.length}
          </span>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-3">📭</div>
            No micro mentor assignments found for this phase. Click the Assign button above to generate them.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-200">
                  <th className="p-4 text-sm font-bold text-gray-700">Reviewer Team</th>
                  <th className="p-4 text-sm font-bold text-gray-700">Examinee Team</th>
                  <th className="p-4 text-sm font-bold text-gray-700">Completion</th>
                  <th className="p-4 text-sm font-bold text-gray-700">Avg Score Given</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map(assignment => {
                  // Calculate metrics
                  const totalMembers = assignment.reviewerTeam.members?.length || 4; // approximate if not populated
                  const evaluationsCount = assignment.evaluations?.length || 0;
                  const avgScore = evaluationsCount > 0 
                    ? (assignment.evaluations.reduce((acc, curr) => acc + curr.totalMarks, 0) / evaluationsCount).toFixed(2)
                    : 'N/A';

                  return (
                    <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{assignment.reviewerTeam.teamIdFormatted}</div>
                        <div className="text-xs text-gray-500">Leader: {assignment.reviewerTeam.leader?.user?.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{assignment.examineeTeam.teamIdFormatted}</div>
                        <div className="text-xs text-gray-500">Leader: {assignment.examineeTeam.leader?.user?.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500" 
                              style={{ width: `${Math.min((evaluationsCount / 4) * 100, 100)}%` }} // assuming 4 max members
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{evaluationsCount} submitted</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-indigo-600">
                        {avgScore}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMicroMentor;
