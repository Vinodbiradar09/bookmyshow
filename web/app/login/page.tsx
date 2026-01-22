"use client";
import { useRouter } from 'next/navigation';
import {useState} from 'react'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';

const Login = () => {
    const router = useRouter();
    const [email , setEmail] = useState<string>("");
    const [password , setPassword] = useState<string>("");
    const [loading , setLoading] = useState<boolean>(false);
    const [error , setError] = useState<string | null>("");

    const login = async()=>{
        try {
            setLoading(true);
            setError(null);
            const response = await axios.post("http://localhost:3006/api/v2/user" , { email , password} , {withCredentials : true});
            if(response.data.success === true && response.status === 200){
                if(response.data.user){
                    setEmail("");
                    setPassword("");
                    router.push("/");
                }
            }else{
                router.push("/login");
                setError(response.data.message);
            }
        } catch (error) {
            console.log("login failed" , error);
            if(error instanceof TypeError){
                setError(error.message);
            }
            setError("Login Failed");
        } finally {
            setLoading(false); 
        }
    }
  return (
    <div>
        <Input placeholder='Email' type="email" name='Email' value={email} onChange={(e)=> setEmail(e.target.value)}/>
        <Input placeholder="Password" type='password' name='Password' value={password} onChange={(e)=> setPassword(e.target.value)}/>
        {error && (
            <div>
                {error}
            </div>
        )}
        <Button onClick={login} disabled={loading}>
            {loading ? "Logining" : "Login"}
        </Button>
    </div>
  )
}

export default Login