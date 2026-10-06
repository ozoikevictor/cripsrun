'use client';

import { apiUrl } from '@/lib/api';


import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

export interface PlaceResult {
  full_address: string;
  lat: number;
  lng: number;
  city: string;
  lga: string;
  area: string;
}

interface ZoneResult {
  zone_id: string;
  zone_name: string;
  customer_delivery_fee: number;
  service_charge: number;
  estimated_delivery_minutes: number;
  is_serviceable: boolean;
}

interface AddressInputProps {
  onAddressSelect: (place: PlaceResult & { zone?: ZoneResult }) => void;
  placeholder?: string;
}

export function AddressInput({
  onAddressSelect,
  placeholder = 'Enter your delivery address',
}: AddressInputProps) {
  const [value, setValue] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteService = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placesService = useRef<any>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const initServices = useCallback(() => {
    if (!window.google) return;
    if (!autocompleteService.current) {
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
    }
    if (!placesService.current) {
      const el = document.createElement('div');
      placesService.current = new window.google.maps.places.PlacesService(el);
    }
  }, []);

  const handleInput = (input: string) => {
    setValue(input);
    setZoneError(null);

    clearTimeout(debounceTimer.current);
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      initServices();
      if (!autocompleteService.current) return;

      autocompleteService.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'ng' },
          types: ['geocode', 'establishment'],
          locationBias: {
            center: { lat: 6.5244, lng: 3.3792 }, // Lagos center
            radius: 100000,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (predictions: any[], status: string) => {
          if (status === 'OK') setSuggestions(predictions ?? []);
        }
      );
    }, 350);
  };

  const handleSelect = async (placeId: string, description: string) => {
    setIsLoading(true);
    setSuggestions([]);
    setValue(description);

    placesService.current.getDetails(
      {
        placeId,
        fields: ['geometry', 'address_components', 'formatted_address'],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (place: any, status: string) => {
        if (status !== 'OK') {
          setIsLoading(false);
          return;
        }

        const components = place.address_components as Array<{
          long_name: string;
          types: string[];
        }>;
        const get = (type: string) =>
          components.find((c) => c.types.includes(type))?.long_name ?? '';

        const placeResult: PlaceResult = {
          full_address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          city: get('locality') || get('sublocality') || get('postal_town'),
          lga: get('administrative_area_level_2'),
          area: get('sublocality_level_1') || get('neighborhood'),
        };

        // Detect delivery zone
        try {
          const response = await fetch(apiUrl('/api/zones/detect'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lga: placeResult.lga,
              area: placeResult.area,
              lat: placeResult.lat,
              lng: placeResult.lng,
            }),
          });
          const data = await response.json();

          if (!data.data?.is_serviceable) {
            setZoneError(
              "Sorry, we don't deliver to this area yet. We're expanding soon!"
            );
            setIsLoading(false);
            return;
          }

          onAddressSelect({ ...placeResult, zone: data.data });
        } catch {
          setZoneError('Could not verify delivery zone. Please try again.');
        }

        setIsLoading(false);
      }
    );
  };

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          id="address-autocomplete"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {suggestions.map((s: any) => (
            <button
              key={s.place_id}
              className="w-full text-left px-4 py-3 text-sm hover:bg-muted border-b last:border-0 transition-colors"
              onClick={() => handleSelect(s.place_id, s.description)}
            >
              <p className="font-medium">
                {s.structured_formatting.main_text}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.structured_formatting.secondary_text}
              </p>
            </button>
          ))}
        </div>
      )}

      {zoneError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{zoneError}</span>
        </div>
      )}
    </div>
  );
}
