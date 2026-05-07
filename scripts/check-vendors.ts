import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: all, error: e1 } = await supabase
    .from("vendors")
    .select("id, name, active, contact_phone");
  if (e1) {
    console.error(e1);
    return;
  }
  console.log(`전체: ${all?.length}`);
  console.log(`active=true: ${all?.filter((v) => v.active).length}`);
  console.log(`active=false: ${all?.filter((v) => !v.active).length}`);
  console.log("");
  console.log("샘플:");
  for (const v of all?.slice(0, 5) ?? []) {
    console.log(`  ${v.name} (active=${v.active})`);
  }
}
main();
