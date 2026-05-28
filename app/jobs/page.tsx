'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

interface Job {
  id: string;
  name: string;
  status: 'active' | 'complete';
  tradeBudgets: Record<string, number>;
  createdAt: { seconds: number } | null;
}

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function JobsPage() {
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [spentByJob, setSpentByJob] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job)));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user || jobs.length === 0) return;
    jobs.forEach((job) => {
      getDocs(collection(db, 'jobs', job.id, 'logs')).then((snap) => {
        const total = snap.docs.reduce((s, d) => s + ((d.data().cost as number) || 0), 0);
        setSpentByJob((prev) => ({ ...prev, [job.id]: total }));
      });
    });
  }, [user, jobs]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-4 border-pine border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalBudget = (job: Job) =>
    Object.values(job.tradeBudgets || {}).reduce((s, v) => s + v, 0);

  const pct = (job: Job) => {
    const budget = totalBudget(job);
    if (!budget) return 0;
    return Math.min(100, Math.round(((spentByJob[job.id] || 0) / budget) * 100));
  };

  const barColor = (p: number) =>
    p >= 100 ? 'bg-rust' : p >= 80 ? 'bg-amber' : 'bg-sage';

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-pine px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <span
          className="text-cream text-xl font-bold tracking-wide"
          style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
        >
          J Berg Contracting
        </span>
        <span
          className="text-sage text-base font-bold tracking-widest"
          style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
        >
          SITELOG
        </span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {jobs.map((job) => {
          const p = pct(job);
          const spent = spentByJob[job.id] || 0;
          const budget = totalBudget(job);
          return (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block min-h-0">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-sand active:scale-[0.98] transition-transform">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <span
                    className="text-charcoal text-lg font-semibold leading-tight"
                    style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
                  >
                    {job.name}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                      job.status === 'active'
                        ? 'bg-sage/20 text-moss'
                        : 'bg-sand text-steel'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-steel">
                    <span>{p}% used</span>
                    <span>
                      {fmt(spent)} / {fmt(budget)}
                    </span>
                  </div>
                  <div className="h-2 bg-sand rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(p)}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {jobs.length === 0 && (
          <div className="text-center text-steel py-12">
            <div className="text-4xl mb-3">🏗️</div>
            <div
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
            >
              No jobs yet
            </div>
            <div className="text-sm mt-1">Create your first job below</div>
          </div>
        )}

        <Link href="/jobs/new" className="block min-h-0">
          <div className="border-2 border-dashed border-sage rounded-2xl flex items-center justify-center h-16 active:bg-sage/5 transition-colors">
            <span
              className="text-moss text-xl font-bold"
              style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
            >
              + New Job
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
