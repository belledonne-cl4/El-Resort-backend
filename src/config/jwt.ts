export type JwtConfig = {
  secret: string;
};

export const getJwtConfigFromEnv = (): JwtConfig => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no está definido");
  return { secret };
};
