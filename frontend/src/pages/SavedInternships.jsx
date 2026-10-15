import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Card, Button, Badge, Skeleton, EmptyState } from '../components/UIComponents';
import { Bookmark, MapPin, DollarSign, Clock, ArrowRight, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SavedInternships = () => {
  const { addToast } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    api.get('/bookmarks')
      .then((res) => {
        if (res.data.success) setBookmarks(res.data.bookmarks || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (internshipId, e) => {
    if (e) e.preventDefault();
    if (removingId === internshipId) return;

    setRemovingId(internshipId);
    try {
      const res = await api.post('/bookmarks/toggle', { internshipId });
      if (res.data.success) {
        setBookmarks((prev) => prev.filter((b) => b.id !== internshipId));
        if (addToast) addToast('Internship removed from saved bookmarks.', 'info');
      } else {
        throw new Error(res.data.error || 'Failed to remove bookmark.');
      }
    } catch (err) {
      console.error('Bookmark removal error:', err);
      if (addToast) addToast('Failed to remove bookmark. Please try again.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-amber-500 fill-current" /> Saved Internships
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Review saved roles and compare deadlines.</p>
        </div>
        {bookmarks.length >= 2 && (
          <Link to="/compare">
            <Button variant="outline">Compare Saved Roles</Button>
          </Link>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : bookmarks.length === 0 ? (
        <EmptyState title="No Saved Internships" description="Bookmark roles while exploring to keep track of deadlines!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookmarks.map((item) => (
            <Card key={item.id} className="p-6 flex flex-col justify-between portal-card">
              <div>
                {/* Card Header & Aligned Remove Button */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.logo_url || 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100'}
                      alt={item.company_name}
                      className="w-10 h-10 rounded-xl object-contain border p-1 bg-white shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">{item.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{item.company_name}</p>
                    </div>
                  </div>

                  {/* Part 4: Consistently Aligned & Styled Danger Remove Button */}
                  <button
                    onClick={(e) => handleRemove(item.id, e)}
                    disabled={removingId === item.id}
                    title="Remove from saved bookmarks"
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {removingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Remove</span>
                  </button>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span>{item.location} ({item.work_mode})</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>₹{item.stipend_monthly?.toLocaleString()}/month</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                <Badge variant="warning">Deadline: {new Date(item.application_deadline).toLocaleDateString()}</Badge>
                <Link to={`/internships/${item.id}`}>
                  <Button size="sm">
                    Apply Now <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
