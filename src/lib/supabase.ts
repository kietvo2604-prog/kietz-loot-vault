import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for the profiles table
export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

// Helper functions for profile operations
export const profileAPI = {
  // Get user profile
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[v0] Error fetching profile:", error);
      return null;
    }
    return data;
  },

  // Create user profile
  async createProfile(profile: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .insert([profile])
      .select()
      .single();

    if (error) {
      console.error("[v0] Error creating profile:", error);
      return null;
    }
    return data;
  },

  // Update user profile
  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("[v0] Error updating profile:", error);
      return null;
    }
    return data;
  },

  // Delete user profile
  async deleteProfile(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("[v0] Error deleting profile:", error);
      return false;
    }
    return true;
  },

  // Subscribe to profile updates
  onProfileChange(
    userId: string,
    callback: (profile: Profile | null) => void
  ) {
    return supabase
      .from(`profiles:id=eq.${userId}`)
      .on("*", (payload) => {
        callback(payload.new as Profile | null);
      })
      .subscribe();
  },
};
