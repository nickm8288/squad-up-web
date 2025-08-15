"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabaseClient';
import { hashPin } from '../../lib/utils';

const formSchema = z.object({
  title: z.string().min(3, 'Required'),
  discipline: z.enum(['sporting_clays', 'five_stand', 'trap', 'skeet', 'other']),
  range_name: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  scheduled_date: z.string().min(1, 'Required'),
  scheduled_time: z.string().min(1, 'Required'),
  capacity: z.coerce.number().min(1),
  contact_method: z.enum(['email', 'phone', 'text']),
  contact_value: z.string().min(3, 'Required'),
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(8, 'PIN must be at most 8 digits'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateSquadPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError('You must be signed in to create a squad.');
        setSubmitting(false);
        return;
      }
      // Upsert profile for the user if it doesn't exist
      await supabase.from('profiles').upsert({
        id: userData.user.id,
        display_name: userData.user.email,
      });
      const { scheduled_date, scheduled_time, pin, ...rest } = data;
      // Combine date and time into ISO string in user's local timezone
      const combined = new Date(`${scheduled_date}T${scheduled_time}`);
      // Hash the pin
      const pinHash = await hashPin(pin);
      // Insert squad
      const { data: insertData, error: insertError } = await supabase.from('squads').insert({
        ...rest,
        scheduled_at: combined.toISOString(),
        pin_hash: pinHash,
        created_by: userData.user.id,
      }).select().single();
      if (insertError || !insertData) {
        throw insertError || new Error('Unable to create squad');
      }
      // Add the creator as leader in squad_members
      await supabase.from('squad_members').insert({
        squad_id: insertData.id,
        member_id: userData.user.id,
        is_leader: true,
      });
      setSuccess('Squad created successfully!');
      reset();
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create a New Squad</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            type="text"
            {...register('title')}
            className="mt-1 w-full border rounded px-3 py-2"
          />
          {errors.title && <p className="text-red-600 text-sm">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Discipline</label>
          <select {...register('discipline')} className="mt-1 w-full border rounded px-3 py-2">
            <option value="sporting_clays">Sporting Clays</option>
            <option value="five_stand">Five Stand</option>
            <option value="trap">Trap</option>
            <option value="skeet">Skeet</option>
            <option value="other">Other</option>
          </select>
          {errors.discipline && <p className="text-red-600 text-sm">{errors.discipline.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Range Name</label>
          <input
            type="text"
            {...register('range_name')}
            className="mt-1 w-full border rounded px-3 py-2"
          />
          {errors.range_name && <p className="text-red-600 text-sm">{errors.range_name.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">City</label>
            <input
              type="text"
              {...register('city')}
              className="mt-1 w-full border rounded px-3 py-2"
            />
            {errors.city && <p className="text-red-600 text-sm">{errors.city.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">State</label>
            <input
              type="text"
              {...register('state')}
              className="mt-1 w-full border rounded px-3 py-2"
            />
            {errors.state && <p className="text-red-600 text-sm">{errors.state.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input type="date" {...register('scheduled_date')} className="mt-1 w-full border rounded px-3 py-2" />
            {errors.scheduled_date && <p className="text-red-600 text-sm">{errors.scheduled_date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Time</label>
            <input type="time" {...register('scheduled_time')} className="mt-1 w-full border rounded px-3 py-2" />
            {errors.scheduled_time && <p className="text-red-600 text-sm">{errors.scheduled_time.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Capacity</label>
          <input type="number" {...register('capacity', { valueAsNumber: true })} className="mt-1 w-full border rounded px-3 py-2" />
          {errors.capacity && <p className="text-red-600 text-sm">{errors.capacity.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Preferred Contact Method</label>
            <select {...register('contact_method')} className="mt-1 w-full border rounded px-3 py-2">
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="text">Text</option>
            </select>
            {errors.contact_method && <p className="text-red-600 text-sm">{errors.contact_method.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium">Contact Details</label>
            <input
              type="text"
              {...register('contact_value')}
              className="mt-1 w-full border rounded px-3 py-2"
            />
            {errors.contact_value && <p className="text-red-600 text-sm">{errors.contact_value.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">PIN (4–8 digits)</label>
          <input
            type="password"
            {...register('pin')}
            className="mt-1 w-full border rounded px-3 py-2"
          />
          {errors.pin && <p className="text-red-600 text-sm">{errors.pin.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Notes (optional)</label>
          <textarea {...register('notes')} className="mt-1 w-full border rounded px-3 py-2" rows={3}></textarea>
        </div>
        {error && <p className="text-red-600">{error}</p>}
        {success && <p className="text-green-600">{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Squad'}
        </button>
      </form>
    </div>
  );
}
