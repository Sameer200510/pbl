import { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Trash2, Settings, ArrowLeft, LogOut, Menu, X } from 'lucide-react';
import geuLogo from '../assets/Graphic-Era-University-GEU-Dehradun-Logo.jpg';

const SuperAdminLayout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Data Wipe Zone', path: '/super-admin/dashboard', icon: <Trash2 size={20} /> },
    { name: 'System Settings', path: '/super-admin/settings', icon: <Settings size={20} /> },
    { name: 'Regular Admin Portal', path: '/admin/dashboard', icon: <ArrowLeft size={20} /> },
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
    <div className="flex h-screen bg-gray-900 font-sans text-gray-100 overflow-hidden">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 sm:px-6 z-30 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4 h-full">
          {/* Mobile Hamburger Toggle Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-red-500 hover:bg-gray-800 focus:outline-none transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <img 
            src={geuLogo} 
            alt="Graphic Era University" 
            className="h-8 sm:h-10 object-contain brightness-0 invert"
          />
          <div className="hidden xs:block w-px h-6 sm:h-8 bg-gray-700 mx-1 sm:mx-2"></div>
          <h1 className="text-sm sm:text-lg font-bold text-red-500 tracking-wide truncate max-w-[140px] sm:max-w-none">
            SUPER ADMIN
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-red-400 truncate max-w-[150px]">
              {userInfo?.name || 'Super Admin'}
            </p>
            <p className="text-xs text-gray-400 font-medium truncate max-w-[150px]">
              {userInfo?.email || ''}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold shadow-md text-base sm:text-lg shrink-0">
            {userInfo?.name?.charAt(0) || 'S'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex w-full h-full pt-16 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-gray-900 border-r border-gray-800 z-10 shrink-0">
          <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">Super Admin Menu</div>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-red-900/30 text-red-500 shadow-inner font-semibold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  style={isActive ? { borderLeft: '4px solid #ef4444' } : { borderLeft: '4px solid transparent' }}
                >
                  <span className={`mr-3 text-lg ${isActive ? 'text-red-500' : 'text-gray-500'}`}>{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-gray-800">
            <button 
              onClick={handleLogout}
              className="flex items-center w-full px-3.5 py-2.5 text-sm font-medium text-red-500 rounded-lg hover:bg-red-900/30 transition-colors"
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
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-in Menu */}
            <aside className="relative flex flex-col w-72 max-w-[80vw] bg-gray-900 border-r border-gray-800 text-gray-100 shadow-2xl z-50 h-full pt-16">
              <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-3">Super Admin Menu</div>
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3.5 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-red-900/30 text-red-500 shadow-inner font-semibold'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      }`}
                      style={isActive ? { borderLeft: '4px solid #ef4444' } : { borderLeft: '4px solid transparent' }}
                    >
                      <span className={`mr-3 text-lg ${isActive ? 'text-red-500' : 'text-gray-500'}`}>{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-gray-800 bg-gray-950">
                <button 
                  onClick={handleLogout}
                  className="flex items-center w-full px-3.5 py-2.5 text-sm font-medium text-red-500 rounded-lg hover:bg-red-900/40 transition-colors"
                >
                  <span className="mr-3 text-lg"><LogOut size={20} /></span> Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-8 bg-gray-950 text-gray-100">
          <div className="mb-4 sm:mb-6 pb-2 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0">
             <h2 className="text-xl sm:text-2xl font-bold text-red-500">
               {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'Super Admin Dashboard'}
             </h2>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
