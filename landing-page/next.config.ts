import type { NextConfig } from "next";

// @ts-ignore
if (typeof global !== 'undefined' && global.localStorage && !global.localStorage.getItem) {
  // @ts-ignore
  delete global.localStorage;
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
