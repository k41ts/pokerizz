import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second local tab on 127.0.0.1 join a room, for testing two accounts at once.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
