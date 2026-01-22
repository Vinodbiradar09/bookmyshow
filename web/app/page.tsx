
"use client";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import axios from "axios";
import { useEffect, useState } from "react";

export interface Concerts {
  id : string,
  name : string,
  description : string,
  location : string,
  date : Date,
  poster : string,
  artist : {
    id : string,
    name : string,
  }
}
export default function Home() {
  const [recentConcert , setRecentConcert] = useState<Concerts[] | null>([]);
  const [loading , setLoading] = useState<boolean>(false);
  const [error , setError] = useState<string | null>("");

  useEffect(()=>{
    const recentConcerts = async()=>{
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("http://localhost:3006/api/v2/concerts/recents");
      if(response.data.success === true && response.status === 200){
        setRecentConcert(response.data.concerts);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.log("failed to read the recent concerts" , error);
      if(error instanceof TypeError){
        setError(error.message);
      }
      setError("failed to read the recommended concerts");
    } finally {
      setLoading(false);
    }
  }
  recentConcerts();
  } , []);

  return (
   <div>
    <div>
      <div>
        BookMyShow
      </div>
      <div>
        <Input placeholder="Search for concerts and shows" />
      </div>
    </div>
    <div>
      <div>Recommended concerts</div>
      <div>
        {recentConcert?.map((concert , key)=> (
          <div key={key}>
            <Image src={concert.poster} alt="concert poster" width={400} height={400}/>
            <span>{concert.name}</span>
          </div>
        ))}
      </div>
    </div>
   </div>
  );
}
