import "server-only";
import { cookies } from "next/headers";

/** httpOnly cookies holding the Sanctum tokens. Browser JS can never read them. */
export const SESSION_COOKIE = "slaf_admin_session";
export const MFA_COOKIE = "slaf_admin_mfa";

const secure = process.env.NODE_ENV === "production";

export async function setCookie(name: string, token: string, expiresAt: string) {
  (await cookies()).set(name, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getCookie(name: string) {
  return (await cookies()).get(name)?.value;
}

export async function clearCookie(name: string) {
  (await cookies()).delete(name);
}
