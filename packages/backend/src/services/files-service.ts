import { NotFoundError } from "../errors/not-found-error";
import { fileRepository as FileRepository } from "../repository/sqlite";
import { deleteFileFromPath } from "../utils/delete-files-utils";

export class FilesService {
  constructor(private readonly fileRepository: typeof FileRepository) {}

  async findAll(params: { parent?: string; userId?: string }) {
    const parent = params.parent || null; // Garantir que seja null se não fornecido
    const result = await this.fileRepository.list({
      parent,
      userId: params.userId || null,
    });
    return result.map((file) => ({
      ...file,
      name: file.originalName,
      date: file.uploadAt,
    }));
  }

  async update(params: {
    id: string;
    parent?: string;
    originalName?: string;
    userId?: string;
    privacy?: string;
  }): Promise<any> {
    const { id } = params;
    const { parent, originalName } = params;

    const filedata = await this.fileRepository.findById(id);
    if (!filedata) {
      throw new NotFoundError("File not found");
    }

    const updates: any = {};
    if (parent !== undefined) updates.parent = parent;
    if (originalName !== undefined) {
      // Preserve the extension
      const extension = filedata.extension;
      updates.originalName = extension
        ? `${originalName}.${extension}`
        : originalName;
    }
    if (params.privacy !== undefined) updates.privacy = params.privacy;

    await this.fileRepository.update(id, params.userId || null, updates);
    const updatedFile = await this.fileRepository.findById(id);
    return updatedFile;
  }

  async delete(params: { id: string; userId?: string }) {
    const { id } = params;

    const filedata = await this.fileRepository.findById(
      id,
      params.userId || null,
    );
    if (!filedata) {
      throw new NotFoundError("File not found");
    }

    await this.fileRepository.delete(id, params.userId || null);

    if (filedata.path) {
      await deleteFileFromPath(filedata.path);
    }

    return { message: "File deleted successfully", id };
  }
}
