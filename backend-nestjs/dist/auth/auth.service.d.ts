import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../database/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usuariosRepo;
    private readonly jwtService;
    constructor(usuariosRepo: Repository<Usuario>, jwtService: JwtService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        usuario: {
            id: number;
            email: string;
            nombreCompleto: string;
            rol: import("../database/entities/rol.entity").NombreRol;
        };
    }>;
    hashPassword(plain: string): Promise<string>;
}
