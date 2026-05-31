import type { Request, Response } from "express";
import type { AuthService } from "../../services/auth.service.js";
import type { UserRepository } from "../../repositories/user.repository.js";
import { toPublicUser } from "../../utils/user-public.js";
import { sendOk, sendFail } from "../../utils/response.js";

export class AuthController {
  constructor(
    authService: AuthService,
    userRepository: UserRepository,
  ) {
    this.authService = authService;
    this.userRepository = userRepository;
  }

  private readonly authService: AuthService;
  private readonly userRepository: UserRepository;

  register = async (req: Request, res: Response): Promise<void> => {
    const { email, name, password } = req.body as {
      email?: string;
      name?: string;
      password?: string;
    };
    if (!email || !name || !password) {
      sendFail(res, 400, "Thiếu email, name hoặc password");
      return;
    }
    if (password.length < 6) {
      sendFail(res, 400, "Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    try {
      const { user, emailVerificationRequired } =
        await this.authService.register(email, name, password, "user");
      sendOk(
        res,
        {
          user,
          emailVerificationRequired,
          message:
            "Đăng ký thành công. Kiểm tra email: nhập mã 6 số hoặc mở liên kết xác thực trước khi đăng nhập.",
        },
        201,
      );
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409) {
        sendFail(res, 409, err.message);
        return;
      }
      throw e;
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      sendFail(res, 400, "Thiếu email hoặc password");
      return;
    }
    try {
      const { user, accessToken, refreshToken } = await this.authService.login(
        email,
        password,
      );
      sendOk(res, { user, accessToken, refreshToken });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        sendFail(res, 401, err.message);
        return;
      }
      if (err.status === 403) {
        sendFail(res, 403, err.message);
        return;
      }
      throw e;
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      sendFail(res, 400, "Thiáº¿u refresh token");
      return;
    }
    try {
      const result = await this.authService.refresh(refreshToken);
      sendOk(res, result);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        sendFail(res, err.status, err.message);
        return;
      }
      throw e;
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as { refreshToken?: string };
    await this.authService.logout(refreshToken);
    sendOk(res, { message: "ÄÃ£ Ä‘Äƒng xuáº¥t" });
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const token =
      typeof req.query.token === "string" ? req.query.token : undefined;
    if (!token) {
      sendFail(res, 400, "Thiếu token");
      return;
    }
    try {
      await this.authService.verifyEmail(token);
      sendOk(res, {
        message: "Email đã được xác thực. Bạn có thể đăng nhập.",
        verified: true,
      });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 400) {
        sendFail(res, 400, err.message);
        return;
      }
      throw e;
    }
  };

  verifyEmailCode = async (req: Request, res: Response): Promise<void> => {
    const { email, code } = req.body as { email?: string; code?: string };
    if (!email || code === undefined || code === "") {
      sendFail(res, 400, "Thiếu email hoặc mã");
      return;
    }
    try {
      await this.authService.verifyEmailWithCode(email, String(code));
      sendOk(res, {
        message: "Email đã được xác thực. Bạn có thể đăng nhập.",
        verified: true,
      });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 400) {
        sendFail(res, 400, err.message);
        return;
      }
      throw e;
    }
  };

  resendVerification = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email?: string };
    if (!email) {
      sendFail(res, 400, "Thiếu email");
      return;
    }
    await this.authService.resendVerificationEmail(email);
    sendOk(res, {
      message:
        "Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi mã và liên kết mới.",
    });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) {
      sendFail(res, 401, "Chưa đăng nhập");
      return;
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      sendFail(res, 404, "Không tìm thấy user");
      return;
    }
    sendOk(res, { user: toPublicUser(user) });
  };
}
