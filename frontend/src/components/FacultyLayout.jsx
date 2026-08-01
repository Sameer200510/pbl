import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Users, FileSignature, LogOut } from 'lucide-react';
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

  return (
    <div className="flex h-screen bg-white font-sans">
      <header className="absolute top-0 w-full h-16 bg-white shadow-sm flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4 h-full">
          <img 
            src={geuLogo} 
            alt="Graphic Era University" 
            className="h-10 object-contain"
          />
          <div className="w-px h-8 bg-gray-300 mx-2"></div>
          <h1 className="text-lg font-bold text-[#1c1f58] tracking-wide">Faculty Portal</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block">
             <p className="text-sm font-semibold text-[#1c1f58]">
               {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.name || 'Faculty'; } catch { return 'Faculty'; } })()}
             </p>
             <p className="text-xs text-gray-500 font-medium">
               {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.email || ''; } catch { return ''; } })()}
             </p>
           </div>
           <div className="w-10 h-10 rounded-full bg-[#fbc02d] flex items-center justify-center text-[#1c1f58] font-bold shadow-md text-lg">
             {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.name?.charAt(0) || 'F'; } catch { return 'F'; } })()}
           </div>
           <button 
             onClick={() => {
               localStorage.removeItem('userInfo');
               window.location.href = '/login';
             }}
             title="Logout"
             className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 hover:bg-red-200 transition-colors shadow-sm"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
           </button>
        </div>
      </header>

      <div className="flex w-full h-full pt-16">


        <main className={`flex-1 overflow-auto bg-white text-gray-800 ${location.pathname !== '/faculty/dashboard' ? 'p-8' : ''}`}>
          {location.pathname !== '/faculty/dashboard' && (
            <div className="mb-6 pb-2 border-b border-gray-100 flex justify-between items-center">
               <h2 className="text-2xl font-bold text-[#1c1f58]">
                 {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'Dashboard'}
               </h2>
               <Link to="/faculty/dashboard" className="text-sm font-semibold text-blue-600 hover:underline">
                 ← Back to Role Selection
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
