"use client"; 
import React, { useEffect, useState} from 'react'
import { Concert } from '../page'
import { useRouter } from "next/navigation";
import axios from 'axios';
const Concerts = () => {
    const [concerts , setConcerts] = useState<Concert[]|null>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(()=>{
      const filterConcerts = async()=>{
        try {
          setLoading(true);
          setError("");
          const response = await axios.get("http://localhost:3006/api/v2/concerts/filter" , {withCredentials : true});
          if(response.data.success && response.status === 200){
            setConcerts(response.data.concerts);
          } else {
            setError(response.data.message || "Failed to load the concerts");
          }
        } catch (error) {
          console.log(error);
          setError("Failed to read the concerts");
        } finally {
          setLoading(false);
        }
      }
      filterConcerts();
    } , []);

  return (
    <div>
        {concerts?.map(( concert , key )=> (
         <div key={key}>
          <p>{concert.name}</p>
         </div>
        ))}
    </div>
  )
}

export default Concerts