'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

const TRADES = [
  'Labour', 'Framing', 'Concrete', 'Electrical', 'Plumbing',
  'HVAC', 'Insulation', 'Drywall', 'Roofing', 'Excavation',
  'Materials', 'Permits', 'Other',
];

interface Job {
  name: string;
  tradeBudgets: Record<string, number>;
}

interface LogEntry {
  cost: number;
  trade: string;
}

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const headingStyle = { fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' };

function barColor(pct: number) {
  if (pct >= 100) return 'bg-rust';
  if (pct >= 80) return 'bg-amber';
  return 'bg-sage';
}

function textColor(pct: number) {
  if (pct >= 100) return 'text-rust';
  if (pct >= 80) return 'text-amber';
  return 'text-sage';
}

function totalPctTextColor(pct: number) {
  if (pct >= 100) return 'text-rust';
  if (pct >= 80) return 'text-amber';
  return 'text-cream';
}

export default function BudgetPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!jobId) return;
    const unsub = onSnapshot(doc(db, 'jobs', jobId), (snap) => {
      if (snap.exists()) setJob(snap.data() as Job);
    });
    return unsub;
  }, [jobId]);

  useEffect(() => {
    if (!user || !jobId) return;
    const unsub = onSnapshot(collection(db, 'jobs', jobId, 'logs'), (snap) => {
      setLogs(snap.docs.map((d) => d.data() as LogEntry));
    });
    return unsub;
  }, [user, jobId]);

  if (!job) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pine border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalBudget = Object.values(job.tradeBudgets || {}).reduce((s, v) => s + v, 0);
  const totalSpent = logs.reduce((s, l) => s + (l.cost || 0), 0);
  const remaining = totalBudget - totalSpent;
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const spentByTrade: Record<string, number> = {};
  logs.forEach((l) => {
    spentByTrade[l.trade] = (spentByTrade[l.trade] || 0) + (l.cost || 0);
  });

  const tradeRows = TRADES.filter(
    (t) => (job.tradeBudgets?.[t] || 0) > 0 || (spentByTrade[t] || 0) > 0,
  );

  return (
    <div className="flex-1 px-4 py-4 space-y-3 pb-8">
      <div className="bg-pine rounded-2xl p-5 text-cream shadow-md">
        <div className="text-sage text-sm font-medium tracking-wide mb-1" style={headingStyle}>
          Total Budget
        </div>
        <div className="text-4xl font-bold mb-4" style={headingStyle}>
          {fmt(totalBudget)}
        </div>

        <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${barColor(totalPct)}`}
            style={{ width: `${Math.min(100, totalPct)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sage text-xs mb-0.5">Spent</div>
            <div className="text-lg font-bold leading-tight" style={headingStyle}>
              {fmt(totalSpent)}
            </div>
          </div>
          <div>
            <div className="text-sage text-xs mb-0.5">Used</div>
            <div
              className={`text-lg font-bold leading-tight ${totalPctTextColor(totalPct)}`}
              style={headingStyle}
            >
              {Math.round(totalPct)}%
            </div>
          </div>
          <div>
            <div className="text-sage text-xs mb-0.5">Remaining</div>
            <div
              className={`text-lg font-bold leading-tight ${remaining < 0 ? 'text-rust' : 'text-cream'}`}
              style={headingStyle}
            >
              {remaining < 0 ? '-' : ''}{fmt(Math.abs(remaining))}
            </div>
          </div>
        </div>
      </div>

      {tradeRows.map((trade) => {
        const budget = job.tradeBudgets?.[trade] || 0;
        const spent = spentByTrade[trade] || 0;
        const pct = budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
        return (
          <div
            key={trade}
            className="bg-white rounded-2xl p-4 border border-sand shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-charcoal font-semibold" style={headingStyle}>
                {trade}
              </span>
              <span className={`text-sm font-bold ${textColor(pct)}`} style={headingStyle}>
                {Math.round(pct)}%
              </span>
            </div>
            <div className="h-2 bg-sand rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${barColor(pct)}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-steel">
              <span>{fmt(spent)} spent</span>
              <span>{fmt(budget)} budget</span>
            </div>
          </div>
        );
      })}

      {tradeRows.length === 0 && (
        <div className="text-center text-steel py-8">
          <div className="text-sm">No budget data yet. Add log entries to see spending.</div>
        </div>
      )}
    </div>
  );
}
