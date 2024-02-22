import { Request, Response } from "express";

import fs from "fs";
import storagePath from "../storagePath";
import multer, { MulterError } from "multer";
import ProfilePhotoModel from "../model/profilePhotoModel";
import { ErrorResponse, SuccessResponse } from "../helper/helper";
import { usermodel } from "../model/model";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storagePath + "/storage/profiles");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    console.log(file);
    cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
  },
});

let m = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "image/jpeg") {
      cb(
        new Error(
          "file type not allowed! File format should be JPG, PNG, GIF or WebP files."
        )
      );
    } else cb(null, true);
  },
});
let upload = m.single("uploadPhoto");

const fileController = {
  uploadProfilePhoto: async function (req: Request, res: Response) {
    upload(req, res, async function (err) {
      if (err instanceof MulterError)
        return res.status(500).json(ErrorResponse(101, "Multer error!"));
      if (err) return res.status(500).json(ErrorResponse(101, err.message));

      try {
        let file = req.file;

        const result = await usermodel.findOneAndUpdate(
          {
            _id: req.body.userId,
          },
          {
            $set: {
              profilePhoto: {
                path: file.filename,
                mimetype: file.mimetype,
                size: file.size,
                createdAt: Date.now(),
              },
            },
          },
          {
            new: true,
          }
        );
        console.log(result);
        // console.log("save the file", req.file);
        return res
          .status(201)
          .json(SuccessResponse(result, "successfully uploaded!"));
      } catch (error) {
        return res
          .status(500)
          .json(ErrorResponse(1001, "Server error! please try again!"));
      }
    });
  },
  uploadFile: async function (req: Request, res: Response) {
    console.log(storagePath);

    const wr = fs.createWriteStream(
      storagePath + "/storage/chats/" + req.headers["x-filename"]
    );
    req.pipe(wr).on("finish", () => {
      res.status(200).json({ status: "success" });
    });
  },

  serveFile: async function (req: Request, res: Response) {
    try {
      const { videoname } = req.params;
      console.log(videoname);
      const range = req.headers.range;
      if (!range) {
        res.status(400).send("Requires Range header");
      }
      const videoPath = "./src/storage/chats/" + videoname;
      const videoSize = fs.statSync(videoPath).size;
      console.log(videoSize);
      const CHUNK_SIZE = 10 ** 6;
      const start = Number(range.replace(/\D/g, ""));
      const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
      const contentLength = end - start + 1;
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
      };
      res.writeHead(206, headers);
      const videoStream = fs.createReadStream(videoPath, { start, end });
      videoStream.pipe(res);
    } catch (error) {}
  },
};

export default fileController;
