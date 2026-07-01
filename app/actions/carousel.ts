"use server";

import { createClient } from "@/lib/supabase/server";
import { v2 as cloudinary } from "cloudinary";
import { revalidatePath } from "next/cache";

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_IMAGES = 2;
const MAX_IMAGES = 5;

// ─── Cloudinary Config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CarouselImage {
  id: string;
  cloudinary_url: string;
  cloudinary_public_id: string;
  sequence_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all active login carousel images sorted by sequence order.
 * Used by the login page carousel (public).
 */
export async function getActiveCarouselImages(): Promise<CarouselImage[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("login_carousel_images")
      .select("id, cloudinary_url, cloudinary_public_id, sequence_order, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("sequence_order", { ascending: true });

    if (error) {
      console.error("Error fetching carousel images:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception fetching carousel images:", err);
    return [];
  }
}

/**
 * Fetches ALL carousel images (active and inactive) for the admin settings panel.
 */
export async function getAllCarouselImages(): Promise<CarouselImage[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("login_carousel_images")
      .select("id, cloudinary_url, cloudinary_public_id, sequence_order, is_active, created_at, updated_at")
      .order("sequence_order", { ascending: true });

    if (error) {
      console.error("Error fetching all carousel images:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception fetching all carousel images:", err);
    return [];
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Upload a new carousel image to Cloudinary and insert a DB record.
 * Enforces MAX_IMAGES limit.
 */
export async function uploadCarouselImage(
  formData: FormData
): Promise<{ success: boolean; error?: string; image?: CarouselImage }> {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    // Count existing images
    const { count, error: countError } = await supabase
      .from("login_carousel_images")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return { success: false, error: `Failed to check image count: ${countError.message}` };
    }

    if ((count ?? 0) >= MAX_IMAGES) {
      return { success: false, error: `Maximum of ${MAX_IMAGES} carousel images allowed.` };
    }

    // Extract file from FormData
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided." };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Invalid file type. Only JPG, PNG, and WEBP are allowed." };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File too large. Maximum size is 5MB." };
    }

    // Upload to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "castle_drops/login_carousel",
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        stream.end(buffer);
      }
    );

    // Calculate next sequence order
    const nextOrder = (count ?? 0) + 1;

    // Insert into DB
    const { data: newImage, error: insertError } = await supabase
      .from("login_carousel_images")
      .insert({
        cloudinary_url: uploadResult.secure_url,
        cloudinary_public_id: uploadResult.public_id,
        sequence_order: nextOrder,
        is_active: true,
      })
      .select("id, cloudinary_url, cloudinary_public_id, sequence_order, is_active, created_at, updated_at")
      .single();

    if (insertError) {
      // Attempt cleanup of uploaded Cloudinary asset
      try {
        await cloudinary.uploader.destroy(uploadResult.public_id);
      } catch {
        console.error("Failed to clean up Cloudinary asset after DB insert failure.");
      }
      return { success: false, error: `Failed to save image: ${insertError.message}` };
    }

    revalidatePath("/settings");
    revalidatePath("/login");

    return { success: true, image: newImage };
  } catch (err) {
    console.error("Exception uploading carousel image:", err);
    return { success: false, error: "An unexpected error occurred while uploading." };
  }
}

/**
 * Delete a carousel image from Cloudinary and Supabase.
 * Enforces MIN_IMAGES limit.
 */
export async function deleteCarouselImage(
  id: string,
  publicId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    // Count existing images
    const { count, error: countError } = await supabase
      .from("login_carousel_images")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return { success: false, error: `Failed to check image count: ${countError.message}` };
    }

    if ((count ?? 0) <= MIN_IMAGES) {
      return { success: false, error: `Cannot delete. A minimum of ${MIN_IMAGES} carousel images is required.` };
    }

    // Destroy from Cloudinary first to free storage
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudErr) {
      console.error("Cloudinary destroy error:", cloudErr);
      // Continue to delete DB row even if Cloudinary fails
      // (asset may have already been removed manually)
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from("login_carousel_images")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return { success: false, error: `Failed to delete image record: ${deleteError.message}` };
    }

    revalidatePath("/settings");
    revalidatePath("/login");

    return { success: true };
  } catch (err) {
    console.error("Exception deleting carousel image:", err);
    return { success: false, error: "An unexpected error occurred while deleting." };
  }
}

/**
 * Batch-update sequence_order for all images based on the provided ordered ID list.
 */
export async function reorderCarouselImages(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    // Update each image's sequence_order
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("login_carousel_images")
        .update({ sequence_order: i + 1, updated_at: new Date().toISOString() })
        .eq("id", orderedIds[i]);

      if (error) {
        return { success: false, error: `Failed to update order for image ${i + 1}: ${error.message}` };
      }
    }

    revalidatePath("/settings");
    revalidatePath("/login");

    return { success: true };
  } catch (err) {
    console.error("Exception reordering carousel images:", err);
    return { success: false, error: "An unexpected error occurred while reordering." };
  }
}
