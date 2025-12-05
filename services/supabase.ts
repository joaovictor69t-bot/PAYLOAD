import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://atnxupyswecbygshntvl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnh1cHlzd2VjYnlnc2hudHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjUxNDgsImV4cCI6MjA4MDUwMTE0OH0.wd93U5LXvew1GzaQ7vVf0MHlatM9fyEB9bec02XPvhM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
