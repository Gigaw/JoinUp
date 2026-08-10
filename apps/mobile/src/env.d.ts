declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};

declare module '*.png' {
  const source: number;
  export default source;
}
