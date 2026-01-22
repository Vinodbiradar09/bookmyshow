"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useState } from 'react'

const SignUp = () => {
    const router = useRouter();
    const [email , setEmail] = useState<string>("");
    const [password , setPassword] = useState<string>("");
    const [name , setName] = useState<string>("");
    const [phone , setPhone] = useState<string>("");
    const [loading , setLoading] = useState<boolean>(false);
    const [error , setError] = useState<string | null>("");

    const signUp = async()=>{
        try {
            setLoading(true);
            setError(null);
            const res = await axios.post("http://localhost:3006/api/v2/user/signup" , {email , password , name , phone } , { withCredentials : true});
            if(res.data.success === true && res.status === 200){
                setEmail("");
                setPassword("");
                setName("");
                setPhone("");
                router.push("/login");
            } else {
                router.push("/");
                setError(res.data.message);
            }

        } catch (error) {
            console.log("error in creating the new user" , error);
            if(error instanceof TypeError){
                setError(error.message);
            }
            setError("Account creation failed");
        } finally {
            setLoading(false);
        }
    }
  return (
    <div>
       <Input placeholder='Name' type='text' value={name} onChange={(e)=> setName(e.target.value)}/>
       <Input placeholder='Email' type="email" value={email} onChange={(e)=> setEmail(e.target.value)} />
       <Input placeholder='Password' type='password' value={password} onChange={(e)=> setPassword(e.target.value)}/>
       <Input placeholder='Phone' type='text' value={phone} onChange={(e)=> setPhone(e.target.value)} />
        {error && (
            <div>
                {error}
            </div>
        )}
       <Button onClick={signUp} disabled={loading}>
        { loading ? "Creating User..." : "Create User"}
       </Button>
    </div>
  )
}

export default SignUp