"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AppUser {
  id: string;
  email?: string;
  app_metadata?: Record<string, any>;
}

export default function NavBar() {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    // Fetch the current user on mount.
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user as any);
    };
    getUser();
    // Subscribe to auth state changes so the nav updates when a user signs in or out.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as any ?? null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = Boolean((user as any)?.user_metadata?.is_admin || (user as any)?.app_metadata?.claims?.is_admin);

  return (
    <nav className="flex items-center justify-between py-4 px-6 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <Link href="/" className="font-semibold text-lg">Squad Up</Link>
        <Link href="/">Home</Link>
        <Link href="/create">Create</Link>
        {user && <Link href="/my-squads">My Squads</Link>}
        {isAdmin && <Link href="/admin">Admin</Link>}
      </div>
      <div>
        {!user && <Link href="/login">Sign In</Link>}
        {user && (
          <button
            onClick={handleSignOut}
            className="text-sm text-red-600 hover:underline"
          >
            Sign Out
          </button>
        )}
      </div>
    </nav>
  );
}
