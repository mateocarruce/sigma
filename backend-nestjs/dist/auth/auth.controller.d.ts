import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        usuario: {
            id: number;
            email: string;
            nombreCompleto: string;
            rol: import("../database/entities/rol.entity").NombreRol;
        };
    }>;
    me(user: JwtPayload): Promise<JwtPayload>;
}
