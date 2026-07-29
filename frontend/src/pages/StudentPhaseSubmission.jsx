import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const StudentPhaseSubmission = () => {
  const { phaseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('teamId');
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  
  // Form states
  const [fileUrl, setFileUrl] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    fetchTeamAndSubmission();
  }, [phaseId]);

  const fetchTeamAndSubmission = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const teamRes = await axios.get('/api/student/team/my-team', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      
      const teamsArray = teamRes.data;
      const currentTeam = teamId ? teamsArray.find(t => t.id === teamId) : teamsArray[0];
      if (currentTeam) {
        setTeam(currentTeam);
        const subRes = await axios.get(`/api/student/team/${currentTeam.id}/phase/${phaseId}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        if (subRes.data) {
          setSubmission(subRes.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      
      const formData = new FormData();
      formData.append('teamId', team.id);
      formData.append('phaseNumber', phaseId);
      if (fileUrl) {
        formData.append('fileUrls', JSON.stringify({ additionalLink: fileUrl }));
      }
      if (reportFile) {
        formData.append('report', reportFile);
      }

      const res = await axios.post('/api/student/phase', formData, {
        headers: { 
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSubmission(res.data.submission);
      setIsResubmitting(false);
      alert('Phase submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Phase Data...</div>;

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 text-gray-600">
          ←
        </button>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Phase {phaseId} Submission</h2>
      </div>

      {!team && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl">
          You must be part of a team to submit a phase.
        </div>
      )}      {team && (() => {
        const isLeader = team.leaderId === JSON.parse(localStorage.getItem('userInfo'))?.studentProfileId;
        return (
        <>
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Instructions & Guidelines</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {isLeader ? (
                "As the Team Leader, you are responsible for submitting your team's Synopsis & project report in PDF format (Max 10MB). You can also provide an additional link to your code repository, video demonstration, or prototype."
              ) : (
                "Note: Only the Team Leader is authorized to submit or resubmit the Phase Synopsis & Report. As a team member, you can monitor the upload status, view submitted documents, and check grades awarded by your mentor."
              )}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Submission & Grade Status</h3>
            
            {submission && !isResubmitting ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      submission.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      submission.status === 'GRADED' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {submission.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500 block mb-1">Synopsis / Report Document:</span>
                      <a href={submission.synopsisUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all font-semibold">
                        📄 View Submitted Synopsis/Report
                      </a>
                      <div className="text-xs text-gray-400 mt-0.5 break-all">{submission.synopsisUrl}</div>
                    </div>
                    {submission.fileUrls?.additionalLink && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-500 block mb-1">Additional Project Link:</span>
                        <a href={submission.fileUrls.additionalLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all font-semibold">
                          🔗 {submission.fileUrls.additionalLink}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {submission.mentorGrades && submission.mentorGrades.length > 0 && (
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-blue-900 dark:text-blue-300 text-base">Mentor Evaluation & Marks</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        submission.mentorGrades[0].grade === 1 
                          ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100' 
                          : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100'
                      }`}>
                        {submission.mentorGrades[0].grade === 1 ? 'APPROVED (Grade: 1)' : 'REJECTED / NEEDS REVISION (Grade: 0)'}
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4 mt-2 bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
                      <strong>Mentor Remarks:</strong> {submission.mentorGrades[0].remarks || 'No remarks provided.'}
                    </p>
                    {submission.mentorGrades[0].grade === 0 && (
                      isLeader ? (
                        <button 
                          onClick={() => setIsResubmitting(true)}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
                        >
                          🔄 Resubmit Synopsis / Phase Report
                        </button>
                      ) : (
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-lg text-xs font-bold flex items-center gap-2">
                          <span>⚠️</span> This phase requires revision. Awaiting resubmission by your Team Leader.
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : !isLeader ? (
              <div className="p-10 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mx-auto mb-4">
                  👥
                </div>
                <h4 className="font-bold text-xl text-gray-800 dark:text-white mb-2">Awaiting Team Leader Submission</h4>
                <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed mb-4">
                  The Synopsis and Phase {phaseId} Report have not been uploaded yet. As a Team Member, you have view-only access. 
                </p>
                <div className="inline-block px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-800">
                  👉 Once your Team Leader uploads the report, you can view the document, status, and mentor grades here!
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Upload Synopsis / Phase Report (PDF) <span className="text-red-500">*</span></label>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    required
                    onChange={(e) => setReportFile(e.target.files[0])}
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Please upload a valid PDF document (Max 10MB).</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Additional Link (Code / Video / Prototype)</label>
                  <input 
                    type="url" 
                    placeholder="https://github.com/..."
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-4">
                  <button 
                    type="submit" 
                    disabled={submitLoading}
                    className="flex-1 py-3 bg-primary text-white rounded-xl shadow-md font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {submitLoading ? 'Submitting...' : 'Submit Phase & Synopsis'}
                  </button>
                  {isResubmitting && (
                    <button 
                      type="button" 
                      onClick={() => setIsResubmitting(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </>
      );
    })()}
    </div>
  );
};

export default StudentPhaseSubmission;
