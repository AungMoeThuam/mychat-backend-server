import { Router } from "express";
import userController from "../controller/userController";
const userRoute = Router();

userRoute.get("/users", userController.getAllUser);
userRoute.post("/user/register", userController.registerUser);
userRoute.post("/user/login", userController.loginUser);
userRoute.post("/users/search", userController.searchPeople);
userRoute.get("/user/:id", userController.getUser);
export default userRoute;
