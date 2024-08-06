import fs from "fs/promises";
import { ErrorServiceResult } from "../utils/serviceResult";
import { fileStoragePath } from "../utils/fileStoragePath";
export const fileService = {
  deleteMessageMediaFile: async function (mediaFileNameToBeDeleted: string) {
    try {
      await fs.rm(fileStoragePath + "/chats/" + mediaFileNameToBeDeleted);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
};
