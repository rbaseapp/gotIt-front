export const SUPPORT_EMAIL = "support@rbaseapp.com";
export const SUPPORT_WHATSAPP_NUMBER = "972502153466";

export function supportEmailHref(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export function supportWhatsappHref(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
