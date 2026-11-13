import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Coarse, edge-safe redirect only. Authorization is enforced again in lib/dal.ts.
export default NextAuth(authConfig).auth;

export const config = { matcher: ["/dashboard/:path*", "/onboarding/:path*"] };
