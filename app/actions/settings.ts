"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// --- Input Validation Schemas ---

const stationSettingsSchema = z.object({
  name: z.string().min(1, "Station name is required"),
  hotline: z.string().min(1, "Delivery hotline is required"),
  address: z.string().min(1, "Physical address is required"),
  hours: z.string().min(1, "Operating hours are required"),
  license: z.string().min(1, "Sanitary permit/license ID is required"),
  alkaline_round: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : NaN),
    z.number().min(0, "Alkaline round rate must be a non-negative number")
  ),
  alkaline_flat: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : NaN),
    z.number().min(0, "Alkaline flat rate must be a non-negative number")
  ),
  mineral_round: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : NaN),
    z.number().min(0, "Mineral round rate must be a non-negative number")
  ),
  mineral_flat: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : NaN),
    z.number().min(0, "Mineral flat rate must be a non-negative number")
  ),
});

const profileSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  phone: z.string().nullable().optional(),
  sms_summary: z.boolean().default(true),
  email_alerts: z.boolean().default(true),
});

const emailSchema = z.string().email("Invalid email address");

export type StationSettingsInput = z.infer<typeof stationSettingsSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

export interface SettingsData {
  stationSettings: {
    name: string;
    hotline: string;
    address: string;
    hours: string;
    license: string;
    alkaline_round: string;
    alkaline_flat: string;
    mineral_round: string;
    mineral_flat: string;
  };
  profile: {
    name: string;
    phone: string;
    sms_summary: boolean;
    email_alerts: boolean;
  };
  auth: {
    email: string;
    role: string;
  };
}

/**
 * Fetch station settings and the current user's profile.
 * Automatically inserts a default profile for the user if it doesn't exist.
 */
export async function getSettings(): Promise<SettingsData> {
  const supabase = await createClient();

  // Get active session user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Please log in to view settings.");
  }

  // 1. Fetch Station Settings (Singleton)
  const { data: stationSettings, error: settingsError } = await supabase
    .from("station_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settingsError) {
    throw new Error(`Failed to fetch station settings: ${settingsError.message}`);
  }

  // 2. Fetch User Profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  let activeProfile = profile;

  // Self-healing: If no profile row exists, insert one
  if (profileError && profileError.code === "PGRST116") {
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert([
        {
          id: user.id,
          name: user.user_metadata?.name || "Jose Dela Cruz",
          phone: user.user_metadata?.phone || "0917 123 4567",
          sms_summary: true,
          email_alerts: true,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create initial profile: ${insertError.message}`);
    }
    activeProfile = newProfile;
  } else if (profileError) {
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  return {
    stationSettings: {
      name: stationSettings.name,
      hotline: stationSettings.hotline,
      address: stationSettings.address,
      hours: stationSettings.hours,
      license: stationSettings.license,
      alkaline_round: Number(stationSettings.alkaline_round).toFixed(2),
      alkaline_flat: Number(stationSettings.alkaline_flat).toFixed(2),
      mineral_round: Number(stationSettings.mineral_round).toFixed(2),
      mineral_flat: Number(stationSettings.mineral_flat).toFixed(2),
    },
    profile: {
      name: activeProfile.name,
      phone: activeProfile.phone || "",
      sms_summary: activeProfile.sms_summary,
      email_alerts: activeProfile.email_alerts,
    },
    auth: {
      email: user.email || "",
      role: "Station Manager", // hardcoded role mapping as per UI design
    },
  };
}

/**
 * Update global station settings.
 */
export async function updateStationSettings(data: StationSettingsInput) {
  const validated = stationSettingsSchema.parse(data);
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Please log in to update settings.");
  }

  const { error } = await supabase
    .from("station_settings")
    .update({
      name: validated.name,
      hotline: validated.hotline,
      address: validated.address,
      hours: validated.hours,
      license: validated.license,
      alkaline_round: validated.alkaline_round,
      alkaline_flat: validated.alkaline_flat,
      mineral_round: validated.mineral_round,
      mineral_flat: validated.mineral_flat,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    throw new Error(`Failed to update station settings: ${error.message}`);
  }

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Update the user's personal profile (and optionally their login email).
 */
export async function updateUserProfile(data: ProfileInput & { email?: string }) {
  const validatedProfile = profileSchema.parse({
    name: data.name,
    phone: data.phone,
    sms_summary: data.sms_summary,
    email_alerts: data.email_alerts,
  });

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Please log in to update profile.");
  }

  // Update profiles table row
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: validatedProfile.name,
      phone: validatedProfile.phone,
      sms_summary: validatedProfile.sms_summary,
      email_alerts: validatedProfile.email_alerts,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(`Failed to update user profile: ${profileError.message}`);
  }

  // Update email if it changed
  if (data.email && data.email !== user.email) {
    emailSchema.parse(data.email);
    const { error: emailError } = await supabase.auth.updateUser({
      email: data.email,
    });
    if (emailError) {
      throw new Error(`Failed to update login email: ${emailError.message}`);
    }
  }

  revalidatePath("/settings");
  return { success: true };
}

/**
 * Fetch pricing rates from station settings (Singleton).
 */
export async function getStationPricing() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("station_settings")
    .select("alkaline_round, alkaline_flat, mineral_round, mineral_flat")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(`Failed to fetch pricing rates: ${error.message}`);
  }

  return {
    alkaline_round: Number(data.alkaline_round),
    alkaline_flat: Number(data.alkaline_flat),
    mineral_round: Number(data.mineral_round),
    mineral_flat: Number(data.mineral_flat),
  };
}

