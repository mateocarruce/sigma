export interface JwtPayload {
  sub: number; // id del usuario
  email: string;
  rol: string;
}
