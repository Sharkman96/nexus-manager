import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Server, BarChart3, Bell, Settings, Menu, X, Package } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/nodes', label: 'Nodes', icon: Server },
  { to: '/docker', label: 'Docker', icon: Package },
  { to: '/metrics', label: 'Metrics', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Layout = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="ml-2 text-xl font-bold gradient-text">Nexus Manager</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-6 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link mb-1 ${isActive ? 'nav-link-active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-3"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                {navItems.find(item => item.to === location.pathname)?.label || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Connected</span>
              </div>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">U</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}; 