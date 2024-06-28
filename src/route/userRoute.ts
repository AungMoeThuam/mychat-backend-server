import { Router } from "express";
import userController from "../http-controller/userController";
const userRoute = Router();

userRoute.post("/users/search", userController.searchPeople);
userRoute.put("/user/name/update", userController.updateUsername);
userRoute.put("/user/password/update", userController.updatePassword);
userRoute.get("/user/:id", userController.getUser);
export default userRoute;
