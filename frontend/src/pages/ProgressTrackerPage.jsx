import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, Button, Input, Badge, Skeleton } from '../components/UIComponents';
import { TrendingUp, Award, CheckCircle2, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProgressTrackerPage = () => {
  const { addToast } = useAuth();
  const [progressList, setProgressList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [applicationId, setApplicationId] = useState('');
  const [weekNumber, setWeekNumber] = useState('2');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProgress = () => {
    api.get('/progress')
      .then((res) => {
        if (res.data.success) {
          setProgressList(res.data.progress || []);
          if (res.data.progress?.length > 0) {
            setApplicationId(res.data.progress[0].application_id);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tasksCompleted.trim()) return;
    setSubmitting(true);

    try {
      const res = await api.post('/progress', {
        applicationId: parseInt(applicationId || 1, 10),
        weekNumber: parseInt(weekNumber, 10),
        tasksCompleted,
        learningOutcomes,
        attendancePercentage: 100
      });
      if (res.data.success) {
        addToast('Weekly progress logged successfully!', 'success');
        setTasksCompleted('');
        setLearningOutcomes('');
        fetchProgress();
      }
    } catch (err) {
      addToast('Failed to submit progress.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 max-w-5xl mx-auto"><Skeleton className="h-96" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[var(--primary)]" /> Internship Progress & Mentor Feedback
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Submit weekly task logs, track learning outcomes, and view company mentor evaluations.
        </p>
      </div>

      {/* Submit Weekly Log Form */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" /> Submit Weekly Progress Report
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Week Number"
              type="number"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              className="week-number-input"
              required
            />
            <Input
              label="Attendance (%)"
              type="number"
              defaultValue="100"
              readOnly
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Tasks Completed</label>
            <textarea
              rows={3}
              value={tasksCompleted}
              onChange={(e) => setTasksCompleted(e.target.value)}
              placeholder="e.g. Built frontend user interface, updated API integration and database migrations..."
              className="w-full p-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Learning Outcomes</label>
            <textarea
              rows={2}
              value={learningOutcomes}
              onChange={(e) => setLearningOutcomes(e.target.value)}
              placeholder="Key skills and techniques mastered this week..."
              className="w-full p-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)]"
            />
          </div>

          <Button type="submit" loading={submitting}>
            Submit Progress Log
          </Button>
        </form>
      </Card>

      {/* Progress History Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Submitted Logs & Mentor Feedback</h3>
        {progressList.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-6 text-center">No progress logs submitted yet.</p>
        ) : (
          progressList.map((item) => (
            <Card key={item.id} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="purple">Week #{item.week_number}</Badge>
                  <h4 className="font-bold text-sm text-[var(--text-primary)] mt-1">{item.internship_title} ({item.company_name})</h4>
                </div>
                <Badge variant="success">Attendance: {item.attendance_percentage}%</Badge>
              </div>

              <div className="text-xs text-[var(--text-secondary)] space-y-2">
                <p><strong>Tasks Completed:</strong> {item.tasks_completed}</p>
                {item.learning_outcomes && <p><strong>Learning Outcomes:</strong> {item.learning_outcomes}</p>}
              </div>

              {/* Mentor Feedback Section */}
              {item.mentor_feedback && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Mentor: {item.mentor_feedback.mentor_name}</span>
                    <div className="flex items-center text-amber-500">
                      {[...Array(item.mentor_feedback.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[var(--text-secondary)] italic">"{item.mentor_feedback.feedback_text}"</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
