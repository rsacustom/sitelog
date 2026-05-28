'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ALLOWED_EMAIL = 'jberg99@icloud.com';
const COOKIE_MAX_AGE = 7 * 24 * 3600;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u && u.email !== ALLOWED_EMAIL) {
        await signOut(auth);
        return;
      }
      setUser(u);
      setLoading(false);
      if (u) {
        document.cookie = `sitelog-auth=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      } else {
        document.cookie = 'sitelog-auth=; path=/; max-age=0';
        if (!pathname.startsWith('/login')) {
          router.push('/login');
        }
      }
    });
    return unsubscribe;
  }, [router, pathname]);

  return { user, loading };
}
