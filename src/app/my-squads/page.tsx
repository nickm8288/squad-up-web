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

export default function MySquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchMySquads() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setSquads([]);
        setLoading(false);
        return;
      }
      const userId = userData.user.id;
      // Fetch squads created by the user
      const { data: createdData, error: createdError } = await supabase
        .from('squads')
        .select('*, squad_members(count)')
        .eq('created_by', userId);
      // Fetch squads joined by the user (but not created)
      const { data: joinedRows, error: joinedError } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('member_id', userId);
      if (!mounted) return;
      if (createdError || joinedError) {
        setError(createdError?.message || joinedError?.message || 'Error fetching squads');
        setLoading(false);
        return;
      }
      // Unique squad IDs from joined rows
      const joinedIds = joinedRows?.map((row: any) => row.squad_id) || [];
      const { data: joinedSquads } = joinedIds.length
        ? await supabase
            .from('squads')
            .select('*, squad_members(count)')
            .in('id', joinedIds)
        : { data: [] } as any;
      const all: Squad[] = [];
      if (createdData) all.push(...(createdData as any));
      if (joinedSquads) {
        // Avoid duplicates
        joinedSquads.forEach((sq: any) => {
          if (!all.find((s) => s.id === sq.id)) {
            all.push(sq);
          }
        });
      }
      setSquads(all);
      setLoading(false);
    }
    fetchMySquads();
    const channel = supabase
      .channel('public:my-squads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'squads' },
        () => {
          fetchMySquads();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'squad_members' },
        () => {
          fetchMySquads();
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (squad: Squad) => {
    const pin = prompt('Enter PIN to delete this squad');
    if (!pin) return;
    const valid = await verifyPin(pin, squad.pin_hash);
    if (!valid) {
      alert('Incorrect PIN');
      return;
    }
    await supabase.from('squads').delete().eq('id', squad.id);
  };

  if (loading) return <p>Loading your squads…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Squads</h1>
      {squads.length === 0 && <p>You have no squads.</p>}
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
