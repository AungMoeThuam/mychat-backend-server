import { Router } from "express";
import friendshipController from "../http-controller/friendshipController";

const friendRoute = Router();

friendRoute.post("/friends", friendshipController.getFriendsList);
friendRoute.get("/friends/pendings/:id", friendshipController.getPendingList);
friendRoute.get(
  "/friends/requests/:id",
  friendshipController.getRequestFriendList
);
friendRoute.post(
  "/friends/check/friend",
  friendshipController.checkFriendOrNot
);
friendRoute.post("/friends/request", friendshipController.request);
friendRoute.post("/friends/accept", friendshipController.accept);
friendRoute.post("/friends/reject", friendshipController.reject);
friendRoute.post("/friends/unfriend", friendshipController.unfriend);

export default friendRoute;
