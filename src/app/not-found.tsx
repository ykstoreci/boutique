import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 text-center">
      <div className="max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <span className="text-4xl">🔍</span>
        <h1 className="text-xl font-black text-gray-900">Page introuvable</h1>
        <p className="text-xs text-gray-500">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

