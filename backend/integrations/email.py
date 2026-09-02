import os
import logging
import httpx

logger = logging.getLogger("dhl")

RESEND_ENDPOINT = "https://api.resend.com/emails"


def is_configured() -> bool:
    return bool(os.environ.get("RESEND_API_KEY", "").strip())


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send a transactional email via Resend. Returns False if not configured or on error."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        logger.warning("RESEND_API_KEY não configurada — e-mail não enviado.")
        return False
    sender = os.environ.get("RESEND_FROM", "onboarding@resend.dev").strip() or "onboarding@resend.dev"
    try:
        async with httpx.AsyncClient(timeout=15) as cx:
            r = await cx.post(
                RESEND_ENDPOINT,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"from": sender, "to": [to], "subject": subject, "html": html},
            )
        if r.status_code >= 400:
            logger.error(f"Resend erro {r.status_code}: {r.text}")
            return False
        return True
    except Exception as e:
        logger.error(f"Falha ao enviar e-mail via Resend: {e}")
        return False


def password_reset_html(link: str, name: str = "") -> str:
    hi = f"Olá, {name.split(' ')[0]}," if name else "Olá,"
    return f"""\
<div style="margin:0;padding:0;background:#F5F5F5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="background:#FFCC00;border-radius:12px 12px 0 0;padding:20px 28px;">
      <span style="font-size:26px;font-weight:900;font-style:italic;color:#D40511;letter-spacing:-1px;">DHL</span>
    </div>
    <div style="background:#ffffff;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;padding:32px 28px;">
      <h1 style="margin:0 0 4px;font-size:22px;color:#333333;">Smart<span style="color:#D40511;">Time</span></h1>
      <p style="margin:0 0 24px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;font-weight:bold;">Gestão de Horas Extras</p>
      <p style="font-size:15px;color:#334155;margin:0 0 12px;">{hi}</p>
      <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 24px;">
        Recebemos uma solicitação para redefinir a senha da sua conta SmartTime.
        Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.
      </p>
      <a href="{link}" style="display:inline-block;background:#D40511;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:8px;">
        Redefinir minha senha
      </a>
      <p style="font-size:13px;color:#64748B;line-height:1.6;margin:28px 0 0;">
        Se você não solicitou esta alteração, ignore este e-mail — sua senha permanecerá a mesma.
      </p>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />
      <p style="font-size:12px;color:#94A3B8;margin:0;">SmartTime · Uso interno · Suporte: TI Operações</p>
    </div>
  </div>
</div>"""
