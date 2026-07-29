import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ChangePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo.token) {
      setError('Session expired. Please login again.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        '/api/auth/force-change-password',
        { newPassword: password },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );

      // Update local storage to reflect password change
      const updatedUserInfo = { ...userInfo, requiresPasswordChange: false };
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));

      // Redirect based on role
      switch (userInfo.role) {
        case 'SUPER_ADMIN':
          navigate('/super-admin/dashboard');
          break;
        case 'ADMIN':
          navigate('/admin/dashboard');
          break;
        case 'FACULTY':
          navigate('/faculty/dashboard');
          break;
        case 'STUDENT':
          navigate('/student/dashboard');
          break;
        default:
          navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6]">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border-t-4 border-[#1c1f58]">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#1c1f58] mb-2">Change Your Password</h2>
          <p className="text-gray-600 text-sm">
            For security reasons, you must change your default password before accessing the portal.
            This will also update your password on Moodle.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#fbc02d] focus:border-[#1c1f58] outline-none transition-colors"
              placeholder="Enter new password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#fbc02d] focus:border-[#1c1f58] outline-none transition-colors"
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold tracking-wide transition-all ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1c1f58] hover:bg-[#131540] shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? 'Updating...' : 'Update Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
