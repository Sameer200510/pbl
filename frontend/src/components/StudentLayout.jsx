import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Users, FileSignature, LogOut } from 'lucide-react';
import geuLogo from '../assets/Graphic-Era-University-GEU-Dehradun-Logo.jpg';

const StudentLayout = () => {
  const location = useLocation();
  const navItems = [
    { name: 'My Team', path: '/student/dashboard', icon: <Users size={20} /> },
    { name: 'Peer Reviews', path: '/student/peer-reviews', icon: <FileSignature size={20} /> }
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
          <h1 className="text-lg font-bold text-[#1c1f58] tracking-wide">Student Portal</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block">
             <p className="text-sm font-semibold text-[#1c1f58]">
               {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.name || 'Student'; } catch { return 'Student'; } })()}
             </p>
             <p className="text-xs text-gray-500 font-medium">
               {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.email || ''; } catch { return ''; } })()}
             </p>
           </div>
           <div className="w-10 h-10 rounded-full bg-[#fbc02d] flex items-center justify-center text-[#1c1f58] font-bold cursor-pointer shadow-md text-lg">
             {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.name?.charAt(0) || 'S'; } catch { return 'S'; } })()}
           </div>
        </div>
      </header>

      <div className="flex w-full h-full pt-16">
        <aside className="w-64 flex flex-col bg-[#1c1f58] text-white shadow-xl z-10">
          <nav className="flex-1 py-6 space-y-2 px-4 overflow-y-auto">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Main Menu</div>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[#131540] text-[#fbc02d] shadow-inner'
                      : 'text-gray-300 hover:bg-[#292d7c] hover:text-white'
                  }`}
                  style={isActive ? { borderLeft: '4px solid #fbc02d' } : { borderLeft: '4px solid transparent' }}
                >
                  <span className={`mr-3 text-lg ${isActive ? 'text-[#fbc02d]' : 'text-gray-400'}`}>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-white/10">
            <button 
              onClick={() => {
                localStorage.removeItem('userInfo');
                localStorage.removeItem('student_selected_semester');
                window.location.href = '/login';
              }}
              className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <span className="mr-3 text-lg"><LogOut size={20} /></span> Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-8 bg-white text-gray-800">
          <div className="mb-6 pb-2 border-b border-gray-100 flex justify-between items-center">
             <h2 className="text-2xl font-bold text-[#1c1f58]">
               {navItems.find(i => location.pathname === i.path)?.name || 'Dashboard'}
             </h2>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
