
export interface PostStats {
  views?: number;
  likes?: number;
  claps?: number;
  bookmarks?: number;
  comments?: number;
  shares?: number;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  imageUrl: string;
  content?: string;
  isPublished?: boolean;
  subtitle?: string;
  _id?: string;
  stats?: PostStats;
  author?: {
    name: string;
    role: string;
    avatar: string;
  };
}

export interface Ingredient {
  id: string;
  name: string;
  scientificName: string;
  benefits: string[];
  imageUrl: string;
  description: string;
  usage: string[];
}

export interface UserProfile {
  name: string;
  location: string;
  skinType: string;
  avatar: string;
  streak: number;
}

export interface User {
  id?: string;
  _id?: string;
  Email: string;
  Password?: string;
  Role?: "user" | "admin";
  FirstName: string;
  LastName: string;
  ProfilePicture: string;
  Bio?: string;
  SavedArticles?: string[];
  SavedIngredients?: string[];
  Location?: string;
  SkinType?: string;
  SkinConcern?: string;
  RitualFrequency?: string;
  AccessToken?: string;
}

export interface UserSettings {
  id?: string;
  _id?: string;
  name: string;
  userId: string;
  username: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  coverImage?: string;
  language?: string;
  timezone?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };
  categories?: string[];
  tags?: string[];
  metaDescription?: string;
  keywords?: string[];
  canonicalURL?: string;
  socialPreviewImage?: string;
  openGraphTags?: Record<string, string>;
  isSubscribed?: boolean;
  newsletterFrequency?: string;
  newsletterTopics?: string[];
  collaborations?: string[];
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
  totalLikes?: number;
  totalComments?: number;
  isPrivate?: boolean;
  blockList?: string[];
  allowComments?: boolean;
  theme?: string;
  fontPreferences?: string;
  layoutPreferences?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  mailchimpListId?: string;
}

export interface UpdateProfilePayload extends Partial<User> {}
export interface UpdateSettingsPayload extends Partial<UserSettings> {}

export interface LoginPayload {
  Email: string;
  Password?: string;
}
