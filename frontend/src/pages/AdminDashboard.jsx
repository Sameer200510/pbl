import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, UsersRound, Activity, BarChart3, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
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
    const fetchStats = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        let url = `/api/admin/stats`;
        if (selectedPbl) url += `?pblId=${selectedPbl}`;
        
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setStatsData(res.data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, [selectedPbl]);

  const stats = [
    { title: 'Total Students', value: statsData.students, icon: <Users size={24} />, color: 'bg-blue-50 text-blue-600 border border-blue-100' },
    { title: 'Students With Team', value: statsData.studentsWithTeam, icon: <UserCheck size={24} />, color: 'bg-green-50 text-green-600 border border-green-100' },
    { title: 'Students Without Team', value: statsData.studentsWithoutTeam, icon: <UserX size={24} />, color: 'bg-orange-50 text-orange-600 border border-orange-100' },
    { title: 'Total Teams Formed', value: statsData.teams, icon: <UsersRound size={24} />, color: 'bg-indigo-50 text-indigo-600 border border-indigo-100' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Showing stats for 
            {selectedPbl ? (() => {
              const p = pblList.find(x => x.id === selectedPbl);
              return p ? <span className="font-bold text-blue-600 dark:text-blue-400"> {p.subjectShort}</span> : ' All Subjects';
            })() : <span className="font-bold text-blue-600 dark:text-blue-400"> All Subjects</span>}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          {pblList.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">PBL Filter:</label>
              <select
                value={selectedPbl}
                onChange={(e) => setSelectedPbl(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer max-w-[200px]"
              >
                <option value="">All Subjects</option>
                {pblList.map(p => (
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
          <div key={idx} className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{stat.title}</p>
                <p className="text-4xl font-black text-gray-800 dark:text-white mt-2 tracking-tight">{stat.value}</p>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase Progress Chart Placeholder */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white to-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-indigo-500" size={20} /> Phase Progress Overview
            </h3>
          </div>
          <div className="h-64 flex flex-col items-center justify-center bg-gray-100/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center mb-3 border border-gray-100 dark:border-gray-700 text-indigo-500">
              <TrendingUp size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Chart visualization module coming soon</p>
            <p className="text-xs text-gray-400 mt-1">Detailed phase progression will be plotted here</p>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="text-green-500" size={20} /> Recent Activities
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-100/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6">
            <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center mb-3 border border-gray-100 dark:border-gray-700 text-gray-400">
              <Activity size={20} />
            </div>
            <p className="font-medium text-sm">No recent activities found</p>
            <p className="text-xs text-gray-400 mt-1 text-center">System logs and activities will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
