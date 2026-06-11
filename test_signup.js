import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iesjpfftcoqwsxavxqgx.supabase.co';
const supabaseKey = 'sb_publishable_FOe8g9DNVr2MhMBBSz_uSQ_mdIxTXM4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  const { data, error } = await supabase.auth.signUp({
    email: 'bielopes.fsilva@gmail.com', // An existing email
    password: 'password123',
    options: {
      data: {
        cpf: '00000000000',
        nome: 'Test Lideranca',
        name: 'Test Lideranca',
        role: 'lideranca'
      }
    }
  });

  console.log('Data:', data);
  console.log('Error:', error);
}

testSignup();
