require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAdmin() {
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: existingConfig } = await supabase.from('SystemConfig').select('*').eq('key', 'adminPassword').single();
  
  if (existingConfig) {
    console.log("Admin password already exists in database. Updating it to admin123...");
    const { error: updateError } = await supabase.from('SystemConfig').update({ value: hashedPassword, updatedBy: 'system', updatedAt: new Date() }).eq('key', 'adminPassword');
    if (updateError) {
      console.error("Error updating admin password:", updateError);
    } else {
      console.log("Successfully updated admin password to admin123!");
    }
  } else {
    console.log("Admin password not found in database. Inserting it...");
    const { error: insertError } = await supabase.from('SystemConfig').insert([
        { key: 'adminPassword', value: hashedPassword, updatedBy: 'system', updatedAt: new Date() }
    ]);
    if (insertError) {
      console.error("Error inserting admin password:", insertError);
    } else {
      console.log("Successfully inserted admin password as admin123!");
    }
  }
}

setupAdmin().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
