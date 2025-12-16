export interface User {
    email : string,
    password : string,
    name? : string,
    phone : string,
}
export interface UserLog {
    email : string,
    password : string,
}
export interface Artist {
    name : string,
    bio : string,
    image : string,
    email : string
}

export interface Concert {
    name : string,
    description : string,
    location : string,
    date : Date,
    startTime : Date,
    endTime : Date,
    totalTickets : number,
    availableTickets : number,
    ticketPrice : number,
    poster : string,
}
