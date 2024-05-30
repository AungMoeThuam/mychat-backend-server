import { Request, Response } from "express";
import fs from "fs";
import fsPromise from "fs/promises";
import storagePath from "../storagePath";
import multer, { MulterError } from "multer";
import { ErrorResponse, SuccessResponse } from "../helper/helper";
import usermodel from "../model/userModel";

const imageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storagePath + "/storage/profiles");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
  },
});

let m = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!imageTypes.includes(file.mimetype)) {
      cb(
        new Error(
          "file type not allowed! File format should be JPG, JPEG, PNG, SVG, GIF or WebP files."
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
        return res.status(500).json(ErrorResponse("Multer error!"));

      if (err) return res.status(500).json(ErrorResponse(err.message));

      try {
        let file = req.file;

        const oldResult = await usermodel.findOne({
          _id: req.body.userId,
        });

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

        await fsPromise.rm(
          storagePath + "/storage/profiles/" + oldResult.profilePhoto.path
        );

        return res.status(200).json(result);
      } catch (error) {
        return res.status(500).json(ErrorResponse(error.message));
      }
    });
  },
  uploadFile: async function (req: Request, res: Response) {
    const wr = fs.createWriteStream(
      storagePath + "/storage/chats/" + req.headers["x-filename"]
    );
    req.pipe(wr).on("finish", () => {
      return res.status(200).json({ status: "success" });
    });
  },

  serveFile: async function (req: Request, res: Response) {
    try {
      const { videoname } = req.params;

      const range = req.headers.range;
      if (!range) {
        res.status(400).send("Requires Range header");
      }
      const videoPath = "./src/storage/chats/" + videoname;
      const videoSize = fs.statSync(videoPath).size;
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
