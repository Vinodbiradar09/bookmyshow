import express from "express";
import "dotenv/config";
import { kafkaTopics } from "./kafka/admin.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { router } from "./routes/index.js";
import { initProducer } from "./kafka/producer.js";
const app = express();
app.use(cors({origin : "*" , credentials : true}));
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(cookieParser()); 
app.use("/api/v2" , router);
const startServer = async()=>{
    try {
        await kafkaTopics();
        await initProducer();
        console.log("Kafka initialized successfully!");
        app.listen(process.env.PORT , ()=>{
            console.log(`primary server is running at ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1); 
    }
}
startServer();

