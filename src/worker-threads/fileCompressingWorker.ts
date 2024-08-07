const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const Ffmpeg = require("fluent-ffmpeg");
const path = require("path");

let { fileName } = workerData;
let p = path.join(__dirname, "../../", "storage/temp/", fileName);
Ffmpeg(p)
  .outputOptions([
    "-codec:v libx264",
    "-crf 28", // Adjust the CRF value as needed (lower is better quality, higher is more compressed)
    "-preset fast", // Optional: Adjust the preset for speed vs. compression ratio
  ])
  .on("end", () => {
    console.log("Compression finished");
    parentPort.postMessage(true);
  })
  .on("error", (err, stdout, stderr) => {
    console.error("Error:", err.message);
    console.error("ffmpeg stdout:", stdout);
    console.error("ffmpeg stderr:", stderr);
    parentPort.postMessage(false);
    // Handle error while compressing
  })
  .save(path.join(__dirname, "../../", "storage/chats/", fileName));
