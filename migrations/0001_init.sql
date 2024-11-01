-- Migration number: 0001 	 2024-09-17T07:05:30.754Z

-- Table users
CREATE TABLE IF NOT EXISTS "users" (
  "id" character varying(36) PRIMARY KEY,
  "role" character varying(36) NOT NULL,
  "email" character varying(255) NOT NULL,
  "password" character varying(255) NULL,
  "name" character varying(255) NOT NULL,
  "status" smallint DEFAULT 1 NOT NULL,
  "registeredAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "picture" text NULL,
  "registeredVia" character varying(255) NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_registered_at ON users(registeredAt);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" character varying(36) PRIMARY KEY,
  "userId" character varying(36) NULL,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
  "status" smallint DEFAULT 1 NOT NULL,
  "userAgent" character varying(255) NULL,
  "ip" character varying(128) NULL,
  "expiredAt" integer NULL,
  "authProvider" character varying(32) NULL,
  "authToken" text NULL,
  CONSTRAINT "fkey_users_sessions_user_id" FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(userId);

CREATE TABLE IF NOT EXISTS "s3_providers" (
  "id" character varying(36) PRIMARY KEY,
  "userId" character varying(36) NULL,
  "name" character varying(32),
  "website" text NULL,
  "bucket" text NULL,
  "objectBaseUrl" text NOT NULL,
  "accessKeyId" text NOT NULL,
  "accessSecretKey" text NOT NULL,
  "endpoint" text NOT NULL,
  "region" text NOT NULL,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "fkey_users_s3_providers_user_id" FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE NOT DEFERRABLE
);

CREATE INDEX IF NOT EXISTS idx_s3_providers_user_id ON s3_providers(userId);