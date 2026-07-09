"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashIdentificador = hashIdentificador;
const crypto_1 = require("crypto");
function hashIdentificador(cedula, salt) {
    const valor = `${salt}:${String(cedula).trim()}`;
    return (0, crypto_1.createHash)('sha256').update(valor, 'utf-8').digest('hex');
}
//# sourceMappingURL=hash.util.js.map