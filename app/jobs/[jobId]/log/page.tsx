'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

const TRADES = [
  'Labour', 'Framing', 'Concrete', 'Electrical', 'Plumbing',
  'HVAC', 'Insulation', 'Drywall', 'Roofing', 'Excavation',
  'Materials', 'Permits', 'Other',
];

interface LogEntry {
  id: string;
  date: string;
  hours: number;
  cost: number;
  trade: string;
  notes: string;
  createdAt: { seconds: number } | null;
}

interface Job {
  tradeBudgets: Record<string, number>;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const headingStyle = { fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' };

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function LogPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: todayStr(),
    hours: '',
    cost: '',
    trade: 'Labour',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!user || !jobId) return;
    const q = query(collection(db, 'jobs', jobId, 'logs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry)));
    });
    return unsub;
  }, [user, jobId]);

  useEffect(() => {
    if (!jobId) return;
    getDoc(doc(db, 'jobs', jobId)).then((snap) => {
      if (snap.exists()) setJob(snap.data() as Job);
    });
  }, [jobId]);

  const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0);
  const totalSpent = logs.reduce((s, l) => s + (l.cost || 0), 0);
  const totalBudget = job
    ? Object.values(job.tradeBudgets || {}).reduce((s, v) => s + v, 0)
    : 0;
  const remaining = totalBudget - totalSpent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFormError('');
    try {
      await addDoc(collection(db, 'jobs', jobId, 'logs'), {
        date: form.date,
        hours: parseFloat(form.hours) || 0,
        cost: parseFloat(form.cost) || 0,
        trade: form.trade,
        notes: form.notes.trim(),
        createdAt: serverTimestamp(),
      });
      setForm({ date: todayStr(), hours: '', cost: '', trade: 'Labour', notes: '' });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-pine px-4 py-3">
        <div className="flex justify-between text-cream">
          <div className="text-center">
            <div className="text-2xl font-bold leading-tight" style={headingStyle}>
              {totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}
            </div>
            <div className="text-sage text-xs mt-0.5">Total Hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold leading-tight" style={headingStyle}>
              {fmt(totalSpent)}
            </div>
            <div className="text-sage text-xs mt-0.5">Total Spent</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold leading-tight ${remaining < 0 ? 'text-rust' : 'text-cream'}`}
              style={headingStyle}
            >
              {remaining < 0 ? '-' : ''}{fmt(Math.abs(remaining))}
            </div>
            <div className="text-sage text-xs mt-0.5">Remaining</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full h-14 bg-moss text-cream rounded-2xl text-xl font-bold shadow-sm active:opacity-90 transition-opacity"
            style={headingStyle}
          >
            + Add Today&apos;s Entry
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-4 border border-sand shadow-sm">
            <div className="text-pine text-lg font-bold mb-4" style={headingStyle}>
              New Log Entry
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-steel text-xs font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 h-11 rounded-xl border border-sand text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-pine focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-steel text-xs font-medium mb-1">Trade</label>
                  <select
                    value={form.trade}
                    onChange={(e) => setForm((p) => ({ ...p, trade: e.target.value }))}
                    className="w-full px-3 h-11 rounded-xl border border-sand text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-pine focus:border-transparent bg-white"
                  >
                    {TRADES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-steel text-xs font-medium mb-1">Hours</label>
                  <input
                    type="number"
                    value={form.hours}
                    onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                    min="0"
                    step="0.5"
                    placeholder="0"
                    className="w-full px-3 h-11 rounded-xl border border-sand text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-pine focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-steel text-xs font-medium mb-1">Cost ($)</label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 h-11 rounded-xl border border-sand text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-pine focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-steel text-xs font-medium mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="What was done today…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-sand text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-pine focus:border-transparent resize-none"
                  style={{ minHeight: '80px' }}
                />
              </div>

              {formError && (
                <div className="text-rust text-sm bg-rust/10 rounded-xl px-3 py-2">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError('');
                  }}
                  className="flex-1 h-11 border border-sand rounded-xl text-steel text-sm font-semibold"
                  style={headingStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 bg-pine text-cream rounded-xl text-sm font-bold disabled:opacity-60"
                  style={headingStyle}
                >
                  {submitting ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        )}

        {logs.length === 0 && !showForm ? (
          <div className="text-center text-steel py-14">
            <div className="text-5xl mb-3">📋</div>
            <div className="text-lg font-semibold" style={headingStyle}>
              No entries yet
            </div>
            <div className="text-sm mt-1">Tap the button above to log today&apos;s work</div>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-2xl p-4 border border-sand shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-charcoal text-base font-semibold" style={headingStyle}>
                    {formatDate(log.date)}
                  </div>
                  <span className="inline-block bg-pine/10 text-pine text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1.5">
                    {log.trade}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-charcoal font-bold" style={headingStyle}>
                    {log.hours % 1 === 0 ? log.hours : log.hours.toFixed(1)}h
                  </div>
                  <div className="text-moss font-semibold text-sm">{fmt(log.cost || 0)}</div>
                </div>
              </div>
              {log.notes && (
                <p className="text-steel text-sm mt-2.5 pt-2.5 border-t border-sand leading-relaxed">
                  {log.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
