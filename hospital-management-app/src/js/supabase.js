import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uubbtwawdgtorzrjbvcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1YmJ0d2F3ZGd0b3J6cmpidmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTA1MDgsImV4cCI6MjA5NDA2NjUwOH0.bc3fOu1FfYDKn629DPLDJLNDb0xwiLhzHA2sgTunC6k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
