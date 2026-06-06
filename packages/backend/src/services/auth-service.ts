import bcryptjs from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  directoryRepository as DirectoryRepository,
  fileRepository as FileRepository,
  userRepository as UserRepository,
} from "../repository/sqlite";
import { generateTokens, verifyRefreshToken } from "../auth";
import { deleteFileFromPath } from "../utils/delete-files-utils";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { NotFoundError } from "../errors/not-found-error";
import { BadRequestError } from "../errors/bad-request-error";
import { ConflictError } from "../errors/conflict-error";

export class AuthService {
  constructor(
    private readonly userRepository: typeof UserRepository,
    private readonly fileRepository: typeof FileRepository,
    private readonly directoryRepository: typeof DirectoryRepository,
  ) {}

  async signin(params: { email: string; password: string }) {
    const { email, password } = params;

    // Validação
    if (!email || !password) {
      throw new BadRequestError("Email e senha são obrigatórios");
    }

    if (password.length < 6) {
      throw new BadRequestError("Senha deve ter pelo menos 6 caracteres");
    }

    // Verificar se usuário já existe
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email já cadastrado");
    }

    // Hash da senha
    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = randomUUID();
    const now = new Date().toISOString();

    // Criar usuário
    await this.userRepository.create({
      id: userId,
      email,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    return {
      message: "Usuário registrado com sucesso",
      userId,
      email,
    };
  }

  async login(params: { email: string; password: string }) {
    const { email, password } = params;

    // Validação
    if (!email || !password) {
      throw new BadRequestError("Email e senha são obrigatórios");
    }

    // Buscar usuário
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    // Verificar senha
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    // Gerar tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user.id!,
      email: user.email!,
    });

    // Salvar refresh token no banco
    await this.userRepository.updateRefreshToken(user.id!, refreshToken);

    return {
      message: "Login realizado com sucesso",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async refresToken(params: { refreshToken: string }) {
    const { refreshToken } = params;

    if (!refreshToken) {
      throw new BadRequestError("Refresh token é obrigatório");
    }

    // Verificar refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new UnauthorizedError("Refresh token inválido ou expirado");
    }

    // Buscar usuário
    const user = await this.userRepository.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError("Refresh token não corresponde");
    }

    // Gerar novos tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens({
        userId: user.id!,
        email: user.email!,
      });

    // Salvar novo refresh token
    await this.userRepository.updateRefreshToken(user.id!, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(params: { userId: string }) {
    const userId = params.userId;

    // Limpar refresh token do banco
    await this.userRepository.updateRefreshToken(userId, null);

    return { message: "Logout realizado com sucesso" };
  }

  async getMe(params: { userId: string }) {
    const userId = params.userId;

    if (!userId) {
      throw new UnauthorizedError("Usuário não autenticado");
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("Usuário não encontrado");
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async deleteAccount(params: { userId: string }) {
    const userId = params.userId;

    if (!userId) {
      throw new UnauthorizedError("Usuário não autenticado");
    }

    const files =
      await this.fileRepository.listAllEvenNotActiveByUserId(userId);

    await this.fileRepository.deleteByUserId(userId);
    await this.directoryRepository.deleteByUserId(userId);

    // Deletar usuário do banco
    await this.userRepository.delete(userId);

    for (const file of files) {
      if (file.path) {
        await deleteFileFromPath(file.path);
      }
    }

    return { message: "Conta deletada com sucesso" };
  }
}
