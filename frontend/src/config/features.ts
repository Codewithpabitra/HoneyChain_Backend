export const FEATURES = {
  register: process.env.NEXT_PUBLIC_ENABLE_REGISTER === "true",
} as const;