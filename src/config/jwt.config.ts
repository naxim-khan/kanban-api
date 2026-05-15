export default () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production',
    );
  }

  return {
    jwt: {
      secret: secret || 'dev_secret_only_for_local_use',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
  };
};
