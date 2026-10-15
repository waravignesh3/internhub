import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Bookmark,
  Sparkles,
  Zap,
  Target,
  FileCheck,
  Video,
  Compass,
  Bot,
  TrendingUp,
  Bell,
  Settings,
  Users,
  Building2,
  Cpu,
  BrainCircuit,
  BarChart3,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role || 'STUDENT';

  const studentLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Explore Internships', path: '/internships', icon: Briefcase },
    { label: 'Applications', path: '/applications', icon: FileText },
    { label: 'Saved', path: '/saved', icon: Bookmark },
    { label: 'Recommendations', path: '/recommendations', icon: Sparkles, badge: 'Smart Match' },
    { label: 'Skill Gap Analyzer', path: '/skill-gap', icon: Target },
    { label: 'Resume Assistant', path: '/resume-assistant', icon: FileCheck },
    { label: 'Interview Prep', path: '/interview-prep', icon: Video },
    { label: 'Career Advisor', path: '/career-advisor', icon: Compass },
    { label: 'InternHub AI', path: '/ai-assistant', icon: Bot, highlight: true },
    { label: 'Progress Tracker', path: '/progress', icon: TrendingUp },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Settings', path: '/settings', icon: Settings }
  ];

  const companyLinks = [
    { label: 'Dashboard', path: '/company-dashboard', icon: LayoutDashboard },
    { label: 'Manage Internships', path: '/company-internships', icon: Briefcase },
    { label: 'Applicants', path: '/company-applicants', icon: Users },
    { label: 'Interviews', path: '/interviews', icon: Video },
    { label: 'Analytics', path: '/company-analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings }
  ];

  const adminLinks = [
    { label: 'Admin Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
    { label: 'Student Directory', path: '/admin-students', icon: Users },
    { label: 'Company Partners', path: '/admin-companies', icon: Building2 },
    { label: 'Internships Oversight', path: '/internships', icon: Briefcase },
    { label: 'Matching Engine Monitor', path: '/admin-dsa', icon: Cpu, badge: 'Active' },
    { label: 'AI Usage & Insights', path: '/admin-ai', icon: BrainCircuit },
    { label: 'Analytics & Reports', path: '/admin-analytics', icon: BarChart3 },
    { label: 'Activity Logs', path: '/admin-activity-logs', icon: Activity },
    { label: 'Settings', path: '/settings', icon: Settings }
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'COMPANY' ? companyLinks : studentLinks;

  return (
    <aside
      className={`sticky top-16 h-[calc(100vh-4rem)] border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] transition-all duration-300 flex flex-col z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Collapse Toggle */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)]">
        {!collapsed && (
          <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {role} MENU
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--text-primary)] transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold nav-item-transition group ${
                  isActive
                    ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20 font-bold'
                    : item.highlight
                    ? 'bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/30'
                    : 'text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[var(--text-primary)]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="flex-1 truncate flex items-center justify-between">
                  {item.label}
                  {item.badge && (
                    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Floating AI Assistant CTA */}
      {!collapsed && role === 'STUDENT' && (
        <div className="p-3 m-3 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 fill-white" />
            <span className="text-xs font-bold">InternHub AI</span>
          </div>
          <p className="text-[10px] text-white/80 mb-2">Ask AI for resume fixes, interview prep, and career suggestions.</p>
          <NavLink
            to="/ai-assistant"
            className="block text-center py-1.5 text-xs font-bold bg-white text-[var(--primary)] rounded-lg hover:bg-slate-100 transition-colors"
          >
            Launch Chatbot
          </NavLink>
        </div>
      )}
    </aside>
  );
};
