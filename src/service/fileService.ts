import fs from "fs/promises";
import storagePath from "../storagePath";
import { ErrorServiceResult } from "../utils/serviceResult";
export const fileService = {
  deleteMessageMediaFile: async function (mediaFileNameToBeDeleted: string) {
    try {
      await fs.rm(storagePath + "/storage/chats/" + mediaFileNameToBeDeleted);
    } catch (error) {
      return ErrorServiceResult(error);
    }
  },
};
