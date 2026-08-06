import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Users, FileSignature, LogOut, ArrowLeft } from 'lucide-react';
import geuLogo from '../assets/Graphic-Era-University-GEU-Dehradun-Logo.jpg';

const FacultyLayout = () => {
  const location = useLocation();
  const navItems = [
    { name: 'Mentored Teams', path: '/faculty/mentor', icon: <Users size={20} /> },
    { name: 'Evaluated Teams', path: '/faculty/evaluator', icon: <FileSignature size={20} /> },
  ];

  const userInfoString = localStorage.getItem('userInfo');
  if (!userInfoString) {
    return <Navigate to="/login" replace />;
  }
  const userInfo = JSON.parse(userInfoString);
  if (userInfo.requiresPasswordChange !== false) {
    return <Navigate to="/change-password" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm flex items-center justify-between px-3 sm:px-6 z-30">
        <div className="flex items-center gap-2 sm:gap-4 h-full">
          <Link to="/faculty/dashboard">
            <img 
              src={geuLogo} 
              alt="Graphic Era University" 
              className="h-8 sm:h-10 object-contain"
            />
          </Link>
          <div className="hidden xs:block w-px h-6 sm:h-8 bg-gray-300 mx-1 sm:mx-2"></div>
          <h1 className="text-sm sm:text-lg font-bold text-[#1c1f58] tracking-wide truncate max-w-[140px] sm:max-w-none">
            Faculty Portal
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-[#1c1f58] truncate max-w-[150px]">
              {userInfo?.name || 'Faculty'}
            </p>
            <p className="text-xs text-gray-500 font-medium truncate max-w-[150px]">
              {userInfo?.email || ''}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#fbc02d] flex items-center justify-center text-[#1c1f58] font-bold shadow-md text-base sm:text-lg shrink-0">
            {userInfo?.name?.charAt(0) || 'F'}
          </div>
          <button 
            onClick={handleLogout}
            title="Logout"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors shadow-sm shrink-0"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex w-full h-full pt-16 overflow-hidden">
        <main className={`flex-1 overflow-y-auto overflow-x-hidden bg-white text-gray-800 ${location.pathname !== '/faculty/dashboard' ? 'p-3 sm:p-5 md:p-8' : 'p-3 sm:p-6'}`}>
          {location.pathname !== '/faculty/dashboard' && (
            <div className="mb-4 sm:mb-6 pb-2 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
               <h2 className="text-xl sm:text-2xl font-bold text-[#1c1f58]">
                 {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'Dashboard'}
               </h2>
               <Link to="/faculty/dashboard" className="text-xs sm:text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
                 <ArrowLeft size={16} /> Back to Role Selection
               </Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FacultyLayout;
