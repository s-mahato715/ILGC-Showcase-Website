const SUPABASE_URL = "https://dkfbnxosrbwrfncoeqek.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_l6nFd0wZ7L6aAorxQJVGfQ_zA97-z7X";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
