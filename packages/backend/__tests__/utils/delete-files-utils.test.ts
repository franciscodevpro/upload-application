import path from "node:path";
import fs from "node:fs";
import { deleteFileFromPath } from "../../src/utils/delete-files-utils";

jest.mock("node:path");
jest.mock("node:fs");

const mockedPath = path as jest.Mocked<typeof path>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Delete Files Utilitary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("deleteFileFromPath", () => {
    it("deve chamar o método unlinkSync caso arquivo exista", async () => {
      mockedPath.resolve.mockReturnValue("any_filePath");
      mockedFs.existsSync.mockReturnValue(true);

      deleteFileFromPath("any_file");

      expect(mockedPath.resolve).toHaveBeenCalledWith("any_file");
      expect(mockedFs.existsSync).toHaveBeenCalledWith("any_filePath");
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith("any_filePath");
    });

    it("não deve chamar o método unlinkSync caso arquivo não exista", async () => {
      mockedPath.resolve.mockReturnValue("any_filePath");
      mockedFs.existsSync.mockReturnValue(false);

      deleteFileFromPath("any_file");

      expect(mockedPath.resolve).toHaveBeenCalledWith("any_file");
      expect(mockedFs.existsSync).toHaveBeenCalledWith("any_filePath");
      expect(mockedFs.unlinkSync).toHaveBeenCalledTimes(0);
    });
  });
});
