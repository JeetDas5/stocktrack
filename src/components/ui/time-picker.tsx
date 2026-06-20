"use client";

interface TimePickerProps {
  value: string; // "HH:MM" in 24h format
  onChange: (timeStr: string) => void;
  className?: string;
}

export default function TimePicker({
  value,
  onChange,
  className = "",
}: TimePickerProps) {
  // Parse 24h time to 12h format
  const [hour24Str, minuteStr] = (value || "09:00").split(":");
  let h24 = parseInt(hour24Str, 10);
  if (isNaN(h24)) h24 = 9;
  const currentMin = minuteStr || "00";

  const currentPeriod = h24 >= 12 ? "PM" : "AM";
  let currentHour12 = h24 % 12;
  if (currentHour12 === 0) currentHour12 = 12;

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [
    "00",
    "05",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
  ];
  const periods = ["AM", "PM"];

  const to24Hour = (h12: number, min: string, ampm: string) => {
    let h24Val = h12;
    if (ampm === "PM" && h12 !== 12) {
      h24Val += 12;
    } else if (ampm === "AM" && h12 === 12) {
      h24Val = 0;
    }
    const h24Str = h24Val.toString().padStart(2, "0");
    return `${h24Str}:${min}`;
  };

  const handleSelectHour = (h: number) => {
    const new24h = to24Hour(h, currentMin, currentPeriod);
    onChange(new24h);
  };

  const handleSelectMinute = (m: string) => {
    const new24h = to24Hour(currentHour12, m, currentPeriod);
    onChange(new24h);
  };

  const handleSelectPeriod = (p: string) => {
    const new24h = to24Hour(currentHour12, currentMin, p);
    onChange(new24h);
  };

  return (
    <div
      className={`absolute right-0 mt-2 bg-white border border-black/10 rounded-3xl shadow-xl p-4 z-50 w-64 animate-scale-in flex gap-2 ${className}`}
    >
      <div className="flex-1 flex flex-col items-center">
        <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-2">
          Hour
        </span>
        <div className="w-full h-40 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-thin">
          {hours.map((h) => {
            const isSelected = h === currentHour12;
            return (
              <button
                key={h}
                type="button"
                onClick={() => handleSelectHour(h)}
                className={`py-1 text-xs rounded-full transition-all cursor-pointer font-bold w-full text-center ${
                  isSelected
                    ? "bg-black text-white font-extrabold"
                    : "text-black hover:bg-black hover:text-white"
                }`}
              >
                {h.toString().padStart(2, "0")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-px bg-black/10 h-44 mt-2" />

      {/* Minutes Column */}
      <div className="flex-1 flex flex-col items-center">
        <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-2">
          Min
        </span>
        <div className="w-full h-40 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-thin">
          {minutes.map((m) => {
            const isSelected = m === currentMin;
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSelectMinute(m)}
                className={`py-1 text-xs rounded-full transition-all cursor-pointer font-bold w-full text-center ${
                  isSelected
                    ? "bg-black text-white font-extrabold"
                    : "text-black hover:bg-black hover:text-white"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-black/10 h-44 mt-2" />

      {/* AM/PM Column */}
      <div className="w-16 flex flex-col items-center justify-center h-44 mt-2 gap-2">
        {periods.map((p) => {
          const isSelected = p === currentPeriod;
          return (
            <button
              key={p}
              type="button"
              onClick={() => handleSelectPeriod(p)}
              className={`py-2 text-xs rounded-full transition-all cursor-pointer font-extrabold w-full text-center ${
                isSelected
                  ? "bg-black text-white"
                  : "text-black/40 hover:bg-black hover:text-white"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
