/**
 * Announcements API — admin-published announcements shown on the homepage
 * "What's Cooking" section and a dedicated user-facing listing page.
 * Announcement messages are capped at MAX_WORDS (enforced in the admin form).
 */

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];

export const MAX_WORDS = 50;

export type AnnouncementInput = {
  title: string;
  message: string;
  is_published?: boolean;
};

/** Count words in a piece of text (whitespace/newline separated). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

// ============================================================================
// FETCHERS
// ============================================================================

/** Fetch published announcements (newest first) — for the homepage + listing. */
export async function fetchAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as AnnouncementRow[];
}

/** Fetch all announcements including drafts — for the admin management page. */
export async function fetchAllAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as AnnouncementRow[];
}

// ============================================================================
// MUTATIONS (admin only — RLS enforces the admin check)
// ============================================================================

export async function createAnnouncement(input: AnnouncementInput): Promise<AnnouncementRow> {
  const { data, error } = await supabase.from('announcements').insert(input).select('*').single();
  if (error) throw error;
  return data as AnnouncementRow;
}

export async function updateAnnouncement(
  id: string,
  updates: Partial<AnnouncementInput>
): Promise<AnnouncementRow> {
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as AnnouncementRow;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}
