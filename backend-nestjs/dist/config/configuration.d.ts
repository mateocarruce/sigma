declare const _default: () => {
    port: number;
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    iaServiceUrl: string;
    hashSalt: string;
};
export default _default;
