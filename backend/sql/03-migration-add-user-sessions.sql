-- =====================================================================
-- MIGRACIÓN: tabla user_sessions (refresh tokens)
-- =====================================================================
-- Motivo: el módulo de autenticación JWT necesita persistir los refresh
-- tokens para poder invalidarlos en /auth/logout y para poder rotarlos
-- en /auth/refresh. No existía en el script SQL original de SIGMA.
--
-- Guardamos un HASH del refresh token (nunca el token en texto plano),
-- igual que se hace con password_hash en users, por si la base de datos
-- llegara a filtrarse.

CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
