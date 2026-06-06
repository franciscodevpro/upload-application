import fs from "node:fs";
import path from "node:path";

export const deleteFileFromPath = async (filePath: string) => {
  const fullPath = path.resolve(filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
