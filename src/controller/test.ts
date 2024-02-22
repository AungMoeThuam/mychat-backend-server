const fs = require("fs");

const file = fs.statSync(
  "../storage/videos/1704474911299video_2024-01-02_02-59-15.mp4"
);

console.log(file);
