"use client";
import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/engine-chat" })}
      className="flex w-full items-center justify-center gap-3 rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.99]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden>
        <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.6-37-5-54.9H272.1v103.9h146.9c-6.3 34.8-25.6 64.3-54.6 84v69.7h88.3c51.7-47.6 80.8-117.8 80.8-202.7z"/>
        <path fill="#34A853" d="M272.1 544.3c73.1 0 134.6-24.2 179.5-66l-88.3-69.7c-24.5 16.5-56 26-91.2 26-70 0-129.4-47.2-150.7-110.7H31.7v69.9C76.9 487.3 168.8 544.3 272.1 544.3z"/>
        <path fill="#FBBC05" d="M121.4 323.9c-10.1-30.1-10.1-62.5 0-92.6V161.4H31.7c-41.9 83.7-41.9 183.8 0 267.5l89.7-69.9z"/>
        <path fill="#EA4335" d="M272.1 107.7c39.7-.6 78.1 14.5 107.2 42.3l79.8-79.8C407.1 24.9 340.1-.8 272.1 0 168.8 0 76.9 57 31.7 161.4l89.7 69.9C142.7 167.8 202.2 107.7 272.1 107.7z"/>
      </svg>
      Ingresar con Google
    </button>
  );
}


