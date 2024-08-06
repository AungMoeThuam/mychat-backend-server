import { Router } from "express";
import userController from "../controller/userController";
const userRoute = Router();

userRoute.post("/users/search", userController.searchPeople);
userRoute.put("/user/name/update", userController.updateUsername);
userRoute.put("/user/password/update", userController.updatePassword);
userRoute.put("/user/email/update", userController.updateEmail);
userRoute.get("/user/:id", userController.getUser);
export default userRoute;
