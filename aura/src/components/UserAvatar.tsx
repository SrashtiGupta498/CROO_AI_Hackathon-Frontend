import React from "react";
import { toAbsoluteUrl } from "../services/uploadImage";

/**
 * Initials for the signed-in member.
 *
 * FirstName/LastName are separate fields on the user record, but either one can
 * itself hold several words (people type their full name into "First name"), so
 * the two are joined and split again: first letter of the first word + first
 * letter of the last word. A single word gives a single initial.
 *
 * There is deliberately no image fallback anywhere — when no name is available
 * the avatar falls back to a handle/email initial, and only then to the brand
 * letter, so a member never sees a stock photo of someone else.
 */
export const userInitials = (
  first?: string,
  last?: string,
  fallbackName?: string,
): string => {
  const words = `${first || ""} ${last || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    const alt = (fallbackName || "").trim();
    return alt ? alt.charAt(0).toUpperCase() : "A";
  }
  const head = words[0].charAt(0);
  const tail = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return `${head}${tail}`.toUpperCase();
};

interface UserAvatarProps {
  /** Uploaded profile picture. Absolute or API-relative; empty falls back to initials. */
  src?: string;
  firstName?: string;
  lastName?: string;
  /** Used only when there is no name at all — a handle or email, say. */
  fallbackName?: string;
  /** Sizing/shape utilities for the wrapper (w-*, h-*, rounded-*, …). */
  className?: string;
  /** Type utilities for the initials (text-*, tracking-*, …). */
  textClassName?: string;
  alt?: string;
}

/**
 * The member's avatar: their uploaded picture where there is one, their
 * initials on the forest disc otherwise. Shared so the profile page, the edit
 * modal and the header can never drift apart.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  firstName,
  lastName,
  fallbackName,
  className = "",
  textClassName = "",
  alt = "Profile",
}) => {
  // An avatar is never shown wider than 160px, so there is no reason to send
  // a 1600px original; 320 covers a 2x screen.
  const url = toAbsoluteUrl(src, 320);
  return (
    <span
      className={`grid place-items-center overflow-hidden bg-sage text-white font-bold leading-none select-none ${className}`}
    >
      {url ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span className={textClassName}>
          {userInitials(firstName, lastName, fallbackName)}
        </span>
      )}
    </span>
  );
};

export default UserAvatar;
