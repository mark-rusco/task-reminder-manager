-- ============================================================
-- Focusly — 0008: Profile fields for LILO integration
-- Run after 0007. Replaces the placeholder seed profile fields
-- with the real user profile: First name, Last name, EID and
-- Shift Schedule. LILO reads EID and the shift times from each
-- user's profile.custom_fields when generating a month.
-- ============================================================

-- Drop the earlier placeholder seeds (values left behind in
-- profiles.custom_fields are simply ignored going forward).
delete from public.profile_fields where key in ('job_title', 'department', 'location');

insert into public.profile_fields (key, label, type, options, required, sort_order, active) values
  ('first_name', 'First name', 'text', null, true, 1, true),
  ('last_name',  'Last name',  'text', null, true, 2, true),
  ('eid',        'EID',        'text', null, false, 3, true),
  (
    'shift_schedule',
    'Shift Schedule',
    'select',
    '["04:00 PM - 01:00 AM","08:00 AM - 05:00 PM","09:00 AM - 06:00 PM","06:00 PM - 03:00 AM","12:00 PM - 09:00 PM"]',
    false,
    4,
    true
  )
on conflict (key) do nothing;