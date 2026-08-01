import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminResult = () => {
  const [pbls, setPbls] = useState([]);
  const [selectedPbl, setSelectedPbl] = useState('');
  const [marksData, setMarksData] = useState([]);
  const [activeMarksPhase, setActiveMarksPhase] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editMarks, setEditMarks] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const pblRes = await axios.get('/api/admin/pbl', { 
          headers: { Authorization: `Bearer ${userInfo.token}` } 
        });
        setPbls(pblRes.data.filter(p => !p.isArchived));
      } catch (err) {
        console.error('Error fetching data', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedPbl) {
      setMarksData([]);
      return;
    }
    const fetchMarks = async () => {
      try {
        setLoading(true);
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const marksRes = await axios.get(`/api/admin/reports/marks/${selectedPbl}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setMarksData(marksRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMarks();
  }, [selectedPbl]);

  const activePblDetails = pbls.find(p => p.id === selectedPbl);

  const handleEdit = (student, pd) => {
    if (pd?.evaluatorTotalMarks === null) {
      alert("Cannot edit marks for a student who hasn't been evaluated yet.");
      return;
    }
    setEditingStudent({ ...student, phaseId: pd.phaseId });
    setEditMarks(pd.evaluatorMarksData || {});
  };

  const handleSaveMarks = async () => {
    try {
      setSaving(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      
      const totalMarks = Object.values(editMarks).reduce((acc, curr) => {
        if (curr === 'AB') return acc;
        return acc + (Number(curr) || 0);
      }, 0);

      await axios.put('/api/admin/reports/marks/update', {
        studentId: editingStudent.studentId,
        phaseId: editingStudent.phaseId,
        totalMarks: totalMarks,
        marksData: editMarks
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      
      alert('Marks updated successfully!');
      
      // Refresh marks
      const marksRes = await axios.get(`/api/admin/reports/marks/${selectedPbl}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setMarksData(marksRes.data);
      setEditingStudent(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating marks');
    } finally {
      setSaving(false);
    }
  };

  const getCriteriaForPhase = () => {
    const phase = activePblDetails?.phases?.find(p => p.phaseNumber === activeMarksPhase);
    return phase?.evaluationCriteria || [];
  };

  return (
    <div className="space-y-6 fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Results & Marks Edit</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View student marks and edit them if required.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select PBL Session</label>
        <select 
          className="w-full md:w-1/2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          value={selectedPbl} 
          onChange={(e) => setSelectedPbl(e.target.value)}
        >
          <option value="">-- Choose PBL --</option>
          {pbls.map(p => (
            <option key={p.id} value={p.id}>{p.subject} (Sem {p.semester})</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-center text-gray-500 mt-8">Loading Results...</p>}

      {selectedPbl && !loading && marksData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
           <div className="border-b border-gray-100 dark:border-gray-700 p-4">
             <div className="flex gap-2 flex-wrap">
               {activePblDetails?.phases?.map(phase => (
                 <button
                   key={phase.id}
                   onClick={() => setActiveMarksPhase(phase.phaseNumber)}
                   className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                     activeMarksPhase === phase.phaseNumber
                       ? 'bg-indigo-600 text-white shadow-md'
                       : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                   }`}
                 >
                   Phase {phase.phaseNumber} Results
                 </button>
               ))}
             </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-300">
                 <tr>
                   <th className="px-5 py-4">Team</th>
                   <th className="px-5 py-4">Student</th>
                   <th className="px-5 py-4">Roll No</th>
                   <th className="px-5 py-4">Project Level</th>
                   <th className="px-5 py-4">Total Marks</th>
                   <th className="px-5 py-4">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {marksData.map((m, idx) => {
                   const pd = m.phases[activeMarksPhase];
                   return (
                     <tr key={idx} className="border-b dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                       <td className="px-5 py-4 font-bold text-indigo-600 dark:text-indigo-400">{m.teamIdFormatted}</td>
                       <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{m.name}</td>
                       <td className="px-5 py-4 text-gray-500">{m.enrollmentNumber}</td>
                       <td className="px-5 py-4">
                        {m.projectLevel && m.projectLevel !== 'N/A' ? (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-bold whitespace-nowrap">
                            {m.projectLevel}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                       </td>
                       <td className="px-5 py-4 font-black text-gray-800 dark:text-gray-200">
                         {pd?.evaluatorTotalMarks !== null ? (
                            pd.evaluatorTotalMarks === 0 && Object.values(pd.evaluatorMarksData || {}).includes('AB') 
                            ? <span className="text-red-500 font-bold">AB (Absent)</span>
                            : pd.evaluatorTotalMarks
                          ) : <span className="text-gray-400 font-normal italic">Not Evaluated</span>}
                       </td>
                       <td className="px-5 py-4">
                         <button 
                            onClick={() => handleEdit(m, pd)}
                            disabled={pd?.evaluatorTotalMarks === null}
                            className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           Edit Marks
                         </button>
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Edit Marks</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Editing marks for <strong>{editingStudent.name}</strong> ({editingStudent.enrollmentNumber}) in Phase {activeMarksPhase}.
            </p>
            
            <div className="space-y-4 mb-6">
              {getCriteriaForPhase().map(criteria => (
                <div key={criteria.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    {criteria.name} <span className="text-xs text-gray-500 font-normal">(Max: {criteria.maxMarks})</span>
                  </span>
                  <input 
                    type="text" 
                    value={editMarks[criteria.id] || ''} 
                    onChange={(e) => setEditMarks({ ...editMarks, [criteria.id]: e.target.value })}
                    className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button onClick={() => setEditingStudent(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-bold text-sm">Cancel</button>
              <button 
                onClick={handleSaveMarks}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 font-bold text-sm shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResult;
