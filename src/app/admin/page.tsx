"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { verifyPin } from '../../lib/utils';

interface Squad {
  id: string;
  title: string;
  discipline: string;
  range_name: string;
  city: string;
  state: string;
  scheduled_at: string;
  capacity: number;
  pin_hash: string;
  squad_members?: { count: number }[];
}

export default function AdminPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      // Fetch profile to check admin flag
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userData.user.id)
        .single();
      setIsAdmin(Boolean(profile?.is_admin));
      if (!profile?.is_admin) {
        setLoading(false);
        return;
      }
      const { data: squadsData, error: squadsError } = await supabase
        .from('squads')
        .select('*, squad_members(count)');
      if (!mounted) return;
      if (squadsError) {
        setError(squadsError.message);
      } else {
        setSquads((squadsData as any) ?? []);
      }
      setLoading(false);
    }
    init();
    const channel = supabase
      .channel('public:admin-squads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'squads' },
        () => {
          init();
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (squad: Squad) => {
    // Admin can delete without pin
    const confirmDelete = confirm('Delete this squad?');
    if (!confirmDelete) return;
    await supabase.from('squads').delete().eq('id', squad.id);
  };

  if (loading) return <p>Loading…</p>;
  if (!isAdmin) return <p>You are not authorized to view this page.</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin: All Squads</h1>
      <ul className="space-y-4">
        {squads.map((squad) => {
          const count = squad.squad_members?.[0]?.count ?? 0;
          const spotsLeft = squad.capacity - count;
          return (
            <li key={squad.id} className="p-4 bg-white rounded shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 md:space-x-4">
              <div>
                <h2 className="text-lg font-medium">{squad.title}</h2>
                <p className="text-sm text-gray-600">
                  {squad.discipline.replace('_', ' ')} • {squad.range_name} • {squad.city}, {squad.state}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(squad.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <p className="text-sm mt-1">
                  Spots left: <span className="font-semibold">{spotsLeft}</span> / {squad.capacity}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleDelete(squad)}
                  className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
