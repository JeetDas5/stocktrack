export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F1F5F9] font-sans">

      <div className="relative mb-6 animate-fade-in">

        <div className="h-16 w-16 rounded-full border-[3px] border-[#DCFCE7] border-t-[#16A34A] animate-spin" />

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#16A34A] font-extrabold text-lg tracking-tighter">
            S
          </span>
        </div>
      </div>


      <div className="flex flex-col items-center gap-2 animate-fade-in">
        <div className="h-2 w-40 bg-[#DCFCE7] rounded-full overflow-hidden">
          <div
            className="h-full w-1/2 bg-[#16A34A]/40 rounded-full"
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
