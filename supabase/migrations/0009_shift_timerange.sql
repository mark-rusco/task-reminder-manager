-- ============================================================
-- Focusly — 0009: Shift schedule as a time-range picker
-- Run after 0008. Adds a 'timerange' profile-field type and
-- switches the shift_schedule field to it. The stored value is
-- still "04:00 PM - 01:00 AM" (what LILO parses), but users pick
-- a start + end time instead of choosing from a dropdown.
-- ============================================================

-- Recreate the type check to allow 'timerange'.
alter table public.profile_fields
  drop constraint if exists profile_fields_type_check;

alter table public.profile_fields
  add constraint profile_fields_type_check
    check (type in ('text','textarea','date','select','number','boolean','timerange'));

-- Convert the seeded shift schedule field to the range picker.
update public.profile_fields
   set type = 'timerange', options = null
 where key = 'shift_schedule';