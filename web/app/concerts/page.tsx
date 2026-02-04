"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Concert = {
  id: string;
  name: string;
  location: string;
  date: string;
  poster: string;
  ticketPrice: number | null;
  promoted: boolean | null;
  artist: { name: string };
};


function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function ConcertsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    location: "",
    promoted: false,
    price: [0, 5000] as [number, number],
    date: undefined as Date | undefined,
  });

  const debouncedFilters = useDebounce(filters);

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        setLoading(true);

        const params = {
          search: debouncedFilters.search || undefined,
          location: debouncedFilters.location || undefined,
          promoted: debouncedFilters.promoted ? "true" : undefined,
          priceMin: debouncedFilters.price[0],
          priceMax: debouncedFilters.price[1],
          date: debouncedFilters.date
            ? debouncedFilters.date.toISOString().split("T")[0]
            : undefined,
        };

        const res = await axios.get(
          "http://localhost:3006/api/v2/concerts",
          { params, withCredentials: true }
        );

        const data = res.data?.concerts;
        setConcerts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("FETCH CONCERTS ERROR", err);
        setConcerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConcerts();
  }, [debouncedFilters]);

  return (
    <div className="flex gap-10 p-8">
      <aside className="w-72 space-y-6">
        <h2 className="text-lg font-semibold">Filters</h2>

        <Input
          placeholder="Search artist or concert"
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value }))
          }
        />

        <Input
          placeholder="Location"
          value={filters.location}
          onChange={(e) =>
            setFilters((f) => ({ ...f, location: e.target.value }))
          }
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Select Date</Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={filters.date}
              onSelect={(date) =>
                setFilters((f) => ({ ...f, date }))
              }
            />
          </PopoverContent>
        </Popover>

        <div>
          <p className="text-sm font-medium mb-2">Price Range</p>
          <Slider
            min={0}
            max={5000}
            step={100}
            value={filters.price}
            onValueChange={(val) =>
              setFilters((f) => ({ ...f, price: val as [number, number] }))
            }
          />
          <p className="text-xs mt-1">
            ₹{filters.price[0]} – ₹{filters.price[1]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={filters.promoted}
            onCheckedChange={(val) =>
              setFilters((f) => ({ ...f, promoted: Boolean(val) }))
            }
          />
          <span>Promoted</span>
        </div>
      </aside>
      <main className="grid grid-cols-4 gap-6 flex-1">
        {loading && <p>Loading...</p>}

        {concerts.map((c) => (
          <div key={c.id} className="rounded-xl overflow-hidden shadow">
            <div className="relative h-72">
              <Image
                src={c.poster}
                alt={c.name}
                fill
                className="object-cover"
              />
              {c.promoted === true && (
                <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  PROMOTED
                </span>
              )}
            </div>

            <div className="p-4">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-gray-600">{c.artist.name}</p>
              <p className="text-sm text-gray-500">{c.location}</p>
              {c.ticketPrice !== null && (
                <p className="text-sm mt-1">
                  ₹{c.ticketPrice} onwards
                </p>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
