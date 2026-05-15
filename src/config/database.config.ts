// src/config/database.config.ts
export default () => ({
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://admin:admin@localhost:5432/admin?schema=public',
  },
});
