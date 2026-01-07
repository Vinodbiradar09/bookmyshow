import { prisma } from "../..//primary/dist/src/lib/prisma.js";
import { kafka } from "../../primary/dist/src/kafka/client.js";
import { expireReservation } from "./utils.js";

const reservationConsumer = kafka.consumer({ groupId : "secondary-service"});
const paymentConsumer = kafka.consumer({ groupId: "payment-group" });

const reservationCreatedConsumer = async ()=>{
    try {
        await reservationConsumer.subscribe({
            topics : ["reservation.created"],
            fromBeginning : true,
        })
       await reservationConsumer.run({
        eachMessage : async({ message })=>{
            if(!message.value) return;
            const playload = JSON.parse(message.value?.toString());
            const { reservationId , userId , concertId , qty , expiresAt} = playload;
            console.log("hey",reservationId , userId , concertId , qty , expiresAt);
            const delay = new Date(expiresAt).getTime() - Date.now();
            if(delay < 0){
                console.log("already expired");
                await expireReservation( reservationId , concertId , qty);
                return;
            }
            console.log("delay" , delay);
            setTimeout( async ()=>{
                console.log("the delay is of" , delay);
                await expireReservation( reservationId , concertId , qty);
            }, delay);
        }
       })
    } catch (error) {
        console.log("error in the consumer consuming the message reservationCreatedConsumer" , error);
    }
}
const paymentSucceededConsumer = async()=>{
    try {
        await paymentConsumer.subscribe({
            topics : ["payment.succeeded"],
            fromBeginning : true,
        })
        await paymentConsumer.run({
            eachMessage : async({ topic , partition , message })=>{
                console.log(" the message consumer of paymentSucceededConsumer" , message.value?.toString());
            }
        })
    } catch (error) {
        console.log("error in the consumer of payment succeeded" , error);
    }
}
export { reservationCreatedConsumer , paymentSucceededConsumer};
