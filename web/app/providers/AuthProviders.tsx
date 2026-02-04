"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import { User } from "lucide-react";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshUser = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:3006/api/v2/user/me", {
        withCredentials: true,
      });
      setUser(res.data.user);
    } catch (error) {
      console.log("errorr", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  } , []);

  useEffect(()=>{
    let mounted = true;
    const load = async()=>{
        if(!mounted) return;
        await refreshUser();
    }
    load();
    return ()=>{
        mounted = false;
    }
  } , [refreshUser]);
  return (
    <AuthContext.Provider value={{ user , loading , refreshUser}}>
        {children}
    </AuthContext.Provider>
  )
};

export const useAuth = ()=>  useContext(AuthContext);
