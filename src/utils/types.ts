import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

interface CustomRequest extends Request {
  encodedToken?: {
    _id: string;
    name: string;
    iat: number;
  };
}

export type { CustomRequest };
