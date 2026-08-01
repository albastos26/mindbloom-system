import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum([
  "director",
  "head_of_studies",
  "head_of_discipline",
  "nurse",
  "teacher",
  "economist",
  "storekeeper",
  "parent",
  "student",
]);

const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  phone: z.string().optional().nullable(),
  role: roleEnum,
});

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createAccountSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Forbidden: only directors and heads of studies can create accounts");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone ?? null,
        role: data.role,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");

    const { error: profileError } = await supabaseAdmin
      .from("users")
      .upsert({
        id: created.user.id,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone ?? null,
        role: data.role,
        status: "active",
      });
    if (profileError) throw new Error(profileError.message);

    return { id: created.user.id };
  });
