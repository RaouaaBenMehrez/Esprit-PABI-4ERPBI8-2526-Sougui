-- Script de création des tables de la base de données PostgreSQL "sougui_db"

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    role       VARCHAR(20) DEFAULT 'admin',
    email      VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(100),
    telephone    VARCHAR(20),
    type         VARCHAR(10) DEFAULT 'B2C',
    total_spent  NUMERIC(12,2) DEFAULT 0,
    rfm_segment  VARCHAR(30),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(50),
    price       NUMERIC(10,2),
    promo_price NUMERIC(10,2),
    stock       INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    image_url   TEXT
);

CREATE TABLE IF NOT EXISTS sales (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
    date        DATE NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    profit      NUMERIC(12,2),
    channel     VARCHAR(20),
    quantity    INTEGER DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_sessions (
    id          SERIAL PRIMARY KEY,
    session_id  VARCHAR(100) UNIQUE NOT NULL,
    client_info JSONB DEFAULT '{}',
    history     JSONB DEFAULT '[]',
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
    id           SERIAL PRIMARY KEY,
    user_id      VARCHAR(100) NOT NULL,
    product_code VARCHAR(50)  NOT NULL,
    product_name VARCHAR(100),
    added_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_code)
);

CREATE TABLE IF NOT EXISTS predictions (
    id              SERIAL PRIMARY KEY,
    model_name      VARCHAR(50),
    prediction_date DATE NOT NULL,
    value           NUMERIC(15,2),
    confidence      NUMERIC(5,2),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
