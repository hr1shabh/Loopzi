export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] px-6">
      <div className="text-center">
        {/* Logo / Brand */}
        <h1 className="text-5xl font-bold tracking-tight text-[#1A1A1A]">
          🔁 Loopzi
        </h1>
        <p className="mt-3 text-lg text-[#6B7280]">
          Build consistency, daily.
        </p>

        {/* Placeholder CTA — will redirect to /today once auth is wired */}
        <div className="mt-10">
          <a
            href="/today"
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B6B] px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#e85d5d] hover:shadow-xl active:scale-95"
          >
            Get Started →
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-[#6B7280]">
        Free forever · No ads · Open source
      </p>
    </main>
  );
}
