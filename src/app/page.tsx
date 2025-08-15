"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Squad {
  id: string;
  title: string;
  discipline: string;
  range_name: string;
  city: string;
  state: string;
  scheduled_at: string;
  capacity: number;
  contact_method: string;
  contact_value: string;
  created_by?: string | null;
  pin_hash?: string;
  squad_members?: { count: number }[];
}

export default function HomePage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch squads and subscribe to realtime changes
  useEffect(() => {
    let mounted = true;

    async function fetchSquads() {
      setLoading(true);
      const { data, error } = await supabase
        .from('squads')
        .select('*, squad_members(count)')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
      if (!mounted) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSquads((data as unknown as Squad[]) ?? []);
      setLoading(false);
    }

    fetchSquads();

    // Subscribe to changes on the squads table
    const channel = supabase
      .channel('public:squads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'squads' },
        () => {
          // Re-fetch squads on any change
          fetchSquads();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'squad_members' },
        () => {
          fetchSquads();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleJoin = async (squad: Squad) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      alert('You must be signed in to join squads');
      return;
    }
    // check membership
    const { data: existing } = await supabase
      .from('squad_members')
      .select('*')
      .eq('squad_id', squad.id)
      .eq('member_id', userData.user.id)
      .maybeSingle();
    if (existing) {
      // Already joined
      return;
    }
    await supabase.from('squad_members').insert({
      squad_id: squad.id,
      member_id: userData.user.id,
      is_leader: false,
    });
  };

  const handleLeave = async (squad: Squad) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase
      .from('squad_members')
      .delete()
      .eq('squad_id', squad.id)
      .eq('member_id', userData.user.id);
  };

  if (loading) {
    return <p>Loading squads…</p>;
  }
  if (error) {
    return <p className="text-red-600">Error: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Available Squads</h1>
      {squads.length === 0 && <p>No upcoming squads found.</p>}
      <ul className="space-y-4">
        {squads.map((squad) => {
          const count = squad.squad_members?.[0]?.count ?? 0;
          const spotsLeft = squad.capacity - count;
          return (
            <li key={squad.id} className="p-4 bg-white rounded shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 md:space-x-4">
              <div>
                <h2 className="text-lg font-medium">{squad.title}</h2>
                <p className="text-sm text-gray-600">{squad.discipline.replace('_', ' ')} • {squad.range_name} • {squad.city}, {squad.state}</p>
                <p className="text-sm text-gray-500">
                  {new Date(squad.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <p className="text-sm mt-1">
                  Spots left: <span className="font-semibold">{spotsLeft}</span> / {squad.capacity}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {spotsLeft > 0 ? (
                  <button
                    onClick={() => handleJoin(squad)}
                    className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                  >
                    Join
                  </button>
                ) : (
                  <button
                    className="px-3 py-1 rounded bg-gray-300 text-gray-600 cursor-not-allowed text-sm"
                    disabled
                  >
                    Full
                  </button>
                )}
                <button
                  onClick={() => handleLeave(squad)}
                  className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
                >
                  Leave
                </button>
                {/* Reveal contact */}
                <details>
                  <summary className="cursor-pointer text-blue-600">Reveal Contact</summary>
                  <p className="mt-1 text-sm">{squad.contact_value}</p>
                </details>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
