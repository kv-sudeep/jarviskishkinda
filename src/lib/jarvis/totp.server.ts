/**
 * Server-only: generate a TOTP secret + otpauth URL for QR enrollment.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const generateTotpSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const otplib = await import("otplib");
    const secret = otplib.authenticator.generateSecret();
    const otpauth = otplib.authenticator.keyuri("owner", "JARVIS", secret);
    return { secret, otpauth };
  });

export const enableTotp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      secret: z.string().min(8).max(128),
      verify_code: z.string().regex(/^\d{6}$/),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const otplib = await import("otplib");
    otplib.authenticator.options = { window: 1 };
    if (!otplib.authenticator.check(data.verify_code, data.secret)) {
      return { ok: false, error: "Verification code did not match. Try again." };
    }
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("owners")
      .update({ totp_secret_encrypted: data.secret, two_factor_enabled: true })
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({
      event_type: "TOTP_ENABLED",
      actor: "owner",
      action_description: "Owner enabled TOTP two-factor authentication",
      severity: "info",
    });
    return { ok: true, error: null };
  });
