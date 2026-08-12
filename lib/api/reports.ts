/**
 * User report API — lets authenticated users report a post or comment.
 *
 * RLS (migration 015) only allows inserting your own report, prevents
 * duplicates (UNIQUE reporter/target), and blocks banned users from reporting.
 */

import { supabase } from '@/lib/supabase';

export interface SubmitReportParams {
  targetType: 'post' | 'comment';
  targetId: string;
  reason: string;
  details?: string;
}

/** File a report. Throws a friendly message if the user already reported it. */
export async function submitReport({ targetType, targetId, reason, details }: SubmitReportParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details?.trim() || null,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already reported this.');
    }
    if (error.code === '42501') {
      throw new Error('Your account is suspended and cannot take actions.');
    }
    throw error;
  }
}
