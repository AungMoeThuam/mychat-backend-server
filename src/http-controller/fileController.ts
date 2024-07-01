import { Request, Response } from "express";
import fs, { rmSync } from "fs";
import fsPromise from "fs/promises";
import storagePath from "../storagePath";
import multer, { MulterError } from "multer";
import { ErrorResponse, SuccessResponse } from "../helper/helper";
import usermodel from "../model/userModel";
import profilePhotoModel from "../model/profilePhotoModel";
import Ffmpeg from "fluent-ffmpeg";
import { Worker } from "worker_threads";
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
                createdAt: new Date(),
              },
            },
          },
          {
            new: true,
          }
        );
        if (oldResult.profilePhoto)
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
    // const fileName = req.headers["x-filename"];
    // const isVideoFormatMp4 = fileName.toString().split(".")[1] === "mp4";

    const wr = fs.createWriteStream(
      `${storagePath}/storage/temp/${req.headers["x-filename"]}`
      // `${storagePath}/storage/chats/${req.headers["x-filename"]}`
    );
    req.pipe(wr).on("finish", () => {
      let worker = new Worker(
        storagePath + "/worker-threads/fileCompressingWorker.ts",
        {
          workerData: {
            fileName: req.headers["x-filename"],
          },
        }
      );

      worker.on("message", (value) => {
        console.log(value);
        if (value === true) return res.status(200).json({ status: "success" });
        console.log("false is the best");
        fs.unlink(
          `${storagePath}/storage/temp/${req.headers["x-filename"]}`,
          () => res.status(404).json({ error: "error in file upload!" })
        );
      });
      worker.on("error", (err) => {
        console.log("err in worker", err);
        return fs.unlink(
          `${storagePath}/storage/temp/${req.headers["x-filename"]}`,
          () => res.status(404).json({ error: "error in file upload!" })
        );
      });
    });

    // req.pipe(wr).on("finish", () => {
    //   Ffmpeg(`${storagePath}/storage/temp/${req.headers["x-filename"]}`)
    //     .outputOptions([
    //       "-codec:v libx264",
    //       "-crf 28", // Adjust the CRF value as needed (lower is better quality, higher is more compressed)
    //       "-preset fast", // Optional: Adjust the preset for speed vs. compression ratio
    //     ])
    //     .on("end", () => {
    //       console.log("Compression finished");
    //       return res.status(200).json({ status: "success" });
    //       // Here you can handle the completion of compression
    //     })
    //     .on("error", (err, stdout, stderr) => {
    //       console.error("Error:", err.message);
    //       console.error("ffmpeg stdout:", stdout);
    //       console.error("ffmpeg stderr:", stderr);
    //       // Handle error while compressing
    //     })
    //     .save(`${storagePath}/storage/chats/${req.headers["x-filename"]}`);
    // });
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
        // "Content-Type": "video/mp4",
        "Content-Type": "video/quicktime",
      };
      res.writeHead(206, headers);
      const videoStream = fs.createReadStream(videoPath, { start, end });
      videoStream.pipe(res);
    } catch (error) {}
  },
};

export default fileController;
