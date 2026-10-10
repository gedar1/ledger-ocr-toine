import type { DefaultSession } from "@auth/core/types";
import type { Role, ClientStatus } from "@prisma/client";

/**
 * Module augmentation: extends Auth.js's Session/User/JWT shapes with the
 * role/locale/client-status fields FEAT-002's authorize()/jwt()/session()
 * callbacks attach. See src/auth.ts.
 *
 * next-auth v5 beta's own "next-auth" and "next-auth/jwt" entry points only
 * re-export the Session/User/JWT interfaces from @auth/core (see
 * node_modules/next-auth/jwt.d.ts: `export * from "@auth/core/jwt"`), so
 * augmenting "next-auth"/"next-auth/jwt" does not merge — the augmentation
 * must target "@auth/core/types" and "@auth/core/jwt" where the interfaces
 * are actually declared.
 */
declare module "@auth/core/types" {
  interface User {
    role: Role;
    locale: string;
    clientStatus: ClientStatus | null;
    clientProfileId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      locale: string;
      clientStatus: ClientStatus | null;
      clientProfileId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    locale: string;
    clientStatus: ClientStatus | null;
    clientProfileId: string | null;
  }
}
