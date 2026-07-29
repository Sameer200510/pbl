import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [selectedPbl, setSelectedPbl] = useState('');
  const [pblList, setPblList] = useState([]);
  const [statsData, setStatsData] = useState({
    students: 0,
    teams: 0,
    faculty: 0,
    activePbls: 0,
    studentsWithTeam: 0,
    studentsWithoutTeam: 0
  });

  useEffect(() => {
    const fetchPbls = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const res = await axios.get('/api/admin/pbl', {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setPblList(res.data);
      } catch (err) {
        console.error('Failed to fetch PBLs', err);
      }
    };
    fetchPbls();
  }, []);

  useEffect(() => {
    setSelectedPbl('');
  }, [selectedSemester]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        let url = `/api/admin/stats?semester=${selectedSemester}`;
        if (selectedPbl) url += `&pblId=${selectedPbl}`;
        
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setStatsData(res.data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, [selectedSemester, selectedPbl]);

  const stats = [
    { title: 'Total Students', value: statsData.students, icon: '🎓', color: 'bg-blue-100 text-blue-600' },
    { title: 'Students With Team', value: statsData.studentsWithTeam, icon: '✅', color: 'bg-green-100 text-green-600' },
    { title: 'Students Without Team', value: statsData.studentsWithoutTeam, icon: '⚠️', color: 'bg-orange-100 text-orange-600' },
    { title: 'Total Teams Formed', value: statsData.teams, icon: '🤝', color: 'bg-indigo-100 text-indigo-600' },
  ];

  const filteredPbls = pblList.filter(p => String(p.semester) === String(selectedSemester));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Showing stats for <span className="font-bold text-blue-600 dark:text-blue-400">Semester {selectedSemester}</span>
            {selectedPbl && (() => {
              const p = pblList.find(x => x.id === selectedPbl);
              return p ? ` > ${p.subjectShort}` : '';
            })()}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Select Semester:</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
          
          {filteredPbls.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">PBL Filter:</label>
              <select
                value={selectedPbl}
                onChange={(e) => setSelectedPbl(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer max-w-[200px]"
              >
                <option value="">All Subjects</option>
                {filteredPbls.map(p => (
                  <option key={p.id} value={p.id}>{p.subjectShort}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase Progress Chart Placeholder */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Phase Progress Overview</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Chart Visualization (e.g. Recharts) goes here</p>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Activities</h3>
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>No recent activities</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
