import { z } from "zod";
import { api } from "./api";
const methodsSchema = z.object({
  methods: z
    .array(
      z.object({
        provider: z.enum(["google", "facebook", "email"]),
        connected: z.boolean(),
        available: z.boolean(),
      }),
    )
    .length(3),
});
export type SignInMethod = z.infer<typeof methodsSchema>["methods"][number];
export async function signInMethods() {
  return methodsSchema.parse(await api.core("auth/methods")).methods;
}
export async function linkMethod(
  provider: "google" | "facebook",
  token: string,
) {
  return methodsSchema.parse(
    await api.core(
      `auth/methods/${provider}`,
      "POST",
      provider === "google" ? { idToken: token } : { accessToken: token },
    ),
  ).methods;
}

export async function prepareAvatar(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg"].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  )
    throw new Error("AVATAR_INVALID");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 40000000
    )
      throw new Error("AVATAR_INVALID");
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("AVATAR_INVALID");
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );
    const data = canvas.toDataURL("image/jpeg", 0.85);
    if (data.length > 180000) throw new Error("AVATAR_INVALID");
    return data;
  } finally {
    bitmap.close();
  }
}
