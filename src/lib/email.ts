import { SITE_NAME, SITE_URL } from "./config";
import type { Locale } from "./i18n";

const COPY: Record<Locale, { subject: string; title: string; body: string; button: string; ignore: string; expires: string }> = {
  az: {
    subject: "Overlink parolunun sıfırlanması",
    title: "Parolu sıfırla",
    body: "Hesabınız üçün parol sıfırlama sorğusu aldıq. Yeni parol təyin etmək üçün aşağıdakı düyməyə basın.",
    button: "Yeni parol təyin et",
    ignore: "Bu sorğunu siz göndərməmisinizsə, bu məktubu nəzərə almayın.",
    expires: "Link 1 saat ərzində etibarlıdır.",
  },
  en: {
    subject: "Reset your Overlink password",
    title: "Reset your password",
    body: "We received a request to reset the password for your account. Click the button below to choose a new one.",
    button: "Set a new password",
    ignore: "If you didn't request this, you can safely ignore this email.",
    expires: "This link is valid for 1 hour.",
  },
  ru: {
    subject: "Сброс пароля Overlink",
    title: "Сброс пароля",
    body: "Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы задать новый пароль.",
    button: "Задать новый пароль",
    ignore: "Если вы не отправляли этот запрос, просто проигнорируйте письмо.",
    expires: "Ссылка действительна 1 час.",
  },
};

export async function sendResetEmail(to: string, name: string, token: string, locale: Locale): Promise<boolean> {
  const c = COPY[locale];
  const prefix = locale === "az" ? "" : `/${locale}`;
  const url = `${SITE_URL}${prefix}/reset?token=${encodeURIComponent(token)}`;
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

  const html = `<!doctype html><html><body style="margin:0;background:#f2f2f7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;">
<table role="presentation" align="center" width="100%" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px;"><tr><td>
<div style="font-size:20px;font-weight:700;color:#1c1c1e;margin-bottom:24px;">${SITE_NAME}</div>
<div style="font-size:24px;font-weight:700;color:#1c1c1e;margin-bottom:12px;">${esc(c.title)}</div>
<p style="font-size:16px;line-height:1.5;color:#3c3c43;margin:0 0 8px;">${esc(name)},</p>
<p style="font-size:16px;line-height:1.5;color:#3c3c43;margin:0 0 24px;">${esc(c.body)}</p>
<a href="${url}" style="display:inline-block;background:#007aff;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:13px 24px;border-radius:12px;">${esc(c.button)}</a>
<p style="font-size:13px;line-height:1.5;color:#8e8e93;margin:24px 0 0;">${esc(c.expires)} ${esc(c.ignore)}</p>
</td></tr></table></body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || `${SITE_NAME} <noreply@support.ontegrate.az>`,
      to: [to],
      subject: c.subject,
      html,
      text: `${c.title}\n\n${c.body}\n${url}\n\n${c.expires} ${c.ignore}`,
    }),
  });
  if (!res.ok) console.error("[email] resend failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}
