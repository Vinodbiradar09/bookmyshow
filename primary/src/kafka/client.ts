import { Kafka } from "kafkajs";
const kafka = new Kafka({
    clientId : "bookmyshow",
    brokers : ["localhost:9092"],
});
export{kafka};
