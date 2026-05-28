'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';

const TRADES = [
  'Labour', 'Framing', 'Concrete', 'Electrical', 'Plumbing',
  'HVAC', 'Insulation', 'Drywall', 'Roofing', 'Excavation',
  'Materials', 'Permits', 'Other',
] as const;

const DEFAULT_BUDGETS: Record<string, number> = {
  Labour: 45000,
  Framing: 62000,
  Concrete: 28000,
  Electrical: 24000,
  Plumbing: 22000,
  HVAC: 18000,
  Insulation: 8000,
  Drywall: 14000,
  Roofing: 19000,
  Excavation: 16000,
  Materials: 55000,
  Permits: 4500,
  Other: 5000,
};

const headingStyle = { fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' };

export default function NewJobPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [budgets, setBudgets] = useState<Record<string, number | string>>(DEFAULT_BUDGETS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = TRADES.reduce((s, t) => s + (parseFloat(String(budgets[t])) || 0), 0);

  const updateBudget = (trade: string, val: string) => {
    setBudgets((prev) => ({ ...prev, [trade]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setSubmitting(true);
    setError('');
    try {
      const tradeBudgets: Record<string, number> = {};
      TRADES.forEach((t) => {
        tradeBudgets[t] = parseFloat(String(budgets[t])) || 0;
      });
      const docRef = await addDoc(collection(db, 'jobs'), {
        name: name.trim(),
        status: 'active',
        tradeBudgets,
        createdAt: serverTimestamp(),
      });
      router.push(`/jobs/${docRef.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pine border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-pine px-4 py-3 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-cream/70 hover:text-cream text-2xl leading-none w-8 h-8 flex items-center justify-center min-h-0"
          aria-label="Back"
        >
          ←
        </button>
        <span className="flex-1 text-cream text-xl font-bold" style={headingStyle}>
          New Job
        </span>
        <span className="text-sage text-base font-bold tracking-widest" style={headingStyle}>
          SITELOG
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 px-4 py-5 space-y-6 pb-40">
          <div>
            <label className="block text-steel text-sm font-medium mb-1.5">Job Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 123 Oak Ave Renovation"
              className="w-full px-4 h-12 rounded-xl border border-sand bg-white text-charcoal text-base focus:outline-none focus:ring-2 focus:ring-pine focus:border-transparent"
              required
            />
          </div>

          <div>
            <h2 className="text-pine text-xl font-bold mb-4" style={headingStyle}>
              Trade Budgets
            </h2>
            <div className="space-y-3">
              {TRADES.map((trade) => (
                <div key={trade} className="flex items-center gap-3">
                  <label className="w-28 text-charcoal text-sm font-medium shrink-0">
                    {trade}
                  </label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-steel text-sm pointer-events-none">
                      $
                    </span>
                    <input
                      type="number"
                      value={budgets[trade]}
                      onChange={(e) => updateBudget(trade, e.target.value)}
                      min="0"
                      step="500"
                      className="w-full pl-7 pr-3 h-11 rounded-xl border border-sand bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-pine focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-rust/10 border border-rust/20 text-rust rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-pine px-4 py-4 space-y-3 shadow-lg">
          <div className="flex justify-between items-center text-cream">
            <span className="text-xl font-semibold" style={headingStyle}>
              Total Budget
            </span>
            <span className="text-2xl font-bold" style={headingStyle}>
              ${total.toLocaleString()}
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full h-12 bg-sage text-white rounded-xl text-xl font-bold disabled:opacity-60 transition-opacity"
            style={headingStyle}
          >
            {submitting ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
