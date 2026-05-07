import { useAuth, useProfile } from "@/hooks/useProfile";
import { useState } from "react";

export function ProfileCard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(
    user?.id
  );
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  const handleSave = async () => {
    if (!user) return;
    await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl,
    });
    setIsEditing(false);
  };

  if (authLoading || profileLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p>Please sign in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Avatar */}
      <div className="flex justify-center mb-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || "User"}
            className="w-24 h-24 rounded-full object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-600">
              {profile?.full_name?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="mb-4">
        {isEditing ? (
          <>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
            />
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Avatar URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-center">
              {profile?.full_name || "User Profile"}
            </h2>
            <p className="text-gray-600 text-center">{user.email}</p>
            {profile?.created_at && (
              <p className="text-sm text-gray-400 text-center mt-2">
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </p>
            )}
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Save Profile
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setFullName(profile?.full_name || "");
                setAvatarUrl(profile?.avatar_url || "");
              }}
              className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Edit Profile
            </button>
            <button
              onClick={signOut}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
