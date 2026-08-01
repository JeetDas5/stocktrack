"use client";

import { MapPin, Loader2, X } from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";

export interface AddressDetails {
  addressLine1: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  formattedAddress?: string;
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (details: AddressDetails) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

interface SuggestionItem {
  id: string;
  addressLine1: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  formatted: string;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter address line 1",
  required = false,
  maxLength = 100,
  className = "",
  disabled = false,
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on click outside
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

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    const geoapifyKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

    try {
      if (geoapifyKey) {
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          query
        )}&apiKey=${geoapifyKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const items: SuggestionItem[] = (data.features || []).map(
            (feat: any, idx: number) => {
              const props = feat.properties || {};
              let line1 = props.address_line1;
              if (!line1 && (props.housenumber || props.street)) {
                line1 = [props.housenumber, props.street]
                  .filter(Boolean)
                  .join(" ");
              }
              if (!line1) {
                line1 = props.name || props.street || props.formatted || query;
              }

              const city =
                props.city ||
                props.municipality ||
                props.town ||
                props.village ||
                props.suburb ||
                props.county ||
                "";
              const state = props.state || props.region || props.state_code || "";
              const postalCode = props.postcode || "";
              const country = props.country || "";

              return {
                id: props.place_id || `geoapify-${idx}`,
                addressLine1: line1,
                city,
                stateProvince: state,
                postalCode,
                country,
                formatted: props.formatted || line1,
              };
            }
          );

          if (items.length > 0) {
            setSuggestions(items);
            setIsOpen(true);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback: Photon (OpenStreetMap) if no key or no results from Geoapify
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        query
      )}&limit=5`;
      const res = await fetch(photonUrl);
      if (res.ok) {
        const data = await res.json();
        const items: SuggestionItem[] = (data.features || []).map(
          (feat: any, idx: number) => {
            const props = feat.properties || {};
            let line1 = [props.housenumber, props.street].filter(Boolean).join(" ");
            if (!line1) line1 = props.name || props.street || query;

            const city = props.city || props.town || props.district || "";
            const state = props.state || "";
            const postalCode = props.postcode || "";
            const country = props.country || "";

            const subtitle = [city, state, postalCode, country]
              .filter(Boolean)
              .join(", ");
            const formatted = subtitle ? `${line1}, ${subtitle}` : line1;

            return {
              id: `photon-${idx}-${props.osm_id || idx}`,
              addressLine1: line1,
              city,
              stateProvince: state,
              postalCode,
              country,
              formatted,
            };
          }
        );

        setSuggestions(items);
        setIsOpen(items.length > 0);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Address autocomplete fetch error:", err);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 300);
    } else {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    onAddressSelect({
      addressLine1: item.addressLine1,
      city: item.city,
      stateProvince: item.stateProvince,
      postalCode: item.postalCode,
      country: item.country,
      formattedAddress: item.formatted,
    });
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
          <MapPin className="h-4 w-4" />
        </span>
        <input
          type="text"
          required={required}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-white border border-zinc-300 focus:border-[#0a2924] rounded-xl py-2.5 pl-10 pr-9 text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0a2924] transition-all disabled:bg-zinc-100 disabled:cursor-not-allowed ${className}`}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && value.trim().length >= 3) {
              setIsOpen(true);
            }
          }}
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {loading ? (
            <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase border-b border-zinc-100 flex items-center justify-between">
            <span>Address Suggestions</span>
            <span className="text-[9px] font-semibold text-zinc-400">
              Powered by Geoapify
            </span>
          </div>

          {suggestions.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const subtitle = [
              item.city,
              item.stateProvince,
              item.postalCode,
              item.country,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-3.5 py-2 flex items-start gap-2.5 transition-colors cursor-pointer ${
                  isSelected ? "bg-zinc-100/80 text-[#0F172A]" : "hover:bg-zinc-50 text-zinc-700"
                }`}
              >
                <MapPin className="h-4 w-4 text-[#0a2924] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 truncate">
                    {item.addressLine1}
                  </p>
                  {subtitle && (
                    <p className="text-[11px] text-zinc-500 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
