import { NextFunction, Response } from "express";
import { CustomRequest } from "../utils/types";
import { ErrorResponse } from "../helper/helper";
import jwt from "jsonwebtoken";

function authMiddleware(req: CustomRequest, res: Response, next: NextFunction) {
  // console.log(req.url);
  if (
    req.url.includes("/api/videoplay") ||
    req.url.includes("/api/resources/chats/")
  )
    return next();

  if (!req.headers.authorization)
    return res.status(401).json(ErrorResponse("Missing Authorization header!"));

  let accessToken = req.headers.authorization.split(" ")[1];
  if (!accessToken)
    return res.status(401).json(ErrorResponse("Missing Auth token!"));

  try {
    let decodedToken = jwt.verify(accessToken, process.env.SECRETKEY);
    // console.log("decoded ", decodedToken);
    req.encodedToken = decodedToken as {
      _id: string;
      name: string;
      iat: number; // the issued timestamp of the jwt token
    };
  } catch (error) {
    return res.status(500).json(ErrorResponse(error.message));
  }
  next();
}
export { authMiddleware };
