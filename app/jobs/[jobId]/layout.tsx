'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

interface Job {
  name: string;
  status: 'active' | 'complete';
}

const TABS = [
  { label: 'Log', segment: 'log' },
  { label: 'Budget', segment: 'budget' },
  { label: 'Photos', segment: 'photos' },
];

const headingStyle = { fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' };

export default function JobLayout({ children }: { children: React.ReactNode }) {
  const { jobId } = useParams<{ jobId: string }>();
  const pathname = usePathname();
  const { loading } = useAuth();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const unsub = onSnapshot(doc(db, 'jobs', jobId), (snap) => {
      if (snap.exists()) setJob(snap.data() as Job);
    });
    return unsub;
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-4 border-pine border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-pine sticky top-0 z-20 shadow-md">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/jobs"
              className="text-cream/70 hover:text-cream text-xl leading-none shrink-0 w-8 h-8 flex items-center justify-center min-h-0"
              aria-label="Back to jobs"
            >
              ←
            </Link>
            <span className="text-cream text-base font-semibold shrink-0" style={headingStyle}>
              J Berg Contracting
            </span>
            {job && (
              <span className="bg-moss text-cream text-xs font-medium px-2 py-0.5 rounded-full truncate min-w-0">
                {job.name}
              </span>
            )}
          </div>
          <span className="text-sage text-base font-bold tracking-widest shrink-0" style={headingStyle}>
            SITELOG
          </span>
        </div>

        <div className="flex border-t border-pine/30 mt-1">
          {TABS.map(({ label, segment }) => {
            const href = `/jobs/${jobId}/${segment}`;
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={segment}
                href={href}
                className={`flex-1 py-3 text-center text-sm font-bold tracking-wide transition-colors min-h-0 ${
                  isActive
                    ? 'text-cream border-b-2 border-sage'
                    : 'text-sage/50 border-b-2 border-transparent hover:text-sage/80'
                }`}
                style={headingStyle}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
