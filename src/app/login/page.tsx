"use client";

import { useState } from "react";
import { loginAdmin } from "@/lib/services/auth.service";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await loginAdmin(email, password);
      alert("Logged in");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-10 flex flex-col gap-4 max-w-sm">
      <input
        placeholder="Email"
        className="border p-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        className="border p-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin} className="bg-black text-white p-2">
        Login
      </button>
    </div>
  );
}
