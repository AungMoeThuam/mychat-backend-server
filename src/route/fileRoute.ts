import { Router } from "express";
import fileController from "../http-controller/fileController";
const fileRoute = Router();

fileRoute.post("/fileupload", fileController.uploadFile);
fileRoute.get("/videoplay/:videoname", fileController.serveFile);
fileRoute.post("/profileupload", fileController.uploadProfilePhoto);

export default fileRoute;
