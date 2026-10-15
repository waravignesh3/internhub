import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Sparkles,
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
  Search,
  Palette,
  Check,
  ChevronDown
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout, theme, setTheme, accent, setAccent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  // Mutually exclusive panel state: null | 'theme' | 'notifications' | 'user'
  const [activePanel, setActivePanel] = useState(null);

  const headerRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/notifications')
        .then(res => {
          if (res.data.success) setNotifications(res.data.notifications || []);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Close panels on route change
  useEffect(() => {
    setActivePanel(null);
  }, [location.pathname]);

  // Outside click & Escape key listeners
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setActivePanel(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActivePanel(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const togglePanel = (panelName) => {
    setActivePanel((prev) => (prev === panelName ? null : panelName));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const accents = [
    { name: 'blue', color: '#2563eb' },
    { name: 'cyan', color: '#06b6d4' },
    { name: 'purple', color: '#9333ea' },
    { name: 'green', color: '#10b981' },
    { name: 'orange', color: '#f97316' },
    { name: 'red', color: '#ef4444' }
  ];

  return (
    <header ref={headerRef} className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg-card)]/90 backdrop-blur-md">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Part 3: Animated Brand Logo Heading */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight internhub-animated-logo">
              InternHub
            </span>
            <span className="text-[10px] font-semibold text-[var(--text-muted)] -mt-1 tracking-wider uppercase">
              Matching Portal
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <div className="hidden md:flex items-center max-w-md w-full mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search internships, companies, skills..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/internships?search=${encodeURIComponent(e.target.value)}`);
              }}
              className="w-full pl-10 pr-4 py-1.5 text-xs rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-ring)]"
            />
          </div>
        </div>

        {/* Right Action Icons & Mutually Exclusive Dropdown Panels */}
        <div className="flex items-center gap-3">
          {/* Panel 1: Theme & Accent Customizer */}
          <div className="relative">
            <button
              onClick={() => togglePanel('theme')}
              aria-expanded={activePanel === 'theme'}
              aria-controls="theme-customizer-panel"
              className={`p-2 rounded-xl text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                activePanel === 'theme' ? 'bg-slate-100 dark:bg-slate-800 text-[var(--primary)]' : ''
              }`}
              title="Theme & Accent Settings"
            >
              <Palette className="w-5 h-5" />
            </button>

            {activePanel === 'theme' && (
              <div id="theme-customizer-panel" className="absolute right-0 mt-2 w-56 p-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Theme Mode</p>
                <div className="flex items-center gap-1.5 mb-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      theme === 'light' ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)] font-bold' : 'border-[var(--border-color)]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      theme === 'dark' ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)] font-bold' : 'border-[var(--border-color)]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Dark
                  </button>
                </div>

                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Accent Color</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {accents.map((acc) => (
                    <button
                      key={acc.name}
                      onClick={() => setAccent(acc.name)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: acc.color }}
                    >
                      {accent === acc.name && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <>
              {/* Panel 2: Notification Center */}
              <div className="relative">
                <button
                  onClick={() => togglePanel('notifications')}
                  aria-expanded={activePanel === 'notifications'}
                  aria-controls="notifications-panel"
                  className={`relative p-2 rounded-xl text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    activePanel === 'notifications' ? 'bg-slate-100 dark:bg-slate-800 text-[var(--primary)]' : ''
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {activePanel === 'notifications' && (
                  <div id="notifications-panel" className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto p-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-color)]">
                      <h4 className="text-xs font-bold uppercase text-[var(--text-primary)]">Notifications</h4>
                      <button
                        onClick={() => {
                          api.put('/notifications/all/read').then(() => {
                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                          });
                        }}
                        className="text-[10px] font-medium text-[var(--primary)] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] text-center py-6">No notifications yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border text-xs ${
                              n.is_read ? 'bg-[var(--bg-main)] border-[var(--border-color)] opacity-75' : 'bg-[var(--primary-light)] border-[var(--primary)]/30'
                            }`}
                          >
                            <h5 className="font-bold text-[var(--text-primary)]">{n.title}</h5>
                            <p className="text-[var(--text-secondary)] mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-[var(--text-muted)] block mt-1">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Panel 3: User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => togglePanel('user')}
                  aria-expanded={activePanel === 'user'}
                  aria-controls="user-account-panel"
                  className={`flex items-center gap-2 p-1.5 rounded-xl border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    activePanel === 'user' ? 'border-[var(--primary)] bg-slate-100 dark:bg-slate-800' : ''
                  }`}
                >
                  <img
                    src={user?.profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt="User Avatar"
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-[var(--text-primary)] leading-none">{user?.email?.split('@')[0]}</span>
                    <span className="text-[10px] font-semibold text-[var(--primary)] uppercase mt-0.5">{user?.role}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>

                {activePanel === 'user' && (
                  <div id="user-account-panel" className="absolute right-0 mt-2 w-48 p-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-[var(--border-color)] mb-1">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.email}</p>
                      <p className="text-[10px] font-semibold text-[var(--primary)] uppercase">{user?.role} Account</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setActivePanel(null)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <User className="w-4 h-4" /> Profile & Settings
                    </Link>
                    <button
                      onClick={() => {
                        setActivePanel(null);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <button className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-primary)] cursor-pointer">
                  Log In
                </button>
              </Link>
              <Link to="/register">
                <button className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xs cursor-pointer">
                  Get Started
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
