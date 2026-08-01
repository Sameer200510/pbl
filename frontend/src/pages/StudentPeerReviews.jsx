import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentPeerReviews = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedTask, setSelectedTask] = useState(null);
  const [marksData, setMarksData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get('/api/student/micro-mentor/tasks', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const PEER_REVIEW_CRITERIA = [
    { field: 'Overall Project Score', maxMarks: 10 }
  ];

  const openEvaluationModal = (task) => {
    setSelectedTask(task);
    if (task.isEvaluated && task.myEvaluation) {
      setMarksData(task.myEvaluation.marksData);
    } else {
      // Initialize with empty marks
      const initData = {};
      PEER_REVIEW_CRITERIA.forEach(c => {
        initData[c.field] = '';
      });
      setMarksData(initData);
    }
  };

  const handleEvaluateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post(`/api/student/micro-mentor/evaluate/${selectedTask.id}`, {
        marksData
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert('Peer Evaluation Submitted!');
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Peer Reviews</h2>
          <p className="text-sm text-gray-500 mt-1">
            Anonymously review and grade other teams' projects assigned to you.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading your peer review tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">✅</div>
          You have no pending peer review tasks. 
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Assigned Project (Anonymous)</h3>
                  <p className="text-sm text-gray-500">Phase {task.phase.phaseNumber}</p>
                </div>
                {task.isEvaluated ? (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Evaluated</span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Pending Action</span>
                )}
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Project Resources</h4>
                  {task.examineeProject.synopsisUrl ? (
                    <a href={task.examineeProject.synopsisUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-2">
                      📄 View Primary Submission (Synopsis / Link)
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No primary submission link available.</p>
                  )}

                  {task.examineeProject.fileUrls && task.examineeProject.fileUrls.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Files</p>
                      <ul className="space-y-1">
                        {task.examineeProject.fileUrls.map((url, i) => (
                          <li key={i}>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              📎 Attachment {i + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => openEvaluationModal(task)}
                className={`w-full py-2.5 rounded-xl font-bold transition-colors ${
                  task.isEvaluated 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {task.isEvaluated ? 'View/Edit My Grade' : 'Grade this Project'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Evaluation Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Evaluate Project</h3>
            <p className="text-sm text-gray-500 mb-6">Phase {selectedTask.phase.phaseNumber} Peer Review</p>

            <form onSubmit={handleEvaluateSubmit} className="space-y-4">
              {PEER_REVIEW_CRITERIA.map((crit, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg border">
                  <label className="block text-sm font-bold text-gray-700 mb-1">{crit.field}</label>
                  <div className="flex justify-between items-center gap-4">
                    <input
                      type="number"
                      required
                      min="0"
                      max={crit.maxMarks}
                      step="0.5"
                      value={marksData[crit.field] || ''}
                      onChange={e => setMarksData(prev => ({ ...prev, [crit.field]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder={`0 - ${crit.maxMarks}`}
                    />
                    <span className="text-sm font-bold text-gray-400 whitespace-nowrap">/ {crit.maxMarks}</span>
                  </div>
                </div>
              ))}



              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setSelectedTask(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button disabled={submitting} type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">
                  {submitting ? 'Submitting...' : 'Submit Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPeerReviews;
