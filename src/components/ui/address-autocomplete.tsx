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
  mainText: string;
  secondaryText: string;
  formatted: string;
  isGooglePlace?: boolean;
  details?: AddressDetails;
}

declare global {
  interface Window {
    google?: any;
  }
}

let googleScriptLoadingPromise: Promise<void> | null = null;

function loadGoogleMapsSdk(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.google?.maps?.places) return Promise.resolve();

  if (!googleScriptLoadingPromise) {
    googleScriptLoadingPromise = new Promise((resolve, reject) => {
      const scriptId = "google-maps-js-sdk";
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", (err) => reject(err));
        return;
      }

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  return googleScriptLoadingPromise;
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
  const [isGooglePowered, setIsGooglePowered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  // Initialize Google Maps services
  useEffect(() => {
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    if (!apiKey) return;

    loadGoogleMapsSdk(apiKey)
      .then(() => {
        if (window.google?.maps?.places) {
          setIsGooglePowered(true);
          autocompleteServiceRef.current =
            new window.google.maps.places.AutocompleteService();
          const dummyDiv = document.createElement("div");
          placesServiceRef.current =
            new window.google.maps.places.PlacesService(dummyDiv);
        }
      })
      .catch((err) => {
        console.warn("Failed to load Google Maps Places SDK, falling back to OSM", err);
      });
  }, []);

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

    // 1. Try Google Maps Places Autocomplete if service is ready
    if (autocompleteServiceRef.current && window.google?.maps?.places) {
      try {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: query,
            types: ["geocode", "establishment"],
          },
          (predictions: any[], status: any) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              predictions &&
              predictions.length > 0
            ) {
              const googleItems: SuggestionItem[] = predictions.map((p) => ({
                id: p.place_id,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || "",
                formatted: p.description,
                isGooglePlace: true,
              }));

              setSuggestions(googleItems);
              setIsGooglePowered(true);
              setIsOpen(true);
              setLoading(false);
              return;
            }

            // Fallback to OSM if Google predictions status is zero results or errored
            fetchOsmFallback(query);
          }
        );
        return;
      } catch (err) {
        console.error("Google Places prediction error:", err);
      }
    }

    // 2. Fallback to OpenStreetMap / Photon
    fetchOsmFallback(query);
  }, []);

  const fetchOsmFallback = async (query: string) => {
    try {
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
              mainText: line1,
              secondaryText: subtitle,
              formatted,
              isGooglePlace: false,
              details: {
                addressLine1: line1,
                city,
                stateProvince: state,
                postalCode,
                country,
                formattedAddress: formatted,
              },
            };
          }
        );

        setSuggestions(items);
        setIsGooglePowered(false);
        setIsOpen(items.length > 0);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("OSM autocomplete error:", err);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

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

  const parseGooglePlaceDetails = (place: any, fallbackFormatted: string): AddressDetails => {
    const components = place.address_components || [];
    let streetNumber = "";
    let route = "";
    let city = "";
    let state = "";
    let postalCode = "";
    let country = "";

    components.forEach((c: any) => {
      const types: string[] = c.types || [];
      if (types.includes("street_number")) {
        streetNumber = c.long_name || c.short_name;
      } else if (types.includes("route")) {
        route = c.long_name || c.short_name;
      } else if (
        types.includes("locality") ||
        types.includes("postal_town") ||
        types.includes("sublocality_level_1")
      ) {
        if (!city) city = c.long_name || c.short_name;
      } else if (types.includes("administrative_area_level_1")) {
        state = c.long_name || c.short_name;
      } else if (types.includes("postal_code")) {
        postalCode = c.long_name || c.short_name;
      } else if (types.includes("country")) {
        country = c.long_name || c.short_name;
      }
    });

    const addressLine1 =
      [streetNumber, route].filter(Boolean).join(" ") ||
      place.name ||
      fallbackFormatted;

    return {
      addressLine1,
      city,
      stateProvince: state,
      postalCode,
      country,
      formattedAddress: place.formatted_address || fallbackFormatted,
    };
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    if (item.isGooglePlace && placesServiceRef.current) {
      setLoading(true);
      placesServiceRef.current.getDetails(
        {
          placeId: item.id,
          fields: ["address_components", "formatted_address", "name"],
        },
        (place: any, status: any) => {
          setLoading(false);
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            const details = parseGooglePlaceDetails(place, item.formatted);
            onAddressSelect(details);
          } else {
            // Fallback if details lookup fails
            onAddressSelect({
              addressLine1: item.mainText,
              city: "",
              stateProvince: "",
              postalCode: "",
              country: "",
              formattedAddress: item.formatted,
            });
          }
          setIsOpen(false);
          setSuggestions([]);
          setSelectedIndex(-1);
        }
      );
    } else if (item.details) {
      onAddressSelect(item.details);
      setIsOpen(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    } else {
      onAddressSelect({
        addressLine1: item.mainText,
        city: "",
        stateProvince: "",
        postalCode: "",
        country: "",
        formattedAddress: item.formatted,
      });
      setIsOpen(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    }
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
              className="text-zinc-400 hover:text-zinc-600 transition-colors p-0.5 cursor-pointer"
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
              {isGooglePowered ? "Powered by Google Maps" : "Powered by OpenStreetMap"}
            </span>
          </div>

          {suggestions.map((item, idx) => {
            const isSelected = idx === selectedIndex;
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
                    {item.mainText}
                  </p>
                  {item.secondaryText && (
                    <p className="text-[11px] text-zinc-500 truncate">
                      {item.secondaryText}
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
