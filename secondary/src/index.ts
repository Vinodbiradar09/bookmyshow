import express from "express";
import { reservationCreatedConsumer , paymentSucceededConsumer } from "./consumer.js";
import { initProducer } from "../../primary/dist/src/kafka/producer.js";
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended : true}));

app.listen(4002 , async()=>{
    await initProducer();
    await reservationCreatedConsumer();
    await paymentSucceededConsumer();
    console.log("consumer server is running at the port 4002");
})
