export function assertEnv(key, description) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${description} (${key}) is required but not set`);
  }
  return value;
}
