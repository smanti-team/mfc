"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(prevState: any, formData: FormData) {
  const workerUrl = formData.get("workerUrl") as string;

  if (!workerUrl) {
    return { error: "Worker URL is required" };
  }

  try {
    const url = new URL(workerUrl);
    // basic validation to ensure it's an http/https url
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "Invalid URL protocol" };
    }
  } catch {
    return { error: "Invalid URL format" };
  }

  const cookieStore = await cookies();
  cookieStore.set("api_url", workerUrl.replace(/\/$/, ""), {
    httpOnly: false, // Allow client side to read it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  // Redirect to home if successful
  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("api_url");
  redirect("/login");
}
