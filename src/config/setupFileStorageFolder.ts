import fs from "fs";
import path from "path";

export default function setupStorageFolder() {
  let isStorageFolderExist = fs.existsSync(
    path.join(__dirname, "../../", "storage")
  );

  if (!isStorageFolderExist) {
    fs.mkdirSync(path.join(__dirname, "../../", "storage"));
    fs.mkdirSync(path.join(__dirname, "../../", "storage/chats"));
    fs.mkdirSync(path.join(__dirname, "../../", "storage/profiles"));
    fs.mkdirSync(path.join(__dirname, "../../", "storage/temp"));
  }
}
