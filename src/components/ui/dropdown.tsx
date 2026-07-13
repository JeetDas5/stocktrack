"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption<T> {
  readonly value: T;
  readonly label: string;
}

interface DropdownProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: readonly DropdownOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
}


export function Dropdown<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Select option",
  className = "",
  triggerClassName = "",
  menuClassName = "",
  optionClassName = "",
  disabled = false,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center bg-white border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50/50 transition-colors focus:outline-none focus:ring-1 focus:ring-[#0a2924] focus:border-[#0a2924] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${triggerClassName}`}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 mt-1.5 w-full bg-white border border-zinc-200 rounded-xl shadow-lg z-30 overflow-hidden py-1 animate-fade-in origin-top ${menuClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const isActionBtn = option.value === "CREATE_NEW_CUSTOM";

            if (isActionBtn) {
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 w-full text-center text-xs font-extrabold text-zinc-950 bg-zinc-50 border-t border-zinc-150 hover:bg-zinc-100 hover:text-black transition-colors cursor-pointer mt-1"
                >
                  <span>{option.label}</span>
                </button>
              );
            }

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3.5 py-2 w-full text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-zinc-50 text-[#0a2924] font-bold"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                } ${optionClassName}`}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#0a2924]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
