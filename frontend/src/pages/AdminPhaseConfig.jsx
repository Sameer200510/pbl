import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminPhaseConfig = () => {
  const [pbls, setPbls] = useState([]);
  const [selectedPbl, setSelectedPbl] = useState('');
  
  const [configs, setConfigs] = useState([
    { phaseNumber: 1, instructions: '', evaluationCriteria: [] },
    { phaseNumber: 2, instructions: '', evaluationCriteria: [] },
    { phaseNumber: 3, instructions: '', evaluationCriteria: [] },
  ]);
  const [activeTab, setActiveTab] = useState(1);

  useEffect(() => {
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
    fetchPbls();
  }, []);

  useEffect(() => {
    if (!selectedPbl) {
      setConfigs([
        { phaseNumber: 1, instructions: '', evaluationCriteria: [], moodleAssignmentId: '' },
        { phaseNumber: 2, instructions: '', evaluationCriteria: [], moodleAssignmentId: '' },
        { phaseNumber: 3, instructions: '', evaluationCriteria: [], moodleAssignmentId: '' },
      ]);
      return;
    }

    const pbl = pbls.find(p => p.id === selectedPbl);
    if (pbl && pbl.phases && pbl.phases.length > 0) {
      const newConfigs = [1, 2, 3].map(num => {
        const existing = pbl.phases.find(ph => ph.phaseNumber === num);
        return {
          phaseNumber: num,
          instructions: existing?.instructions || '',
          evaluationCriteria: existing?.evaluationCriteria || [],
          moodleAssignmentId: existing?.moodleAssignmentId || ''
        };
      });
      setConfigs(newConfigs);
    } else {
      setConfigs([
        { phaseNumber: 1, instructions: '', evaluationCriteria: [], moodleAssignmentId: '' },
        { phaseNumber: 2, instructions: '', evaluationCriteria: [], moodleAssignmentId: '' },
        { phaseNumber: 3, instructions: '', evaluationCriteria: [], moodleAssignmentId: '' },
      ]);
    }
  }, [selectedPbl, pbls]);

  const addCriteria = (phaseIdx) => {
    const newConfigs = [...configs];
    newConfigs[phaseIdx].evaluationCriteria.push({ field: '', maxMarks: 10 });
    setConfigs(newConfigs);
  };

  const removeCriteria = (phaseIdx, critIdx) => {
    const newConfigs = [...configs];
    newConfigs[phaseIdx].evaluationCriteria.splice(critIdx, 1);
    setConfigs(newConfigs);
  };

  const updateCriteria = (phaseIdx, critIdx, field, value) => {
    const newConfigs = [...configs];
    newConfigs[phaseIdx].evaluationCriteria[critIdx][field] = value;
    setConfigs(newConfigs);
  };

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedPbl) return alert("Select a PBL first!");
    setLoading(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post(`/api/admin/pbl/${selectedPbl}/phase-config`, {
        phaseConfigs: configs
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert('Phase Configurations saved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save Phase config (Moodle might be unreachable)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Phase Configuration Builder</h2>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Select PBL</label>
          <select 
            value={selectedPbl} 
            onChange={(e) => setSelectedPbl(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- Select a PBL --</option>
            {pbls.map(p => (
              <option key={p.id} value={p.id}>{p.subject} ({p.subjectShort} - Sem {p.semester})</option>
            ))}
          </select>
        </div>

        {selectedPbl && (
          <div>
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              {[1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => setActiveTab(num)}
                  className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === num 
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Phase {num}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions for Students</label>
                <textarea 
                  rows="3"
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. Upload your project synopsis in PDF format..."
                  value={configs[activeTab - 1].instructions}
                  onChange={(e) => {
                    const newConfigs = [...configs];
                    newConfigs[activeTab - 1].instructions = e.target.value;
                    setConfigs(newConfigs);
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moodle Assignment ID (Optional)</label>
                <input 
                  type="text"
                  className="w-full md:w-1/2 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                  placeholder="e.g. 10452"
                  value={configs[activeTab - 1].moodleAssignmentId}
                  onChange={(e) => {
                    const newConfigs = [...configs];
                    newConfigs[activeTab - 1].moodleAssignmentId = e.target.value;
                    setConfigs(newConfigs);
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">If provided, files uploaded for this phase will be synced to Moodle.</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Evaluation Criteria (For Evaluator marking)</label>
                  <button onClick={() => addCriteria(activeTab - 1)} className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1 rounded text-gray-800 dark:text-gray-200">+ Add Field</button>
                </div>
                
                {configs[activeTab - 1].evaluationCriteria.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No criteria added. Click + Add Field.</p>
                ) : (
                  <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                    {configs[activeTab - 1].evaluationCriteria.map((crit, idx) => (
                      <div key={idx} className="flex gap-4 items-center">
                        <input 
                          type="text" 
                          placeholder="Criterion Name (e.g. Innovation)"
                          className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                          value={crit.field}
                          onChange={(e) => updateCriteria(activeTab - 1, idx, 'field', e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="Max Marks"
                          className="w-24 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                          value={crit.maxMarks}
                          onChange={(e) => updateCriteria(activeTab - 1, idx, 'maxMarks', parseInt(e.target.value) || 0)}
                        />
                        <button onClick={() => removeCriteria(activeTab - 1, idx)} className="text-red-500 hover:text-red-700 p-2">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button 
                  onClick={handleSave} 
                  disabled={loading}
                  className={`px-6 py-2 text-white rounded-lg shadow-sm font-medium transition-colors ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {loading ? 'Saving...' : 'Save All Configurations'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPhaseConfig;
