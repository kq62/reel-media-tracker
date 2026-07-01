import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth v4's handler doubles as both GET and POST for every auth
// endpoint it owns (/api/auth/signin, /callback/credentials, /session,
// /signout, etc). The [...nextauth] catch-all segment routes all of
// those paths here.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
