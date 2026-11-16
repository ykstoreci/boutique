"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    // En développement local : redirection directe immédiate sans formulaire
    if (isDev) {
      window.location.replace("/admin");
      return;
    }

    async function checkSetup() {
      try {
        const res = await fetch("/api/admin/setup");
        const data = await res.json();
        if (data.success && data.isSetupRequired) {
          setSetupRequired(true);
        }
      } catch {}
    }
    checkSetup();
  }, [isDev]);

  if (isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/brand-b.png"
            alt="Logo"
            width={40}
            height={48}
            className="h-12 w-auto object-contain mx-auto"
          />
          <div className="space-y-1">
            <h1 className="text-base font-bold text-gray-900">Accès Administrateur Direct</h1>
            <p className="text-xs text-emerald-600 font-semibold">Mode développement local actif</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
            <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Ouverture du tableau de bord...</span>
          </div>
          <Link
            href="/admin"
            className="inline-block mt-4 text-xs font-bold text-black underline hover:text-gray-700"
          >
            Cliquez ici si la redirection ne démarre pas &rarr;
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Identifiants incorrects.");
        setLoading(false);
        return;
      }

      window.location.href = data.redirect || "/admin";
    } catch {
      setError("Erreur de connexion. Vérifiez votre réseau.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/brand-b.png"
            alt="Logo"
            width={40}
            height={48}
            className="h-12 w-auto object-contain mx-auto"
          />
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Espace Propriétaire
          </h1>
          <p className="text-xs text-gray-500">
            Connectez-vous pour gérer votre boutique
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {setupRequired && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs space-y-1">
            <p className="font-semibold">🚀 Premier démarrage détecté</p>
            <p>
              Aucun administrateur n&apos;a encore été créé.{" "}
              <Link href="/admin/setup" className="font-bold underline hover:text-blue-900">
                Initialisez votre compte propriétaire ici →
              </Link>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Adresse email
            </label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@votre-domaine.com"
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-black text-white font-semibold text-sm shadow-md hover:bg-gray-800 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Connexion en cours...</span>
              </>
            ) : (
              <span>Se connecter</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

