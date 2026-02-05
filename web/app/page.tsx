"use client";
import Image from "next/image";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export interface Concert {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
  poster: string;
  ticketPrice?: number;
  artist: {
    id: string;
    name: string;
  };
}

const CARD_WIDTH = 320;
const VISIBLE_CARDS = 4;
const SCROLL_AMOUNT = CARD_WIDTH * VISIBLE_CARDS;

export default function Home() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const concerts = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(
          "http://localhost:3006/api/v2/concerts/recents",
        );

        if (res.data?.success && res.status === 200) {
          setConcerts(res.data.concerts);
        } else {
          setError(res.data.message || "Failed to read the recent concerts");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load concerts");
      } finally {
        setLoading(false);
      }
    };

    concerts();
  }, []);

  const slideLeft = () => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: -SCROLL_AMOUNT,
      behavior: "smooth",
    });
  };

  const slideRight = () => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: SCROLL_AMOUNT,
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen bg-[#f5f5f5] flex flex-col items-center">
      <div className="mt-28 flex flex-col items-center text-center">
        <div className="flex items-center gap-6">
          <h1 className="text-7xl font-extrabold font-brand tracking-tight">
            Book
          </h1>

          <div className="relative w-30 h-30">
            <Image
              src="/496d3581522cd799ddcbbf85393accd0.jpg"
              alt="BookMyShow Logo"
              fill
              className="object-contain mix-blend-multiply"
              priority
              sizes="120px"
            />
          </div>

          <h1 className="text-7xl font-extrabold font-brand tracking-tight">
            Show
          </h1>
        </div>

        <p className="mt-5 text-lg text-gray-600 max-w-2xl">
          Book your favorite concerts, live shows and experiences — seamlessly
          and instantly.
        </p>

        <p className="mt-1 text-sm text-gray-400 tracking-widest uppercase">
          India’s biggest entertainment platform
        </p>

        <div className="mt-10 w-140 max-w-full">
          <Input
            placeholder="Search concerts, artists, locations..."
            className="h-14 text-base bg-white shadow-md rounded-xl"
          />
        </div>
      </div>

      <div className="w-full max-w-7xl px-6 mt-24 pb-28">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-semibold">Recommended Concerts</h2>

          <button
            onClick={() => router.push("/concerts")}
            className="text-red-500 text-sm font-medium hover:underline"
          >
            See All →
          </button>
        </div>

        {loading && <div className="text-gray-500">Loading concerts...</div>}

        {error && <div className="text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="relative">
            <button
              onClick={slideLeft}
              className="absolute -left-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition"
            >
              ◀
            </button>

            <button
              onClick={slideRight}
              className="absolute -right-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition"
            >
              ▶
            </button>

            <div
              ref={sliderRef}
              className="flex gap-8 overflow-x-hidden scroll-smooth"
            >
              {concerts.slice(0, 10).map((concert, index) => {
                const date = new Date(concert.date);
                const dayName = date.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const day = date.getDate();
                const month = date.toLocaleDateString("en-US", {
                  month: "short",
                });

                return (
                  <div
                    key={concert.id}
                    className="min-w-[320px] bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition cursor-pointer"
                  >
                    <div className="relative h-80">
                      <div className="absolute bottom-3 left-3 z-10 bg-black/80 text-white rounded-md px-3 py-1 text-xs font-semibold backdrop-blur">
                        {dayName}, {day} {month}
                      </div>

                      <Image
                        src={concert.poster}
                        alt={concert.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 320px"
                        loading={index === 0 ? "eager" : "lazy"}
                        className="object-cover"
                      />
                    </div>

                    <div className="p-4 space-y-1">
                      <p className="font-semibold text-base leading-tight line-clamp-2">
                        {concert.name}
                      </p>

                      <p className="text-sm text-gray-700 font-medium line-clamp-1">
                        {concert.artist.name}
                      </p>

                      <p className="text-sm text-gray-500 line-clamp-1">
                        {concert.location}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
