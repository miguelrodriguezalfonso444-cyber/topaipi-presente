import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jmzdnwhdyfvdibsqtids.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptemRud2hkeWZ2ZGlic3F0aWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4OTg3NjgsImV4cCI6MjEwNDQ3NDc2OH0.4AMtuU6g6eEVEa8ELeLGL6H7Uh6B-_cWkEhQq0Q1vQo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);