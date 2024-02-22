import { NextFunction, Response } from "express";
import { CustomRequest } from "../utils/types";
import { ErrorResponse } from "../helper/helper";
import jwt from "jsonwebtoken";

function authMiddleware(req: CustomRequest, res: Response, next: NextFunction) {
  if (!req.headers.authorization)
    return res.status(401).json(ErrorResponse(101, "Missing Auth token !"));

  let accessToken = req.headers.authorization.split(" ")[1];
  if (!accessToken)
    return res.status(401).json(ErrorResponse(101, "Missing Auth token !"));

  try {
    console.log("acc", accessToken);
    let decodedToken = jwt.verify(accessToken, process.env.SECRETKEY);
    req.encodedToken = decodedToken as {
      _id: string;
      name: string;
      iat: number;
    };
  } catch (error) {
    return res.status(500).json(ErrorResponse(101, error.message));
  }
  next();
}
export { authMiddleware };
