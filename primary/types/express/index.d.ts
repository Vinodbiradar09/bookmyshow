import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User; // attaches Prisma's User type to req
    }
  }
}
