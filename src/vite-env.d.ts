interface ImportMetaEnv {
  readonly VITE_NATAN_API_URL?: string;
  readonly VITE_NINJA_BOOKING_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
