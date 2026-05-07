import { useEffect, useState } from "react";
import { supabase, Profile, profileAPI } from "@/lib/supabase";

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch initial profile
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await profileAPI.getProfile(userId);
        setProfile(data);
      } catch (err) {
        console.error("[v0] Failed to fetch profile:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Subscribe to real-time updates
    const subscription = profileAPI.onProfileChange(userId, (updatedProfile) => {
      setProfile(updatedProfile);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [userId]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return null;
    try {
      const updated = await profileAPI.updateProfile(userId, updates);
      if (updated) {
        setProfile(updated);
      }
      return updated;
    } catch (err) {
      console.error("[v0] Failed to update profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
      return null;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
  };
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (err) {
        console.error("[v0] Failed to get user:", err);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      // Create profile after signup
      if (data.user) {
        await profileAPI.createProfile({
          id: data.user.id,
          email: data.user.email,
        });
      }

      return { user: data.user, error: null };
    } catch (err) {
      return {
        user: null,
        error: err instanceof Error ? err.message : "Sign up failed",
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (err) {
      return {
        user: null,
        error: err instanceof Error ? err.message : "Sign in failed",
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Sign out failed",
      };
    }
  };

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
