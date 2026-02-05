"use client";
import axios from "axios";
import React, { use, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
interface BookingInt {
  id: string;
  totalTickets: number;
  availableTickets: number;
  name: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  ticketPrice: number;
  artist: {
    name: string;
  };
}

const Booking = ({ params }: { params: Promise<{ concertId: string }> }) => {
  const [details, setDetails] = useState<BookingInt>();
  const [loading, setLoading] = useState<boolean>();
  const [error, setError] = useState<string>();
  const [qty, setQty] = useState(1);
  const { concertId } = use(params);
  
  useEffect(() => {
    const det = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get(
          `http://localhost:3006/api/v2/ticket/available/${concertId}`,
          { withCredentials: true },
        );
        if (response.data.success && response.status === 200) {
          setDetails(response.data.concert);
        } else {
          setError(response.data.message || "Failed to get the response");
        }
      } catch (error) {
        console.log(error);
        setError("Request failed");
      } finally {
        setLoading(false);
      }
    };
    det();
  }, [concertId]);
  const handleProceed = async () => {
    try {
      setLoading(true);
      setError("");
      const idempotencyKey = uuidv4();
      const res = await axios.post(
        `http://localhost:3006/api/v2/ticket/buy/${concertId}`,
        {
          qty,
          idempotencyKey,
        },
        { withCredentials: true },
      );
      if (res.data.success && res.status === 200) {
        console.log("reservation success", res.data);
      } else {
        setError(res.data.message || "reservation failed");
      }
    } catch (error) {
      console.log(error);
      setError("Reservation failed");
    } finally {
      setLoading(false);
    }
  };
  if (loading && !details) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!details) return null;

  const totalAmount = qty * details.ticketPrice;
  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{details.name}</h1>
        <p>{details.location}</p>
        <p>
          {details.date} | {details.startTime} - {details.endTime}
        </p>
      </div>

      <div className="border rounded-lg p-4 flex justify-between items-center">
        <div>
          <p className="font-medium">General Admission</p>
          <p className="text-sm text-gray-500">
            ₹{details.ticketPrice} per ticket
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={qty === 1}
            onClick={() => setQty(qty - 1)}
            className="px-3 py-1 border rounded"
          >
            -
          </button>

          <span>{qty}</span>

          <button
            disabled={qty === 10}
            onClick={() => setQty(qty + 1)}
            className="px-3 py-1 border rounded"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>₹{totalAmount}</span>
      </div>

      <button
        onClick={handleProceed}
        disabled={loading}
        className="w-full bg-red-500 text-white py-3 rounded-lg disabled:opacity-50"
      >
        Proceed
      </button>
    </div>
  );
};

export default Booking;