import { Router } from "express";
import friendshipController from "../controller/friendshipController";
import { authMiddleware } from "../middleware/authMiddleware";

const friendRoute = Router();

friendRoute.post(
  "/friends",
  authMiddleware,
  friendshipController.getFriendsList
);
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
friendRoute.post("/friends/cancelrequest", friendshipController.cancelRequest);
friendRoute.post("/friends/unfriend", friendshipController.unfriend);

export default friendRoute;
