const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oeltphtusjrvgcdtvnet.supabase.co';
const supabaseAnonKey = 'sb_publishable_V1oKc4RKQ_0wsGkuESpiuA_U77pH80j';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  const email = `test_doctor_${Date.now()}@example.com`;
  const password = 'password123';

  console.log(`1. Signing up user: ${email}...`);
  // Note: If email confirmation is enabled, we won't get a session, but let's check
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpError) {
    console.error('Signup failed:', signUpError.message);
    return;
  }

  console.log('Signup success! Session:', signUpData.session ? 'Yes' : 'No');

  // Let's try to sign in with password (if confirm email is disabled, this will work)
  console.log('2. Signing in...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.warn('Sign-in failed (probably needs email confirmation):', signInError.message);
    console.log('We will try testing with service role or check RLS directly.');
    return;
  }

  const session = signInData.session;
  const user = session.user;
  console.log(`Signed in successfully! User ID: ${user.id}`);

  // Now, test inserting a note summary
  console.log('3. Testing note_summaries insert...');
  const { error: sumError } = await supabase
    .from('note_summaries')
    .insert({
      id: 'test_sum_' + Date.now(),
      user_id: user.id,
      title: 'Test Summary',
      summary_text: 'This is a test summary text',
      original_notes: 'Original test notes',
      style: 'concise',
      date: 'Jun 2'
    });

  if (sumError) {
    console.error('FAIL: note_summaries insert failed:', sumError.message);
  } else {
    console.log('SUCCESS: note_summaries insert worked!');
  }

  // Test inserting a flashcard deck
  console.log('4. Testing flashcard_decks insert...');
  const { error: deckError } = await supabase
    .from('flashcard_decks')
    .insert({
      id: 'test_deck_' + Date.now(),
      user_id: user.id,
      title: 'Test Deck',
      cards: [{ front: 'Q', back: 'A' }],
      grades: {},
      original_notes: 'Original test notes'
    });

  if (deckError) {
    console.error('FAIL: flashcard_decks insert failed:', deckError.message);
  } else {
    console.log('SUCCESS: flashcard_decks insert worked!');
  }

  // Test inserting a quiz history
  console.log('5. Testing quiz_history insert...');
  const { error: quizError } = await supabase
    .from('quiz_history')
    .insert({
      id: 'test_quiz_' + Date.now(),
      user_id: user.id,
      score: 10,
      total_questions: 10,
      questions: [],
      original_notes: 'Original test notes',
      date: 'Jun 2'
    });

  if (quizError) {
    console.error('FAIL: quiz_history insert failed:', quizError.message);
  } else {
    console.log('SUCCESS: quiz_history insert worked!');
  }
}

main();
