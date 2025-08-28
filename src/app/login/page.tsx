"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn("credentials", { email, password, callbackUrl: "/engine-chat" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-md border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Iniciar sesión</h1>
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/engine-chat' })}
          className="w-full rounded border bg-white px-4 py-2 text-sm shadow-sm"
        >
          Continuar con Google
        </button>
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input className="w-full rounded border px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input type="password" className="w-full rounded border px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="w-full rounded bg-blue-600 px-4 py-2 text-white">Entrar</button>
      </form>
    </div>
  );
}
