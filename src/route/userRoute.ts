import { Router } from "express";
import userController from "../http-controller/userController";
const userRoute = Router();

userRoute.post("/users/search", userController.searchPeople);
userRoute.get("/user/:id", userController.getUser);
export default userRoute;
