export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
      <div className="relative mb-6 animate-fade-in">
        <div className="h-16 w-16 rounded-full border-[3px] border-zinc-200 border-t-zinc-900 animate-spin" />

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-zinc-900 font-extrabold text-lg tracking-tighter">
            N
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 animate-fade-in">
        <div className="h-2 w-40 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full w-1/2 bg-zinc-400 rounded-full"
            style={{
              animation: "shimmer 1.4s ease-in-out infinite",
            }}
          />
        </div>
        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mt-2">
          Loading...
        </span>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
