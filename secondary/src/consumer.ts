import { prisma } from "../..//primary/dist/src/lib/prisma.js";
import { kafka } from "../../primary/dist/src/kafka/client.js";

const reservationConsumer = kafka.consumer({ groupId : "secondary-service"});
const paymentConsumer = kafka.consumer({ groupId: "payment-group" });

const reservationCreatedConsumer = async ()=>{
    try {
        console.log("hi");
        await reservationConsumer.subscribe({
            topics : ["reservation.created"],
            fromBeginning : true,
        })
       await reservationConsumer.run({
        eachMessage : async({ topic , partition, message, heartbeat, pause})=>{
            console.log("the message is consumed of reservationCreatedConsumer" , message.value?.toString());
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
