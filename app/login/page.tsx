'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ALLOWED_EMAILS = new Set(['jberg99@icloud.com', 'rsacustom@gmail.com']);
const DEFAULT_EMAIL = 'jberg99@icloud.com';
const COOKIE_MAX_AGE = 7 * 24 * 3600;

export default function LoginPage() {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isSignInWithEmailLink(auth, window.location.href)) {
      setCompleting(true);
      const savedEmail = window.localStorage.getItem('emailForSignIn') || DEFAULT_EMAIL;
      signInWithEmailLink(auth, savedEmail, window.location.href)
        .then(() => {
          window.localStorage.removeItem('emailForSignIn');
          document.cookie = `sitelog-auth=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
          router.replace('/jobs');
        })
        .catch((err: Error) => {
          setError(err.message);
          setCompleting(false);
        });
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && ALLOWED_EMAILS.has(user.email ?? '')) {
        document.cookie = `sitelog-auth=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        router.replace('/jobs');
      }
    });
    return unsub;
  }, [router]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ALLOWED_EMAILS.has(email)) {
      setError('Unauthorized email address.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send link. Check Firebase config.');
    } finally {
      setSending(false);
    }
  };

  if (completing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-pine border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="font-condensed text-pine text-xl font-semibold">Signing you in…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-cream min-h-full">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div
            className="font-bold text-5xl tracking-tight text-pine mb-1"
            style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
          >
            SITELOG
          </div>
          <div className="text-steel text-sm font-medium tracking-wide">J Berg Contracting Ltd.</div>
        </div>

        {sent ? (
          <div className="bg-pine text-cream rounded-2xl p-7 text-center shadow-lg">
            <div className="text-5xl mb-3">📬</div>
            <div
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
            >
              Check your email
            </div>
            <div className="text-sage text-sm leading-relaxed">
              A sign-in link was sent to<br />
              <span className="text-cream font-medium">{email}</span>
            </div>
            <button
              onClick={() => setSent(false)}
              className="mt-5 text-sage text-sm underline underline-offset-2 min-h-0 h-auto"
            >
              Send again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-steel text-sm font-medium mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 h-12 rounded-xl border border-sand bg-white text-charcoal text-base focus:outline-none focus:ring-2 focus:ring-pine focus:border-transparent"
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="bg-rust/10 border border-rust/20 text-rust rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full h-12 bg-pine text-cream rounded-xl font-bold text-lg tracking-wide disabled:opacity-60 transition-opacity"
              style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
            >
              {sending ? 'Sending…' : 'Send Magic Link'}
            </button>

            <p className="text-center text-steel text-sm">
              No password required — check your inbox
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
