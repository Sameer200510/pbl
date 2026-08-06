import { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Users, FileSignature, LogOut, Menu, X } from 'lucide-react';
import geuLogo from '../assets/Graphic-Era-University-GEU-Dehradun-Logo.jpg';

const StudentLayout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('student_selected_semester');
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm flex items-center justify-between px-3 sm:px-6 z-30">
        <div className="flex items-center gap-2 sm:gap-4 h-full">
          {/* Mobile Hamburger Toggle Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#1c1f58] hover:bg-gray-100 focus:outline-none transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <img 
            src={geuLogo} 
            alt="Graphic Era University" 
            className="h-8 sm:h-10 object-contain"
          />
          <div className="hidden xs:block w-px h-6 sm:h-8 bg-gray-300 mx-1 sm:mx-2"></div>
          <h1 className="text-sm sm:text-lg font-bold text-[#1c1f58] tracking-wide truncate max-w-[140px] sm:max-w-none">
            Student Portal
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-[#1c1f58] truncate max-w-[150px]">
              {userInfo?.name || 'Student'}
            </p>
            <p className="text-xs text-gray-500 font-medium truncate max-w-[150px]">
              {userInfo?.email || ''}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#fbc02d] flex items-center justify-center text-[#1c1f58] font-bold shadow-md text-base sm:text-lg shrink-0">
            {userInfo?.name?.charAt(0) || 'S'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex w-full h-full pt-16 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-[#1c1f58] text-white shadow-xl z-10 shrink-0">
          <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Main Menu</div>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[#131540] text-[#fbc02d] shadow-inner font-semibold'
                      : 'text-gray-300 hover:bg-[#292d7c] hover:text-white'
                  }`}
                  style={isActive ? { borderLeft: '4px solid #fbc02d' } : { borderLeft: '4px solid transparent' }}
                >
                  <span className={`mr-3 text-lg ${isActive ? 'text-[#fbc02d]' : 'text-gray-400'}`}>{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-white/10">
            <button 
              onClick={handleLogout}
              className="flex items-center w-full px-3.5 py-2.5 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <span className="mr-3 text-lg"><LogOut size={20} /></span> Logout
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay & Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-in Menu */}
            <aside className="relative flex flex-col w-72 max-w-[80vw] bg-[#1c1f58] text-white shadow-2xl z-50 h-full pt-16">
              <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">Main Menu</div>
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3.5 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-[#131540] text-[#fbc02d] shadow-inner font-semibold'
                          : 'text-gray-300 hover:bg-[#292d7c] hover:text-white'
                      }`}
                      style={isActive ? { borderLeft: '4px solid #fbc02d' } : { borderLeft: '4px solid transparent' }}
                    >
                      <span className={`mr-3 text-lg ${isActive ? 'text-[#fbc02d]' : 'text-gray-400'}`}>{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-white/10 bg-[#131540]">
                <button 
                  onClick={handleLogout}
                  className="flex items-center w-full px-3.5 py-2.5 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors"
                >
                  <span className="mr-3 text-lg"><LogOut size={20} /></span> Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-8 bg-white text-gray-800">
          <div className="mb-4 sm:mb-6 pb-2 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0">
             <h2 className="text-xl sm:text-2xl font-bold text-[#1c1f58]">
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
