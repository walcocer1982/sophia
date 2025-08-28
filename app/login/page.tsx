import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import LoginButton from "@/components/LoginButton";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/engine-chat");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Bienvenido</h1>
          <p className="mt-1 text-sm text-gray-500">Inicia sesión para continuar</p>
        </div>
        <LoginButton />
      </div>
    </main>
  );
}



