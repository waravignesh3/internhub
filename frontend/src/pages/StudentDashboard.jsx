import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatCard, Card, Badge, Button, Skeleton } from '../components/UIComponents';
import { DashboardChatView } from '../components/DashboardChatView';
import {
  Briefcase,
  FileCheck,
  Award,
  Bookmark,
  Sparkles,
  Calendar,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Clock,
  XCircle,
  CheckCircle2,
  BarChart3,
  PieChart as PieIcon,
  MessageSquare,
  Check,
  X,
  UserCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'chat'

  useEffect(() => {
    api.get('/students/dashboard')
      .then((res) => {
        if (res.data.success) setData(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const {
    stats,
    student,
    upcomingInterviews = [],
    recentApplications = [],
    recommendations = [],
    statusDistribution = [],
    categoryDistribution = [],
    applicationTrends = [],
    completionDetails = {}
  } = data || {};

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[var(--primary)] via-indigo-600 to-purple-600 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
            Student Portal Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2">Welcome back, {student?.full_name}! 👋</h1>
          <p className="text-xs text-white/90 mt-1">
            CGPA: <span className="font-bold">{student?.cgpa || 'N/A'}</span> | Dept: <span className="font-bold">{student?.department || 'N/A'}</span> | Profile Completion: <span className="font-bold">{stats?.profileCompletion || 0}%</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-xs border border-white/20">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'analytics' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'chat' ? 'bg-white text-[var(--primary)] shadow-sm' : 'text-white hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> AI Dashboard Chat
            </button>
          </div>

          <Link to="/recommendations">
            <Button variant="secondary" size="sm" className="bg-white text-[var(--primary)] hover:bg-slate-100 font-bold shadow-md">
              <Sparkles className="w-4 h-4 fill-current text-[var(--primary)]" /> Recommendations
            </Button>
          </Link>
        </div>
      </div>

      {/* Real Statistical Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Applications" value={stats?.totalApplications || 0} icon={FileCheck} color="primary" />
        <StatCard title="Pending" value={stats?.pending || 0} icon={Clock} color="warning" />
        <StatCard title="Shortlisted" value={stats?.shortlisted || 0} icon={Award} color="purple" />
        <StatCard title="Accepted" value={stats?.selected || 0} icon={CheckCircle2} color="success" />
        <StatCard title="Saved" value={stats?.savedInternships || 0} icon={Bookmark} color="info" />
        <StatCard title="Open Postings" value={stats?.totalAvailableInternships || 0} icon={Briefcase} color="primary" />
      </div>

      {/* Main Tab Content */}
      {activeTab === 'analytics' ? (
        <div className="space-y-8">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Application Trends */}
            <Card className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[var(--primary)]" /> Application Activity Trends
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Real applications submitted over time</p>
                </div>
                <Badge variant="primary">Real Data</Badge>
              </div>

              {applicationTrends.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-xs text-[var(--text-muted)] border border-dashed rounded-xl">
                  No application activity recorded yet. Explore internships to apply!
                </div>
              ) : (
                <div className="h-60 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={applicationTrends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="applications" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Chart 2: Application Status Donut */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-purple-500" /> Status Distribution
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Current stage of your applications</p>
                </div>
              </div>

              {statusDistribution.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-xs text-[var(--text-muted)] border border-dashed rounded-xl">
                  No applications to show distribution.
                </div>
              ) : (
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Chart 3: Category Distribution Bar Chart */}
          {categoryDistribution.length > 0 && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-500" /> Top Available Internship Domains
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">Active postings by domain</p>
                </div>
              </div>

              <div className="h-52 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryDistribution} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Top Recommended Opportunities Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--primary)]" /> Recommended For You
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Personalized opportunities matched by C++ algorithm based on your skills & CGPA
                </p>
              </div>
              <Badge variant="purple" className="text-[10px] font-semibold">
                Smart DSA Matcher
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations?.slice(0, 2).map((item) => (
                <Card key={item.internshipId} hover className="relative flex flex-col justify-between portal-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-[var(--text-primary)]">{item.title}</h3>
                      <p className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">{item.companyName}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black text-[var(--primary)]">{item.matchScore}%</span>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Match Score</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs space-y-2">
                    <p className="font-semibold text-[var(--text-secondary)]">{item.explanation}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.matchedSkills?.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                          <Check className="w-3 h-3" /> {s}
                        </span>
                      ))}
                      {item.missingSkills?.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 font-bold text-[10px] flex items-center gap-1">
                          <X className="w-3 h-3" /> Missing: {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <Badge variant={item.isEligible ? 'success' : 'danger'}>
                      {item.isEligible ? '✓ CGPA Eligible' : 'Ineligible'}
                    </Badge>
                    <Link to={`/internships/${item.internshipId}`}>
                      <Button size="sm">
                        View Details & Apply <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Grid: Upcoming Interviews & Recent Applications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Interviews */}
            <Card className="portal-card">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-[var(--primary)]" /> Upcoming Interviews
              </h3>
              {upcomingInterviews?.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">No upcoming interviews scheduled yet.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingInterviews?.map((iv) => (
                    <div key={iv.id} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-between table-row-hover">
                      <div>
                        <h4 className="text-xs font-bold">{iv.internship_title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)]">{iv.company_name} • {iv.interview_type}</p>
                        <p className="text-[10px] text-[var(--primary)] font-semibold mt-1">
                          📅 {new Date(iv.scheduled_at).toLocaleString()}
                        </p>
                      </div>
                      <a href={iv.location_or_link} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">Join Link</Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Applications */}
            <Card className="portal-card">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                <FileCheck className="w-4 h-4 text-[var(--primary)]" /> Recent Applications
              </h3>
              {recentApplications?.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">You haven't applied to any internships yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentApplications?.map((app) => (
                    <div key={app.id} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] flex items-center justify-between table-row-hover">
                      <div>
                        <h4 className="text-xs font-bold">{app.title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)]">{app.company_name} • Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={app.status === 'SELECTED' ? 'success' : app.status === 'SHORTLISTED' ? 'purple' : app.status === 'REJECTED' ? 'danger' : 'info'}>
                        {app.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        /* Chat-Style Dashboard View */
        <div className="space-y-6">
          <DashboardChatView studentName={student?.full_name} />
        </div>
      )}
    </div>
  );
};
