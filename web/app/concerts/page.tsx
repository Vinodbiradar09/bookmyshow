"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Concert = {
  id: string;
  name: string;
  location: string;
  date: string;
  poster: string;
  ticketPrice: number;
  promoted: boolean;
  artist: { name: string };
};

export default function ConcertsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<any>({
    search: "",
    location: "",
    promoted: false,
    price: [0, 5000],
    date: undefined,
  });

  useEffect(() => {
    const fetchConcerts = async () => {
      setLoading(true);

      const params: any = {
        search: filters.search || undefined,
        location: filters.location || undefined,
        promoted: filters.promoted || undefined,
        priceMin: filters.price[0],
        priceMax: filters.price[1],
        date: filters.date
          ? filters.date.toISOString().split("T")[0]
          : undefined,
      };

      const res = await axios.get(
        "http://localhost:3006/api/v2/concerts",
        { params , withCredentials : true }
      );
      setConcerts(res.data.concerts);
      setLoading(false);
    };

    fetchConcerts();
  }, [filters]);

  return (
    <div className="flex gap-10 p-8">
      {/* SIDEBAR */}
      <aside className="w-72 space-y-6">
        <h2 className="text-lg font-semibold">Filters</h2>

        {/* SEARCH */}
        <Input
          placeholder="Search artist or concert"
          value={filters.search}
          onChange={(e) =>
            setFilters((f: any) => ({ ...f, search: e.target.value }))
          }
        />

        {/* LOCATION */}
        <Input
          placeholder="Location"
          value={filters.location}
          onChange={(e) =>
            setFilters((f: any) => ({ ...f, location: e.target.value }))
          }
        />

        {/* DATE */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Select Date</Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={filters.date}
              onSelect={(date : any) =>
                setFilters((f: any) => ({ ...f, date }))
              }
            />
          </PopoverContent>
        </Popover>

        {/* PRICE */}
        <div>
          <p className="text-sm font-medium mb-2">Price Range</p>
          <Slider
            min={0}
            max={5000}
            step={100}
            value={filters.price}
            onValueChange={(val : any) =>
              setFilters((f: any) => ({ ...f, price: val }))
            }
          />
          <p className="text-xs mt-1">
            ₹{filters.price[0]} – ₹{filters.price[1]}
          </p>
        </div>

        {/* PROMOTED */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filters.promoted}
            onCheckedChange={(val : any) =>
              setFilters((f: any) => ({ ...f, promoted: Boolean(val) }))
            }
          />
          <span>Promoted</span>
        </div>
      </aside>

      {/* GRID */}
      <main className="grid grid-cols-4 gap-6 flex-1">
        {loading && <p>Loading...</p>}

        {concerts?.map((c) => {
          const d = new Date(c.date);
          return (
            <div key={c.id} className="rounded-xl overflow-hidden shadow">
              <div className="relative h-72">
                <Image src={c.poster} alt={c.name} fill className="object-cover" />
                {c.promoted && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    PROMOTED
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-gray-600">{c.artist.name}</p>
                <p className="text-sm text-gray-500">{c.location}</p>
                <p className="text-sm mt-1">₹{c.ticketPrice} onwards</p>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
