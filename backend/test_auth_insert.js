const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// I'll grab a valid JWT token from the logged in user or I'll just see if I can sign in as a user 
// from email/password to get a real token, then insert to test.
async function test() {
    const supabase = createClient(url, key);

    // Create a dummy user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'test_insert@example.com',
        password: 'password123'
    });

    if (authError) {
        console.log('SignUp Error (or exists):', authError.message);
    }

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'test_insert@example.com',
        password: 'password123'
    });

    if (loginError) return console.error("Login failed", loginError.message);
    const token = loginData.session.access_token;

    // Now use auth client
    const authSupabase = createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data, error } = await authSupabase.from('problems').insert({ problem_statement: "hello world" }).select();
    console.log("Insert problem:", error || data);
}

test();
