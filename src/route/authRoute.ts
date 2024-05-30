import { Router } from "express";
import userController from "../http-controller/userController";
const authRoute = Router();

authRoute.post("/user/register", userController.registerUser);
authRoute.post("/user/login", userController.loginUser);

export default authRoute;
