import { NextResponse } from "next/server";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL environment variable is missing" }, { status: 500 });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user by email
    const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    if (userRes.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRes.rows[0];

    // 2. Hash password using better-auth scrypt
    const hashedPassword = await hashPassword(password);

    // 3. Check if account already exists
    const accountRes = await pool.query(
      "SELECT * FROM accounts WHERE user_id = $1 AND provider_id = $2",
      [user.id, "credential"]
    );

    if (accountRes.rows.length > 0) {
      // Update existing credential account
      await pool.query(
        "UPDATE accounts SET password = $1, updated_at = NOW() WHERE user_id = $2 AND provider_id = $3",
        [hashedPassword, user.id, "credential"]
      );
    } else {
      // Create new credential account row
      const accountId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await pool.query(
        `INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [accountId, user.id, "credential", user.id, hashedPassword]
      );
    }

    await pool.end();
    return NextResponse.json({ 
      success: true, 
      message: `Password updated successfully for ${normalizedEmail}` 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
