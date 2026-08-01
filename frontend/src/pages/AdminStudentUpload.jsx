import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const AdminStudentUpload = () => {
  const [excelData, setExcelData] = useState(null);
  const [fileColumns, setFileColumns] = useState([]);
  const [mapping, setMapping] = useState({ 
    name: '', email: '', rollNo: '', section: '', moodleId: '', password: '' 
  });
  const [targetSemester, setTargetSemester] = useState('1');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [wipeOldData, setWipeOldData] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [skippedStudents, setSkippedStudents] = useState([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualStudent, setManualStudent] = useState({ name: '', email: '', rollNo: '', section: '', moodleId: '', password: '' });
  
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState('All');

  const fetchStudents = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get('/api/admin/students', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setAllStudents(res.data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleFileUpload = (e) => {
    setUploadError('');
    setUploadSuccess('');
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
        
        // Auto-guess mapping
        const autoMap = { name: '', email: '', rollNo: '', section: '', moodleId: '', password: '' };
        cols.forEach(c => {
          const lower = c.toLowerCase();
          if (lower.includes('name')) autoMap.name = c;
          if (lower.includes('email')) autoMap.email = c;
          if (lower.includes('roll') || lower.includes('enroll')) autoMap.rollNo = c;
          if (lower.includes('sec')) autoMap.section = c;
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
    setUploadSuccess('');
    
    if (!mapping.name || !mapping.rollNo || !mapping.section) {
      return setUploadError('Name, Roll No, and Section mappings are required');
    }

    const students = excelData.map(row => ({
      name: row[mapping.name],
      email: mapping.email ? row[mapping.email] : undefined,
      rollNo: row[mapping.rollNo],
      section: row[mapping.section],
      moodleId: mapping.moodleId ? row[mapping.moodleId] : undefined,
      password: mapping.password ? String(row[mapping.password]) : undefined
    }));

    try {
      setUploadLoading(true);
      setUploadProgress(0);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      
      const CHUNK_SIZE = 100;
      let totalAdded = 0;
      let totalUpdated = 0;
      let totalProcessed = 0;
      let allSkipped = [];

      for (let i = 0; i < students.length; i += CHUNK_SIZE) {
        const chunk = students.slice(i, i + CHUNK_SIZE);
        const isFirstChunk = i === 0;

        const res = await axios.post('/api/admin/students/bulk', 
          { students: chunk, semester: parseInt(targetSemester), wipeOldData: isFirstChunk ? wipeOldData : false },
          { headers: { Authorization: `Bearer ${userInfo.token}` } }
        );

        if (res.data.added) totalAdded += res.data.added;
        if (res.data.updated) totalUpdated += res.data.updated;
        if (res.data.skipped) allSkipped = [...allSkipped, ...res.data.skipped];

        totalProcessed += chunk.length;
        setUploadProgress(Math.round((totalProcessed / students.length) * 100));
      }

      setUploadSuccess(`Success! Added ${totalAdded} and updated ${totalUpdated} students.`);
      setSkippedStudents(allSkipped);
      setExcelData(null);
      fetchStudents();
      setTimeout(() => setUploadProgress(0), 3000);
    } catch (err) {
      console.error("Excel upload error details:", err);
      alert("Error: " + (err.response?.data?.message || err.message || 'Upload failed'));
      setUploadError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const submitManualStudent = async (e) => {
    e.preventDefault();
    if (!manualStudent.name || !manualStudent.rollNo || !manualStudent.section) {
      return setUploadError('Name, Roll No, and Section are required');
    }
    setUploadError('');
    setUploadSuccess('');
    try {
      setUploadLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.post('/api/admin/students/bulk', 
        { students: [manualStudent], semester: parseInt(targetSemester), wipeOldData: false },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      setUploadSuccess(res.data.message || 'Student added successfully!');
      setManualStudent({ name: '', email: '', rollNo: '', section: '', moodleId: '', password: '' });
      setShowManualForm(false);
      fetchStudents();
    } catch (err) {
      console.error("Upload error details:", err);
      alert("Error: " + (err.response?.data?.message || err.message || 'Upload failed'));
      setUploadError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Bulk Upload Students</h2>
        <button onClick={() => setShowManualForm(!showManualForm)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm font-medium">
          {showManualForm ? 'Back to Excel Upload' : '➕ Manual Add Student'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Upload Excel (.xlsx, .csv)</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload an Excel file containing student details to create or update their accounts. 
            Students will be able to log in immediately using the provided email and Moodle password.
          </p>
        </div>

        {uploadError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-800">
            {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium border border-green-100 dark:border-green-800 flex justify-between items-center">
            {uploadSuccess}
            <button onClick={() => setUploadSuccess('')} className="text-lg font-bold hover:opacity-70">&times;</button>
          </div>
        )}

        <div className="mb-6 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Target Semester for these Students</label>
            <select
              value={targetSemester}
              onChange={(e) => setTargetSemester(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center mt-6 sm:mt-0 sm:ml-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
            <input 
              type="checkbox" 
              id="wipeOld" 
              checked={wipeOldData} 
              onChange={e => setWipeOldData(e.target.checked)} 
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="wipeOld" className="ml-2 text-sm font-bold text-red-700 dark:text-red-400 cursor-pointer">
              Wipe Old Students for this Semester
            </label>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Excel File</label>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer dark:file:bg-gray-700 dark:file:text-gray-300"
            />
          </div>
        </div>

        {showManualForm ? (
          <form onSubmit={submitManualStudent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input required type="text" value={manualStudent.name} onChange={e => setManualStudent({...manualStudent, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Roll No *</label>
                <input required type="text" value={manualStudent.rollNo} onChange={e => setManualStudent({...manualStudent, rollNo: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Section *</label>
                <input required type="text" value={manualStudent.section} onChange={e => setManualStudent({...manualStudent, section: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email (Optional)</label>
                <input type="email" value={manualStudent.email} onChange={e => setManualStudent({...manualStudent, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Moodle ID (Optional)</label>
                <input type="text" value={manualStudent.moodleId} onChange={e => setManualStudent({...manualStudent, moodleId: e.target.value})} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button disabled={uploadLoading} type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                {uploadLoading ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        ) : !excelData ? (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer relative mt-4">
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="flex flex-col items-center pointer-events-none">
              <span className="text-5xl mb-4">📄</span>
              <span className="text-lg text-gray-700 dark:text-gray-300 font-bold mb-2">Click or Drag & Drop Excel File</span>
              <span className="text-sm text-gray-500">Must contain Name, Roll No, and Section. Email, Moodle ID and Password are optional.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-medium border border-blue-100 dark:border-blue-800 flex justify-between items-center">
              <span>✅ File loaded successfully! Found {excelData.length} rows. Please map your columns below.</span>
              <button onClick={() => setExcelData(null)} className="px-3 py-1 bg-white dark:bg-gray-800 shadow-sm rounded text-gray-600 text-xs font-bold hover:bg-gray-50 border">Cancel / Upload Different File</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['name', 'email', 'rollNo', 'section', 'moodleId', 'password'].map((field) => (
                <div key={field} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()} Column 
                    {['name', 'rollNo', 'section'].includes(field) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <select 
                    value={mapping[field]} 
                    onChange={(e) => setMapping({...mapping, [field]: e.target.value})} 
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Select Column --</option>
                    {fileColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-end pt-4 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={submitMappedData}
                disabled={uploadLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-70 flex items-center mb-2"
              >
                {uploadLoading ? `Uploading... ${uploadProgress}%` : `Confirm & Upload ${excelData.length} Students`}
              </button>
              {uploadLoading && (
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {skippedStudents.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
            ⚠️ Skipped Students ({skippedStudents.length})
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            These students were skipped because their rows were missing mandatory fields (Name, Roll No, or Section).
          </p>
          <div className="max-h-60 overflow-y-auto bg-white dark:bg-gray-900 rounded-xl border border-red-100 dark:border-red-800">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-red-50/50 dark:bg-red-900/50 sticky top-0">
                <tr>
                  <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Roll No</th>
                  <th className="p-3 font-semibold text-gray-700 dark:text-gray-300">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {skippedStudents.map((s, idx) => (
                  <tr key={idx} className="hover:bg-red-50/30 dark:hover:bg-red-900/30">
                    <td className="p-3 text-gray-700 dark:text-gray-300">{s.name}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{s.rollNo}</td>
                    <td className="p-3 text-red-600 dark:text-red-400">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Directory Section */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Student Directory ({allStudents.length})</h3>
          
          <div className="flex gap-4 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search Name or Roll No..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            />
            <select 
              value={filterSemester} 
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
            >
              <option value="All">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Roll No</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Section</th>
                <th className="p-4 font-semibold">Semester</th>
                <th className="p-4 font-semibold">Moodle ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {allStudents
                .filter(s => filterSemester === 'All' || s.semester === parseInt(filterSemester))
                .filter(s => 
                  s.user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  s.enrollmentNumber.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="p-4 text-gray-800 dark:text-gray-200 font-medium">{student.user.name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{student.enrollmentNumber}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{student.user.email}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{student.section || '-'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">Sem {student.semester}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{student.moodleId || '-'}</td>
                  </tr>
                ))}
              {allStudents.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">No students found. Upload some above!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminStudentUpload;
