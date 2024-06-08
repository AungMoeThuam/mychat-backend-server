import { Router } from "express";
import friendshipController from "../http-controller/friendshipController";

const friendRoute = Router();

friendRoute.get("/friends/blocks/:id", friendshipController.getBlockFriendList);
friendRoute.get(
  "/friends/requests/:id",
  friendshipController.getRequestFriendList
);
friendRoute.get("/friends/pendings/:id", friendshipController.getPendingList);

friendRoute.post("/friends", friendshipController.getFriendsList);
friendRoute.post(
  "/friends/check/friend",
  friendshipController.checkFriendOrNot
);
friendRoute.post("/friends/request", friendshipController.request);
friendRoute.post("/friends/accept", friendshipController.accept);
friendRoute.post("/friends/reject", friendshipController.reject);
friendRoute.post("/friends/unfriend", friendshipController.unfriend);
friendRoute.post("/friends/block", friendshipController.block);
friendRoute.post("/friends/unblock", friendshipController.unblock);

export default friendRoute;
