import { kafka } from "./client.js";

interface ticketDetails {
  reservationId: string;
  userId: string;
  concertId: string;
  qty: number;
}
interface paymentDetails {
  reservationId: string;
  userId : string,
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
}: ticketDetails) => {
  await producer.send({
    topic: "reservation.created",
    messages: [
      {
        key: concertId,
        value: JSON.stringify({ reservationId, userId, concertId, qty }),
      },
    ],
  });
};

const paymentSucceeded = async({ reservationId , userId , ticketAmount} : paymentDetails)=>{
  await producer.send({
    topic : "payment.succeeded",
    messages : [
      {
        key : reservationId,
        value : JSON.stringify({reservationId , userId , ticketAmount})
      }
    ]
  })
}

export { reservationCreated , paymentSucceeded };
