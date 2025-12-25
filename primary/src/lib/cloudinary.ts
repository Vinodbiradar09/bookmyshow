import { v2 as cloudinary} from "cloudinary";
import "dotenv/config";
import fs from "fs";
import { buffer } from "stream/consumers";

cloudinary.config(
    {
        cloud_name : process.env.CLOUDINARY_CLOUD_NAME!,
        api_key : process.env.CLOUDINARY_API_KEY!,
        api_secret : process.env.CLOUDINARY_API_SECRET!,
    }
)

export const uploadOnCloudinaryBuffer = async (buffer : Buffer , mimetype : string)=>{
    // console.log("buffer" ,buffer);
    // console.log("mime" , mimetype);
    try {
        if(!buffer) return null; 
        const base64String = buffer.toString("base64");
        const dataURI = `data:${mimetype};base64,${base64String}`;
        const response = await cloudinary.uploader.upload(dataURI , {resource_type : "auto"});
        return response;
    } catch (error) {
        if(error instanceof Error){
            console.log("error is" , error.message);
        }
        console.error("Cloudinary upload error:", error);
        return null;
    }
}
