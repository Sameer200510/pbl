import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const AdminFacultyAllocation = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [pbls, setPbls] = useState([]);
  const [selectedPbl, setSelectedPbl] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState({}); // { teamId: { mentorId, evaluatorId } }

  // Excel Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [excelData, setExcelData] = useState(null);
  const [fileColumns, setFileColumns] = useState([]);
  const [mapping, setMapping] = useState({ name: '', email: '', department: '', moodleId: '', password: '' });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [wipeOldData, setWipeOldData] = useState(false);

  const fetchInitialData = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const pblRes = await axios.get('/api/admin/pbl', { headers: { Authorization: `Bearer ${userInfo.token}` } });
      setPbls(pblRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFacultiesForPbl = async (pblId) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get(`/api/admin/faculty?pblId=${pblId}`, { headers: { Authorization: `Bearer ${userInfo.token}` } });
      setFacultyList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPbl) {
      fetchTeams();
      fetchFacultiesForPbl(selectedPbl);
    } else {
      setTeams([]);
      setFacultyList([]);
    }
  }, [selectedPbl]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get(`/api/admin/teams/pbl/${selectedPbl}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setTeams(res.data);
      
      const initialAllocations = {};
      res.data.forEach(t => {
        const phaseEvals = {};
        if (t.phaseEvaluators) {
          t.phaseEvaluators.forEach(pe => {
            phaseEvals[pe.phaseId] = pe.evaluatorId;
          });
        }
        initialAllocations[t.id] = { mentorId: t.mentorId || '', phaseEvaluators: phaseEvals };
      });
      setAllocations(initialAllocations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationSave = async (type, phaseId = null) => { 
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      let assignments = [];
      
      if (type === 'mentor') {
        assignments = teams.map(t => ({
          teamId: t.id,
          facultyId: allocations[t.id].mentorId
        })).filter(a => a.facultyId !== '');
      } else {
        assignments = teams.map(t => ({
          teamId: t.id,
          phaseId: phaseId,
          facultyId: allocations[t.id].phaseEvaluators[phaseId] || ''
        })).filter(a => a.facultyId !== '');
      }

      const endpoint = type === 'mentor' ? 'mentor-mapping' : 'evaluator-mapping';
      
      await axios.post(`/api/admin/${endpoint}`, {
        pblId: selectedPbl,
        assignments
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} mapping saved successfully!`);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving allocation');
    }
  };

  const handleRandomMapMentors = async () => {
    if (!window.confirm("Are you sure you want to randomly map Mentors? This will overwrite existing mentors for this PBL.")) return;
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.post('/api/admin/random-map/mentors', 
        { pblId: selectedPbl },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      alert(res.data.message);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || 'Error random mapping mentors');
      setLoading(false);
    }
  };

  const handleRandomMapEvaluators = async (phaseId, phaseNumber) => {
    if (!window.confirm(`Are you sure you want to randomly map Evaluators for Phase ${phaseNumber}? This will overwrite existing evaluators for this phase.`)) return;
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.post('/api/admin/random-map/evaluators', 
        { pblId: selectedPbl, phaseId },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      alert(res.data.message);
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.message || `Error random mapping phase ${phaseNumber}`);
      setLoading(false);
    }
  };

  const handleAllocationChange = (teamId, field, value, phaseId = null) => {
    setAllocations(prev => {
      const newAlloc = { ...prev };
      if (field === 'mentorId') {
        newAlloc[teamId] = { ...newAlloc[teamId], mentorId: value };
      } else if (field === 'phaseEvaluator') {
        newAlloc[teamId] = {
          ...newAlloc[teamId],
          phaseEvaluators: { ...newAlloc[teamId].phaseEvaluators, [phaseId]: value }
        };
      }
      return newAlloc;
    });
  };

  const activePblDetails = pbls.find(p => p.id === selectedPbl);
  const activePhases = activePblDetails?.phases || [];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      if (data.length > 0) {
        setExcelData(data);
        const cols = Object.keys(data[0]);
        setFileColumns(cols);
        
        const autoMap = { name: '', moodleId: '', password: '' };
        cols.forEach(c => {
          const lower = c.toLowerCase();
          if (lower.includes('name')) autoMap.name = c;
          if (lower.includes('moodle')) autoMap.moodleId = c;
          if (lower.includes('pass')) autoMap.password = c;
        });
        setMapping(autoMap);
      } else {
        setUploadError('Excel file is empty');
      }
    };
    reader.readAsBinaryString(file);
  };

  const submitMappedData = async () => {
    setUploadError('');
    if (!mapping.name) {
      return setUploadError('Name mapping is required');
    }

    const faculties = excelData.map((row, idx) => {
      const moodleId = mapping.moodleId ? row[mapping.moodleId] : undefined;
      const fallbackEmail = moodleId ? `${moodleId}@faculty.local` : `faculty${Date.now()}${idx}@faculty.local`;
      return {
        name: row[mapping.name],
        email: fallbackEmail,
        department: 'General',
        moodleId: moodleId,
        password: mapping.password ? row[mapping.password] : undefined
      };
    });

    try {
      setUploadLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.post('/api/admin/faculty/bulk', {
        faculties,
        pblId: selectedPbl,
        wipeOldData
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert('Faculties uploaded successfully!');
      setShowUploadModal(false);
      setExcelData(null);
      fetchFacultiesForPbl(selectedPbl);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Faculty & Allocation Management</h2>
        {selectedPbl ? (
          <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            + Add Faculty / Upload Excel
          </button>
        ) : (
          <div className="text-sm text-gray-500 italic">Select a PBL to add faculty</div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Team Allocations</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select PBL</label>
          <select 
            value={selectedPbl} 
            onChange={(e) => setSelectedPbl(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- Select a PBL to view teams --</option>
            {pbls.map(p => (
              <option key={p.id} value={p.id}>{p.subject} ({p.subjectShort} - Sem {p.semester})</option>
            ))}
          </select>
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
              <div className="flex flex-col mb-4 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex gap-2 items-center">
                    <button onClick={handleRandomMapMentors} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg shadow-sm font-medium text-sm">
                      🎲 Random Map Mentors
                    </button>
                    <button onClick={() => handleAllocationSave('mentor')} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm font-medium text-sm">Save Mentors</button>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 border-l border-gray-200 dark:border-gray-700 pl-4">
                    {activePhases.map(phase => (
                      <div key={phase.id} className="flex gap-2 items-center border border-gray-200 dark:border-gray-700 p-2 rounded-lg">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">P{phase.phaseNumber}</span>
                        <button onClick={() => handleRandomMapEvaluators(phase.id, phase.phaseNumber)} className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded shadow-sm font-medium text-xs" title={`Random Map Phase ${phase.phaseNumber}`}>
                          🎲 Random Map
                        </button>
                        <button onClick={() => handleAllocationSave('evaluator', phase.id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm font-medium text-xs">
                          Save Evals
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 shadow-sm z-10">
                    <tr className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      <th className="p-3 whitespace-nowrap">Team ID</th>
                      <th className="p-3 whitespace-nowrap">Leader</th>
                      <th className="p-3 min-w-[200px]">Mentor</th>
                      {activePhases.map(phase => (
                        <th key={phase.id} className="p-3 min-w-[200px]">Eval: Phase {phase.phaseNumber}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {teams.map(t => {
                      const getFacultyLabel = (f, type) => {
                        const pf = f.pblFaculties?.find(pf => pf.pblId === selectedPbl);
                        if (!pf) return f.user.name;
                        const idStr = type === 'mentor' ? pf.mentorIdFormatted : pf.evaluatorIdFormatted;
                        return idStr ? `${f.user.name} (${idStr})` : f.user.name;
                      };
                      return (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors">
                        <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{t.teamIdFormatted}</td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300">{t.leader?.user?.name}</td>
                        <td className="p-3">
                          <select 
                            value={allocations[t.id]?.mentorId || ''}
                            onChange={(e) => handleAllocationChange(t.id, 'mentorId', e.target.value)}
                            className="w-full px-2 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">-- Unassigned --</option>
                            {facultyList.map(f => (
                              <option key={f.id} value={f.id}>{getFacultyLabel(f, 'mentor')}</option>
                            ))}
                          </select>
                        </td>
                        {activePhases.map(phase => (
                          <td key={phase.id} className="p-3">
                            <select 
                              value={allocations[t.id]?.phaseEvaluators?.[phase.id] || ''}
                              onChange={(e) => handleAllocationChange(t.id, 'phaseEvaluator', e.target.value, phase.id)}
                              className="w-full px-2 py-1.5 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              <option value="">-- Unassigned --</option>
                              {facultyList.map(f => (
                                <option key={f.id} value={f.id}>{getFacultyLabel(f, 'evaluator')}</option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Upload Faculty Excel</h3>
              <button onClick={() => {setShowUploadModal(false); setExcelData(null);}} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
            </div>
            
            <div className="p-6">
              {uploadError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-800">
                  {uploadError}
                </div>
              )}

              {!excelData ? (
                <>
                <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" id="excel-upload" />
                  <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
                    <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to browse or drag file here</span>
                    <span className="text-xs text-gray-500 mt-1">Supports .xlsx, .csv</span>
                  </label>
                </div>
                
                <div className="flex items-center mt-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <input 
                    type="checkbox" 
                    id="wipeOldFaculty" 
                    checked={wipeOldData} 
                    onChange={e => setWipeOldData(e.target.checked)} 
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                  />
                  <label htmlFor="wipeOldFaculty" className="ml-2 text-sm font-bold text-red-700 dark:text-red-400 cursor-pointer">
                    Wipe Old Faculty Data for this PBL Context
                  </label>
                </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium border border-green-100 dark:border-green-800">
                    File loaded! Found {excelData.length} rows. Map columns below.
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name Column <span className="text-red-500">*</span></label>
                      <select value={mapping.name} onChange={(e) => setMapping({...mapping, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="">-- Select --</option>
                        {fileColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Moodle ID Column</label>
                      <select value={mapping.moodleId} onChange={(e) => setMapping({...mapping, moodleId: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="">-- Select Column --</option>
                        {fileColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password Column</label>
                      <select value={mapping.password} onChange={(e) => setMapping({...mapping, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="">-- Select Column --</option>
                        {fileColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button 
                onClick={() => {setShowUploadModal(false); setExcelData(null);}}
                className="px-5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              {excelData && (
                <button 
                  onClick={submitMappedData}
                  disabled={uploadLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center"
                >
                  {uploadLoading ? 'Uploading...' : 'Confirm & Upload'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFacultyAllocation;
