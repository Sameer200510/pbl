import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoImg from '../assets/Graphic-Era-University-GEU-Dehradun-Logo.jpg';

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('LOGIN'); // LOGIN, OTP, CREATE_PASSWORD
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    try {
      const res = await axios.post('/api/auth/login', { identifier, password });
      
      if (res.data.requirePasswordChange) {
        setResetToken(res.data.resetToken);
        setStep('CREATE_PASSWORD');
        setMsg('Welcome! As this is your first login, please set a new password.');
        return;
      }
      
      localStorage.setItem('userInfo', JSON.stringify(res.data));
      
      // Route based on role
      switch (res.data.role) {
        case 'STUDENT': navigate('/student/dashboard'); break;
        case 'FACULTY': navigate('/faculty/dashboard'); break;
        case 'ADMIN': navigate('/admin/dashboard'); break;
        case 'SUPER_ADMIN': navigate('/super-admin/dashboard'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier) return setError('Please enter your Identifier first.');
    setLoading(true); setError(''); setMsg('');
    try {
      await axios.post('/api/auth/request-otp', { identifier });
      setMsg('OTP sent to your registered email address.');
      setStep('OTP');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    try {
      const res = await axios.post('/api/auth/verify-otp', { email: identifier, otp });
      setResetToken(res.data.resetToken);
      setStep('CREATE_PASSWORD');
      setMsg('OTP Verified! Create a new password.');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e) => {
    e.preventDefault();

    // Moodle strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must be at least 8 characters, include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&#).');
      return;
    }

    setLoading(true); setError(''); setMsg('');
    try {
      await axios.post('/api/auth/create-password', { resetToken, newPassword });
      setMsg('Password updated successfully! Please login with your new password.');
      setStep('LOGIN');
      setPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/40 dark:border-gray-700/50">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
              <img src={logoImg} alt="GEU Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">PBL Connect</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Sign in to your unified workspace</p>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800 backdrop-blur-sm">{error}</div>}
          {msg && <div className="mb-6 p-4 bg-green-50/80 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium border border-green-100 dark:border-green-800 backdrop-blur-sm">{msg}</div>}

          {step === 'LOGIN' && (
            <form onSubmit={handleStandardLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Moodle ID</label>
                <input 
                  type="text" 
                  required 
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Enter your Moodle ID"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Password</label>
                  <button type="button" onClick={handleRequestOtp} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors">
                    Forgot Password?
                  </button>
                </div>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <button 
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 mt-4"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 fade-in">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">6-Digit OTP</label>
                <input 
                  type="text" 
                  required 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-widest text-lg font-bold"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type="button" onClick={() => setStep('LOGIN')} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-medium mt-2">
                Back to Login
              </button>
            </form>
          )}

          {step === 'CREATE_PASSWORD' && (
            <form onSubmit={handleCreatePassword} className="space-y-5 fade-in">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input 
                  type="password" 
                  required 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter new password (min 6 chars)"
                  minLength={6}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all active:scale-95 disabled:opacity-70"
              >
                {loading ? 'Saving...' : 'Set Password & Login'}
              </button>
            </form>
          )}

        </div>
      </div>
      
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
