import { kafka } from "./client.js";

interface ticketDetails {
  reservationId: string;
  userId: string;
  concertId: string;
  qty: number;
  expiresAt : string,
}
interface paymentDetails {
  reservationId: string;
  userId : string,
  idempotencyKey : string,
  concertId : string,
  qty : number,
  ticketAmount : number,
}
export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId : "1"});

// export const initConsumer = async()=>{
//   await consumer.connect();
//   console.log("consumer connected");
// }
export const initProducer = async () => {
  await producer.connect();
  console.log("Kafka producer connected");
};

const reservationCreated = async ({
  reservationId,
  userId,
  concertId,
  qty,
  expiresAt,
}: ticketDetails) => {
  await producer.send({
    topic: "reservation.created",
    messages: [
      {
        key: concertId,
        value: JSON.stringify({ reservationId, userId, concertId, qty , expiresAt}),
      },
    ],
  });
};

const paymentSucceeded = async({ reservationId , userId , concertId , qty , ticketAmount , idempotencyKey} : paymentDetails)=>{
  await producer.send({
    topic : "payment.succeeded",
    messages : [
      {
        key : reservationId,
        value : JSON.stringify({reservationId , userId , concertId , qty , ticketAmount , idempotencyKey})
      }
    ]
  })
}

export { reservationCreated , paymentSucceeded };
