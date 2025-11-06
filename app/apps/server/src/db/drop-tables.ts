import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function dropTables() {
  try {
    console.log("Dropping old tables...");
    
    // Drop tables in reverse order of dependencies
    await sql`DROP TABLE IF EXISTS messages CASCADE`;
    console.log("✓ Dropped messages table");
    
    await sql`DROP TABLE IF EXISTS conversations CASCADE`;
    console.log("✓ Dropped conversations table");
    
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    console.log("✓ Dropped users table");
    
    console.log("\n✅ All old tables dropped successfully!");
  } catch (error) {
    console.error("Error dropping tables:", error);
    process.exit(1);
  }
}

dropTables();
