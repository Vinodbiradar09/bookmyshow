"use client";

import { useEffect, useState, use } from "react";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export interface Con {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  totalTickets: number;
  availableTickets: number;
  ticketPrice: number;
  poster: string;
  artist: {
    id: string;
    name: string;
    bio: string;
    image: string;
  };
  createdAt: string;
  updatedAt: string;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const Concert = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const router = useRouter();
  const [availableTickets, setAvailableTickets] = useState<number>();
  const [concert, setConcert] = useState<Con | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchConcert = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `http://localhost:3006/api/v2/concert/${id}`,
          { withCredentials: true },
        );

        if (res.data.success) {
          setConcert(res.data.concert);
        } else {
          setError("Failed to load concert");
        }
      } catch (err) {
        console.log(err);
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    const availableTickets = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3006/api/v2/ticket/available/${id}`,
          {
            withCredentials: true,
          },
        );
        if (response.data.success && response.status === 200) {
          setAvailableTickets(response.data.concert.availableTickets);
        } else {
          setError(response.data.message);
        }
      } catch (error) {
        console.log(error);
      }
    };

    const t = async () => {
      await Promise.all([fetchConcert(), availableTickets()]);
    };
    t();
  }, [id]);

  if (loading) return <p className="p-10">Loading...</p>;
  if (error) return <p className="p-10 text-red-500">{error}</p>;
  if (!concert) return null;

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <div className="bg-white px-12 py-6">
        <h1 className="text-2xl font-bold">{concert.name}</h1>
      </div>

      <div className="flex gap-8 px-12 py-6">
        <div className="flex-1 space-y-6">
          <div className="relative h-105 rounded-lg overflow-hidden bg-black">
            <Image
              src={concert.poster}
              alt={concert.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 70vw"
              priority
            />
          </div>

          <div className="flex gap-2">
            <span className="bg-gray-200 px-3 py-1 rounded text-xs">
              Concerts
            </span>
            <span className="bg-gray-200 px-3 py-1 rounded text-xs">
              Music Shows
            </span>
          </div>

          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-2">About the Event</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {concert.description}
            </p>
          </div>

          <div className="flex gap-4 items-start">
            <div className="relative w-20 h-20 shrink-0">
              <Image
                src={concert.artist.image}
                alt={concert.artist.name}
                fill
                sizes="80px"
                className="rounded-full object-cover"
                priority
              />
            </div>

            <div>
              <p className="font-medium">{concert.artist.name}</p>
              <p className="text-sm text-gray-600">{concert.artist.bio}</p>
            </div>
          </div>
        </div>

        <div className="w-[360px]">
          <div className="bg-white rounded-lg p-6 space-y-4 sticky top-6">
            <div className="space-y-2 text-sm">
              <p>📅 {formatDate(concert.date)}</p>
              <p>
                ⏰ {formatTime(concert.startTime)} –{" "}
                {formatTime(concert.endTime)}
              </p>
              <p>📍 {concert.location}</p>
              <p>👥 All age groups</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-lg font-semibold">
                ₹{concert.ticketPrice} onwards
              </p>
              <p className="text-xs text-orange-600">Filling fast</p>
            </div>
            <p>Tickets Available:{availableTickets}</p>
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => router.push(`/booking/${concert.id}`)}
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Concert;
