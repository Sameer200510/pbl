import { useState, useEffect } from 'react';
import axios from 'axios';

const SuperAdminDashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [settings, setSettings] = useState({
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: '',
    awsS3Bucket: '',
    useS3Storage: false
  });
  const [settingsMsg, setSettingsMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get('/api/admin/settings', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      if (res.data) {
        setSettings({
          awsAccessKeyId: res.data.awsAccessKeyId || '',
          awsSecretAccessKey: res.data.awsSecretAccessKey || '',
          awsRegion: res.data.awsRegion || '',
          awsS3Bucket: res.data.awsS3Bucket || '',
          useS3Storage: res.data.useS3Storage || false
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsMsg({ type: '', text: '' });
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.put('/api/admin/settings', settings, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setSettingsMsg({ type: 'success', text: 'Storage settings saved successfully.' });
    } catch (error) {
      setSettingsMsg({ type: 'error', text: 'Failed to save settings.' });
    }
  };

  const actions = [
    {
      id: 'teams',
      title: 'Wipe All Teams',
      desc: 'Deletes all Teams, Team Members, and Submissions.',
      endpoint: '/api/super-admin/wipe/teams',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      id: 'pbls',
      title: 'Wipe All PBLs',
      desc: 'Deletes all PBL Subjects, Phases, Teams, and Submissions.',
      endpoint: '/api/super-admin/wipe/pbls',
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      id: 'students',
      title: 'Wipe All Students',
      desc: 'Deletes all Student Profiles and Student Users.',
      endpoint: '/api/super-admin/wipe/students',
      color: 'bg-pink-600 hover:bg-pink-700',
    },
    {
      id: 'faculty',
      title: 'Wipe All Faculty',
      desc: 'Deletes all Faculty Profiles and Faculty Users.',
      endpoint: '/api/super-admin/wipe/faculty',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      id: 'all',
      title: 'NUKE DATABASE',
      desc: 'Wipes everything. Reset the database to factory settings.',
      endpoint: '/api/super-admin/wipe/all',
      color: 'bg-gray-900 hover:bg-black ring-2 ring-red-500',
    }
  ];

  const handleWipeClick = (action) => {
    setCurrentAction(action);
    setConfirmText('');
    setMsg({ type: '', text: '' });
    setShowModal(true);
  };

  const executeWipe = async () => {
    if (confirmText !== 'DELETE') return;
    
    setLoading(true);
    setMsg({ type: '', text: '' });
    
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.delete(`${currentAction.endpoint}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      
      setMsg({ type: 'success', text: res.data.message || 'Operation successful' });
      setShowModal(false);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to execute operation' });
    } finally {
      setLoading(false);
      setConfirmText('');
    }
  };

  return (
    <div className="space-y-10 fade-in pb-10">
      
      {/* Storage Settings Section */}
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm">
        <h3 className="text-2xl font-bold text-[#1c1f58] mb-6 flex items-center gap-3">
          <span className="text-blue-500">☁️</span> AWS S3 Storage Settings
        </h3>
        
        {settingsMsg.text && (
          <div className={`p-4 mb-6 rounded-xl font-bold ${settingsMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {settingsMsg.text}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <input 
              type="checkbox" 
              id="useS3Storage"
              name="useS3Storage"
              checked={settings.useS3Storage}
              onChange={handleSettingsChange}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="useS3Storage" className="font-semibold text-gray-800 cursor-pointer">
              Enable AWS S3 Storage (Disables Local Storage)
            </label>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${!settings.useS3Storage ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">AWS Access Key ID</label>
              <input 
                type="text" 
                name="awsAccessKeyId"
                value={settings.awsAccessKeyId}
                onChange={handleSettingsChange}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="AKIAIOSFODNN7EXAMPLE" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">AWS Secret Access Key</label>
              <input 
                type="password" 
                name="awsSecretAccessKey"
                value={settings.awsSecretAccessKey}
                onChange={handleSettingsChange}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">AWS Region</label>
              <input 
                type="text" 
                name="awsRegion"
                value={settings.awsRegion}
                onChange={handleSettingsChange}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="ap-south-1" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">S3 Bucket Name</label>
              <input 
                type="text" 
                name="awsS3Bucket"
                value={settings.awsS3Bucket}
                onChange={handleSettingsChange}
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="geu-pbl-reports" 
              />
            </div>
          </div>

          <button 
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            Save Storage Settings
          </button>
        </form>
      </div>

      <div className="bg-red-900/10 border border-red-500/30 p-8 rounded-2xl">
        <h3 className="text-2xl font-bold text-red-500 flex items-center gap-3 mb-4">
          <span>⚠️</span> DANGER ZONE
        </h3>
        <p className="text-red-400 mb-8 font-medium">
          The actions below are irreversible. They will permanently delete data from the database. 
          Please proceed with extreme caution.
        </p>
      </div>

      {msg.text && !showModal && (
        <div className={`p-4 rounded-xl font-bold ${msg.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map(action => (
          <div key={action.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h4 className="text-lg font-bold text-gray-100">{action.title}</h4>
              <p className="text-sm text-gray-400 mt-2">{action.desc}</p>
            </div>
            <button
              onClick={() => handleWipeClick(action)}
              className={`mt-6 w-full py-3 rounded-xl text-white font-bold transition-all shadow-lg ${action.color}`}
            >
              Execute
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {showModal && currentAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <h3 className="text-xl font-bold text-white mb-2">Confirm Action</h3>
            <p className="text-gray-400 mb-6 text-sm">
              You are about to execute: <strong className="text-red-400">{currentAction.title}</strong>.<br/>
              {currentAction.desc}<br/><br/>
              To confirm, type <span className="font-mono bg-gray-800 text-red-400 px-2 py-1 rounded">DELETE</span> below.
            </p>
            
            {msg.text && showModal && (
              <div className="mb-4 p-3 bg-red-900/50 text-red-400 border border-red-800 rounded-lg text-sm">
                {msg.text}
              </div>
            )}

            <input
              type="text"
              placeholder="Type DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500 mb-6 font-mono text-center"
            />
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeWipe}
                disabled={confirmText !== 'DELETE' || loading}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Executing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
