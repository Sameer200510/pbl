import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Trash2, Settings, ArrowLeft, LogOut } from 'lucide-react';
import geuLogo from '../assets/Graphic-Era-University-GEU-Dehradun-Logo.jpg';

const SuperAdminLayout = () => {
  const location = useLocation();
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

  return (
    <div className="flex h-screen bg-gray-900 font-sans text-gray-100">
      {/* Top Header */}
      <header className="absolute top-0 w-full h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-20 shadow-sm">
        <div className="flex items-center gap-4 h-full">
          <img 
            src={geuLogo} 
            alt="Graphic Era University" 
            className="h-10 object-contain brightness-0 invert"
          />
          <div className="w-px h-8 bg-gray-700 mx-2"></div>
          <h1 className="text-lg font-bold text-red-500 tracking-wide">SUPER ADMIN</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block">
             <p className="text-sm font-semibold text-red-400">
               {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.name || 'Super Admin'; } catch { return 'Super Admin'; } })()}
             </p>
             <p className="text-xs text-gray-400 font-medium">
               {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.email || ''; } catch { return ''; } })()}
             </p>
           </div>
           <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold cursor-pointer shadow-md text-lg">
             {(() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.name?.charAt(0) || 'S'; } catch { return 'S'; } })()}
           </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex w-full h-full pt-16">
        {/* Sidebar */}
        <aside className="w-64 flex flex-col bg-gray-900 border-r border-gray-800 z-10">
          <nav className="flex-1 py-6 space-y-2 px-4 overflow-y-auto">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">Super Admin Menu</div>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-red-900/30 text-red-500 shadow-inner'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  style={isActive ? { borderLeft: '4px solid #ef4444' } : { borderLeft: '4px solid transparent' }}
                >
                  <span className={`mr-3 text-lg ${isActive ? 'text-red-500' : 'text-gray-500'}`}>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-800">
            <button 
              onClick={() => {
                localStorage.removeItem('userInfo');
                window.location.href = '/login';
              }}
              className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-500 rounded-lg hover:bg-red-900/30 transition-colors"
            >
              <span className="mr-3 text-lg"><LogOut size={20} /></span> Logout
            </button>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 bg-gray-950 text-gray-100">
          <div className="mb-6 pb-2 border-b border-gray-800 flex justify-between items-center">
             <h2 className="text-2xl font-bold text-red-500">
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
