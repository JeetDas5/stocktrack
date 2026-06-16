import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL environment variable is missing" }, { status: 500 });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const normalizedEmail = email.toLowerCase().trim();

    const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    await pool.end();

    const exists = userRes.rows.length > 0;

    return NextResponse.json({ exists });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL environment variable is missing" }, { status: 500 });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const normalizedEmail = email.toLowerCase().trim();

    const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    await pool.end();

    const exists = userRes.rows.length > 0;

    return NextResponse.json({ exists });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
