import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, UsersRound, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const AdminDashboard = () => {
  const [selectedPbl, setSelectedPbl] = useState('');
  const [pblList, setPblList] = useState([]);
  const defaultGraphData = [
    { name: 'Step 1: Teams', value: 0 },
    { name: 'Step 2: Mentors', value: 0 },
    { name: 'Step 3: Phase 1', value: 0 },
    { name: 'Step 4: Phase 2', value: 0 },
    { name: 'Step 5: Phase 3', value: 0 }
  ];

  const [statsData, setStatsData] = useState({
    students: 0,
    teams: 0,
    faculty: 0,
    activePbls: 0,
    studentsWithTeam: 0,
    studentsWithoutTeam: 0,
    graphData: defaultGraphData
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
        setStatsData({
          ...res.data,
          graphData: res.data.graphData?.length ? res.data.graphData : defaultGraphData
        });
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

      <div className="mt-6">
        {/* Phase Progress Chart */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-indigo-500" size={20} /> PBL Phase Progress Overview
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData.graphData || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
