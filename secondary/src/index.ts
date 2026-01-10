import express from "express";
import dotenv from "dotenv";
dotenv.config();
import {
  reservationCreatedConsumer,
  paymentSucceededConsumer,
  ticketIssued,
} from "./consumer.js";
import { initProducer } from "../../primary/dist/src/kafka/producer.js";
import { Resend } from "resend";
export const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(4002, async () => {
  await initProducer();
  await reservationCreatedConsumer();
  await paymentSucceededConsumer();
  await ticketIssued();
  console.log("consumer server is running at the port 4002");
});
