import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SuperAdminSettings = () => {
  const [moodleUrl, setMoodleUrl] = useState('');
  const [moodleToken, setMoodleToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const res = await axios.get('/api/super-admin/settings', {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      if (res.data.MOODLE_URL) setMoodleUrl(res.data.MOODLE_URL);
      if (res.data.MOODLE_API_TOKEN) setMoodleToken(res.data.MOODLE_API_TOKEN);
    } catch (err) {
      console.error(err);
      setError('Failed to load settings');
    } finally {
      setFetching(false);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.post('/api/super-admin/settings', {
        MOODLE_URL: moodleUrl,
        MOODLE_API_TOKEN: moodleToken
      }, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      setMsg('Settings saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">System Settings & Integrations</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 text-xl font-bold">🎓</div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Headless Moodle Configuration</h3>
            <p className="text-sm text-gray-500 mt-1">Configure your University's Moodle API credentials to enable auto-login, grading sync, and password sync.</p>
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-semibold border border-red-100">{error}</div>}
        {msg && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl text-sm font-semibold border border-green-100">{msg}</div>}

        <form onSubmit={saveSettings} className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700 space-y-5">
            
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Moodle Server URL</label>
              <input 
                type="url" 
                value={moodleUrl} 
                onChange={(e) => setMoodleUrl(e.target.value)}
                placeholder="e.g. https://moodle.geu.ac.in"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">The root URL of your Moodle installation without a trailing slash.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Moodle Web Services API Token</label>
              <input 
                type="password" 
                value={moodleToken} 
                onChange={(e) => setMoodleToken(e.target.value)}
                placeholder="Paste your 32-character Moodle token here"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-mono font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">Generate this token in Moodle: Site administration &gt; Server &gt; Web services &gt; Manage tokens.</p>
            </div>
            
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700 gap-4">
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-orange-600/30 disabled:opacity-70 flex items-center"
            >
              {loading ? 'Saving Config...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
