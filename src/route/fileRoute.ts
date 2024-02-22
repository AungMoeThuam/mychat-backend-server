import { Router } from "express";
import fileController from "../controller/fileController";
import multer from "multer";
import storagePath from "../storagePath";
const fileRoute = Router();

// const callback = m.single("uploadPhoto");
fileRoute.post("/fileupload", fileController.uploadFile);
fileRoute.get("/videoplay/:videoname", fileController.serveFile);
fileRoute.post(
  "/profileupload",

  fileController.uploadProfilePhoto
);

export default fileRoute;
