import axios from "axios";
import React, { use, useState } from "react";

interface BookingInt {
  concert: {
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
  };
}

const Booking = ( { params} : {params : Promise<{concertId : string}>}) => {
  const [details, setDetails] = useState<BookingInt>();
  const [loading, setLoading] = useState<boolean>();
  const [error, setError] = useState<string>();
    const {concertId} = use(params);
  const det = async()=>{
    try {
        setLoading(true);
        setError("");
        const response = await axios.get(`http://localhost:3006/api/v2/ticket/available/${concertId}`);
        
    } catch (error) {
        
    }
  }
  return <div>

  </div>;
};

export default Booking;
