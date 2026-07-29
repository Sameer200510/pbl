import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminReevaluation = () => {
  const [pblList, setPblList] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedPblId, setSelectedPblId] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [reevalList, setReevalList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [marksData, setMarksData] = useState([]);
  const [absentees, setAbsentees] = useState([]);
  const [unlockLoading, setUnlockLoading] = useState(false);

  const getHeaders = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    return { Authorization: `Bearer ${userInfo.token}` };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pblRes, facRes] = await Promise.all([
          axios.get('/api/admin/pbl', { headers: getHeaders() }),
          axios.get('/api/admin/faculty', { headers: getHeaders() })
        ]);
        setPblList(pblRes.data.filter(p => !p.isArchived));
        setFacultyList(facRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const selectedPbl = pblList.find(p => p.id === selectedPblId);
  const phases = selectedPbl?.phases || [];

  // Fetch marks data for absentees calculation
  useEffect(() => {
    if (!selectedPblId) {
      setMarksData([]);
      return;
    }
    const fetchMarks = async () => {
      try {
        const res = await axios.get(`/api/admin/reports/marks/${selectedPblId}`, { headers: getHeaders() });
        setMarksData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMarks();
  }, [selectedPblId]);

  // Fetch existing re-evaluations when phase changes
  useEffect(() => {
    if (!selectedPhaseId) {
      setReevalList([]);
      return;
    }
    const fetchReevals = async () => {
      try {
        setListLoading(true);
        const res = await axios.get(`/api/admin/re-evaluation/list/${selectedPhaseId}`, { headers: getHeaders() });
        setReevalList(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setListLoading(false);
      }
    };
    fetchReevals();
  }, [selectedPhaseId]);

  // Calculate Absentees
  useEffect(() => {
    if (!selectedPhaseId || !marksData.length) {
      setAbsentees([]);
      return;
    }
    
    const selectedPbl = pblList.find(p => p.id === selectedPblId);
    const phaseNum = selectedPbl?.phases?.find(p => p.id === selectedPhaseId)?.phaseNumber;
    
    if (!phaseNum) return;

    // Filter students marked absent in this phase and not already in reevalList
    const abs = marksData.filter(m => {
      const pd = m.phases[phaseNum];
      const isAbsent = pd?.evaluatorTotalMarks === 0 && Object.values(pd.evaluatorMarksData || {}).includes('AB');
      const alreadyAssigned = reevalList.some(r => r.studentId === m.studentId);
      return isAbsent && !alreadyAssigned;
    });
    setAbsentees(abs);
  }, [selectedPhaseId, marksData, pblList, selectedPblId, reevalList]);

  const handleUnlockAbsentee = async (student) => {
    if (!selectedEvaluatorId) {
      alert('Please select an evaluator in Step ③ to assign them first.');
      return;
    }
    try {
      setUnlockLoading(true);
      const phaseNum = phases.find(p => p.id === selectedPhaseId)?.phaseNumber;
      const pd = student.phases[phaseNum];
      
      await axios.post('/api/admin/re-evaluation/unlock', {
        studentId: student.studentId,
        phaseId: pd.phaseId,
        evaluatorId: selectedEvaluatorId
      }, { headers: getHeaders() });
      
      alert('Student unlocked for re-evaluation!');
      
      // Refresh re-eval list
      const res = await axios.get(`/api/admin/re-evaluation/list/${selectedPhaseId}`, { headers: getHeaders() });
      setReevalList(res.data);
      
    } catch (err) {
      alert(err.response?.data?.message || 'Error unlocking student');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedPhaseId || !selectedEvaluatorId || !file) {
      alert('Please select Phase, Faculty and upload an Excel file.');
      return;
    }
    try {
      setUploading(true);
      setResult(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('phaseId', selectedPhaseId);
      formData.append('evaluatorId', selectedEvaluatorId);

      const res = await axios.post('/api/admin/re-evaluation/bulk', formData, {
        headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      setFile(null);
      // Refresh list
      const listRes = await axios.get(`/api/admin/re-evaluation/list/${selectedPhaseId}`, { headers: getHeaders() });
      setReevalList(listRes.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Re-evaluation / Back</h2>
        <p className="text-sm text-gray-500 mt-1">Upload an Excel file of students who need re-evaluation and assign them to a faculty evaluator.</p>
      </div>

      {/* Step 1: Select PBL */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* PBL Select */}
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">① Select PBL</label>
            <select
              value={selectedPblId}
              onChange={(e) => { setSelectedPblId(e.target.value); setSelectedPhaseId(''); setResult(null); }}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="">-- Choose PBL --</option>
              {pblList.map(p => (
                <option key={p.id} value={p.id}>{p.subjectShort} (Sem {p.semester})</option>
              ))}
            </select>
          </div>

          {/* Phase Select */}
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">② Select Phase</label>
            <select
              value={selectedPhaseId}
              onChange={(e) => { setSelectedPhaseId(e.target.value); setResult(null); }}
              disabled={!selectedPblId}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="">-- Choose Phase --</option>
              {phases.map(ph => (
                <option key={ph.id} value={ph.id}>Phase {ph.phaseNumber}</option>
              ))}
            </select>
          </div>

          {/* Faculty Select */}
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">③ Assign Faculty</label>
            <select
              value={selectedEvaluatorId}
              onChange={(e) => setSelectedEvaluatorId(e.target.value)}
              disabled={!selectedPhaseId}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="">-- Choose Evaluator --</option>
              {facultyList.map(f => (
                <option key={f.id} value={f.id}>{f.user?.name} ({f.user?.email})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Upload Excel & Submit */}
      {selectedPhaseId && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <form onSubmit={handleUpload} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">④ Upload Excel (Enrollment Numbers)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-xs text-gray-400 mt-1">Excel should have enrollment numbers in the first column.</p>
            </div>
            <button
              type="submit"
              disabled={uploading || !file || !selectedEvaluatorId}
              className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {uploading ? 'Processing...' : '🔄 Assign Re-evaluation'}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-sm font-bold text-green-700 dark:text-green-400">{result.message}</p>
              <div className="flex gap-6 mt-2 text-sm text-green-600">
                <span>✅ New: {result.created}</span>
                <span>🔄 Updated: {result.updated}</span>
                <span>📋 Total: {result.total}</span>
              </div>
              {result.notFound?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-bold text-red-600">⚠️ Not Found ({result.notFound.length}):</p>
                  <p className="text-xs text-red-500">{result.notFound.join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Absentees Section */}
      {selectedPhaseId && absentees.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
          <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
            ⚠️ Absent Students ({absentees.length})
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            These students were marked absent in this phase. Select an evaluator in Step ③ above, then click unlock to assign them.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {absentees.map(a => (
              <div key={a.studentId} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm">
                <div>
                  <p className="font-bold text-gray-800 dark:text-white text-sm">{a.studentName}</p>
                  <p className="text-xs text-gray-500">{a.enrollmentNumber}</p>
                </div>
                <button
                  onClick={() => handleUnlockAbsentee(a)}
                  disabled={unlockLoading || !selectedEvaluatorId}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  Unlock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Re-evaluations Table */}
      {selectedPhaseId && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            Assigned Re-evaluations ({reevalList.length})
          </h3>
          {listLoading ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : reevalList.length === 0 ? (
            <p className="text-gray-400 italic text-center py-8">No re-evaluations assigned for this phase yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 text-left">
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">#</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Enrollment</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Student Name</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Assigned Evaluator</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {reevalList.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{r.student?.enrollmentNumber}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.student?.user?.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.evaluator?.user?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          r.status === 'EVALUATED' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReevaluation;
