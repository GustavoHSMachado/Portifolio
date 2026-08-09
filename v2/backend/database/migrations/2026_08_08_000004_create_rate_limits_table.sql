-- Rate limit persistente por bucket (IP + método + rota).
-- Na v1 o limite vivia na sessão e era contornável só trocando de sessão.

CREATE TABLE rate_limits (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    bucket_key   CHAR(64)        NOT NULL,
    attempts     INT UNSIGNED    NOT NULL DEFAULT 0,
    window_start DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rl_bucket (bucket_key),
    KEY idx_rl_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ROLLBACK: DROP TABLE rate_limits;
