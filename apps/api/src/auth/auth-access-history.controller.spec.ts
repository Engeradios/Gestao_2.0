import type { Request } from 'express';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { JwtPayload } from './guards/jwt-auth.guard';
import type { PasswordService } from './password.service';
const refreshSessionServiceMock = {
  issue: jest.fn(),
  rotate: jest.fn(),
  revoke: jest.fn(),
};
interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
describe('AuthController.accessHistory', () => {
  it('encaminha somente o identificador proveniente do JWT', async () => {
    const accessHistory = jest.fn().mockResolvedValue([]);
    const authService = {
      accessHistory,
    } as unknown as AuthService;
    const passwordService = {} as PasswordService;
    const authTokenService = {
      requestRecovery: jest.fn(),
      resetPassword: jest.fn(),
    };
    const controller = new AuthController(
      authService,
      refreshSessionServiceMock as never,
      authTokenService as never,
      passwordService,
    );
    const request = {
      user: {
        sub: 'usuario-jwt-456',
        nome: 'Usuário Teste',
        email: 'usuario@example.test',
        perfis: [],
        permissoes: [],
        trocarSenha: false,
      },
    } as unknown as AuthenticatedRequest;
    const result = await controller.accessHistory(request);
    expect(accessHistory).toHaveBeenCalledTimes(1);
    expect(accessHistory).toHaveBeenCalledWith('usuario-jwt-456');
    expect(result).toEqual([]);
  });
});
