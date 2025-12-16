import { kafka } from "./client.js";

interface ticketDetails {
  reservationId: string;
  userId: string;
  concertId: string;
  qty: number;
}
export const producer = kafka.producer();
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

export { reservationCreated };
