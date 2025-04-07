import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      location?: {
        countryCode: string;
        countryName: string;
        timeZone: string;
        gmtOffset: string;
      };
      accessToken: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    location?: {
      countryCode: string;
      countryName: string;
      timeZone: string;
      gmtOffset: string;
    };
    token: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    location?: {
      countryCode: string;
      countryName: string;
      timeZone: string;
      gmtOffset: string;
    };
    accessToken: string;
  }
} 