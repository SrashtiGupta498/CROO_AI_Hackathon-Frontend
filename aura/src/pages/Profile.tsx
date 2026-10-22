import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppDispatch, RootState } from "../store/store";
import { logoutUser, updateUserProfile, fetchUserProfile, fetchCurrentUser, fetchUserSettings, updateUserSettings } from "../store/user/user.action";
import { logout } from "../store/user/user.slice";
import { UpdateProfilePayload, UpdateSettingsPayload, UserSettings } from "../types";
import { uploadSingleImage, toAbsoluteUrl } from "../services/uploadImage";
import { getMyBookmarks, getMyLikes } from "../services/engagement";
import { isAdminUser } from "../components/AdminRoute";
import { ARTICLES } from "../constants";
import { Img6 } from "../assets/index";
import {
  LogOut,
  ArrowLeft,
  Settings,
  Sparkles,
  BookOpen,
  Leaf,
  ChevronRight,
  Shield,
  Bell,
  Activity,
  Calendar,
  X,
  Check,
  User,
  Camera,
  FileText,
  MapPin,
  LocateFixed,
  Droplets,
  Heart,
  Clock,
  Globe,
  Instagram,
  Youtube,
  Mail,
  Palette,
  Eye,
  MessageSquare,
} from "lucide-react";
import "./Profile.css";
import { useToast } from "../components/Toast";
import { describeError } from "../services/errorMessage";

/**
 * Profile page — Herbal Apothecary redesign.
 * Light, calm layout with profile summary, saved/liked content, an ingredients
 * tab, a settings panel, and an edit modal that saves profile + settings.
 */
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser, settings, loading } = useSelector((state: RootState) => state.user);
  const isAdmin = isAdminUser(currentUser);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"articles" | "liked" | "ingredients" | "settings">("articles");

  // Deep-link support: /profile?tab=liked (used by the header heart icon).
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "articles" || tab === "liked" || tab === "ingredients" || tab === "settings") {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // ── Edit Profile Modal state ──────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProfilePayload>({
    FirstName: "",
    LastName: "",
    ProfilePicture: "",
    Bio: "",
    Location: "",
    SkinType: "",
    SkinConcern: "",
    RitualFrequency: "",
  });
  const [previewPic, setPreviewPic] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // ── Edit Settings state ───────────────────────────────────────────────────
  const [editSettingsForm, setEditSettingsForm] = useState<UpdateSettingsPayload>({});
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // ── Saved (bookmarked) + Liked posts from the engagement API ──
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (currentUser) {
      setSavedLoading(true);
      getMyBookmarks()
        .then((posts) => active && setSavedPosts(posts))
        .catch(() => active && setSavedPosts([]))
        .finally(() => active && setSavedLoading(false));
      setLikedLoading(true);
      getMyLikes()
        .then((posts) => active && setLikedPosts(posts))
        .catch(() => active && setLikedPosts([]))
        .finally(() => active && setLikedLoading(false));
    } else {
      setSavedPosts([]);
      setLikedPosts([]);
    }
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?._id]);

  useEffect(() => {
    setIsLoaded(true);
    const userId = currentUser?.id || currentUser?._id;
    if (userId) {
      dispatch(fetchUserProfile(userId));
      dispatch(fetchUserSettings(userId));
    } else if (currentUser?.AccessToken) {
      // Session has a token but no id — resolve identity from the token. The
      // fulfilled case writes the id into currentUser, which re-runs this
      // effect and loads the profile and settings on the next pass.
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser?.id, currentUser?._id, currentUser?.AccessToken]);

  useEffect(() => {
    if (showEditModal && currentUser) {
      setEditForm({
        FirstName: currentUser.FirstName || "",
        LastName: currentUser.LastName || "",
        ProfilePicture: currentUser.ProfilePicture || "",
        Bio: currentUser.Bio || "",
        Location: currentUser.Location || "",
        SkinType: currentUser.SkinType || "Normal",
        SkinConcern: currentUser.SkinConcern || "",
        RitualFrequency: currentUser.RitualFrequency || "Daily",
      });
      setPreviewPic(currentUser.ProfilePicture || "");
      setSaveSuccess(false);
    }
    if (showEditModal && settings) {
      setEditSettingsForm({ ...settings });
      setSettingsSaveSuccess(false);
    }
  }, [showEditModal, currentUser, settings]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleImageClick = () => fileInputRef.current?.click();

  // Avatar from the profile header — upload the file and save its URL.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentUser) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadSingleImage(file);
      if (url) {
        dispatch(
          updateUserProfile({
            userId: currentUser.id || currentUser._id!,
            profileData: { ProfilePicture: url },
          }),
        );
      }
    } catch (err: any) {
      console.error(err);
      toast.error(describeError(err, "Couldn't upload that image."));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Avatar from inside the edit modal — upload, preview, and stage on the form.
  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadSingleImage(file);
      if (url) {
        setPreviewPic(url);
        setEditForm((prev) => ({ ...prev, ProfilePicture: url }));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(describeError(err, "Couldn't upload that image."));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Cover image (settings) — upload the file and store its URL.
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadSingleImage(file);
      if (url) handleSettingsChange("coverImage", url);
    } catch (err: any) {
      console.error(err);
      toast.error(describeError(err, "Couldn't upload that image."));
    } finally {
      setUploadingCover(false);
    }
  };

  const handleEditChange = (field: keyof UpdateProfilePayload, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setEditSettingsForm((prev) => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            // @ts-ignore
            ...(prev[parent] || {}),
            [child]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleDetectLocation = () => {
    if ("geolocation" in navigator) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Using Nominatim OpenStreetMap for free reverse geocoding
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "Unknown City";
          const country = data.address.country || "";
          const locationString = country ? `${city}, ${country}` : city;
          setEditForm(prev => ({ ...prev, Location: locationString }));
        } catch (err) {
          console.error("Geocoding failed", err);
        } finally {
          setLocationLoading(false);
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        setLocationLoading(false);
      }, { timeout: 10000 });
    }
  };

  // Persist only the profile fields that actually changed. Returns whether
  // the update succeeded (or was a no-op with nothing to save).
  const handleSaveProfile = async (): Promise<boolean> => {
    if (!currentUser) return false;
    const payload: UpdateProfilePayload = {};

    const fields: (keyof UpdateProfilePayload)[] = [
      'FirstName', 'LastName', 'ProfilePicture', 'Bio',
      'Location', 'SkinType', 'SkinConcern', 'RitualFrequency'
    ];

    fields.forEach(field => {
      // @ts-ignore
      if (editForm[field] !== (currentUser[field] ?? "")) {
        // @ts-ignore
        payload[field] = editForm[field];
      }
    });

    if (Object.keys(payload).length === 0) return true; // nothing changed

    const result = await dispatch(updateUserProfile({
      userId: currentUser.id || currentUser._id!,
      profileData: payload,
    }));
    return updateUserProfile.fulfilled.match(result);
  };

  const handleSaveSettings = async (): Promise<boolean> => {
    const userId = currentUser?.id || currentUser?._id;
    if (!userId) return false;

    // Strip server-managed fields — the backend rejects unknown properties.
    const { id, _id, userId: _uid, createdAt, updatedAt, __v, ...settingsData } =
      editSettingsForm as any;

    const result = await dispatch(updateUserSettings({
      userId,
      settingsData,
    }));
    return updateUserSettings.fulfilled.match(result);
  };

  // Single "Save changes" action for the modal — persists BOTH the profile
  // fields and the settings (previously the button only saved settings, so
  // name/bio/skin edits were silently discarded).
  const handleSaveAll = async () => {
    const [profileOk, settingsOk] = await Promise.all([
      handleSaveProfile(),
      handleSaveSettings(),
    ]);
    if (profileOk && settingsOk) {
      setSaveSuccess(true);
      setSettingsSaveSuccess(true);
      setTimeout(() => {
        setShowEditModal(false);
        setSaveSuccess(false);
        setSettingsSaveSuccess(false);
      }, 900);
    }
  };

  // ── Helper Component: EmptyState ─────────────────────────────────────────
  const EmptyState = ({ 
    icon: Icon, 
    title, 
    desc, 
    cta, 
    onCta 
  }: { 
    icon: any, 
    title: string, 
    desc: string, 
    cta: string, 
    onCta: () => void 
  }) => (
    <div className="w-full py-20 flex flex-col items-center justify-center text-center profile-animate-slide-up">
      <div className="w-24 h-24 rounded-full bg-[#3D5B4F]/10 flex items-center justify-center text-[#3D5B4F] mb-8 relative">
        <Icon size={40} className="relative z-10" />
        <div className="absolute inset-0 bg-[#3D5B4F]/10 blur-2xl rounded-full animate-pulse" />
      </div>
      <h3 className="text-2xl font-bold text-[#2D2A26] mb-3 italic font-serif">
        {title}
      </h3>
      <p className="text-[#2D2A26]/40 text-sm max-w-xs leading-relaxed mb-10 font-light px-4">
        {desc}
      </p>
      <button 
        onClick={onCta}
        className="px-8 py-4 rounded-2xl border border-[#3D5B4F] text-[#3D5B4F] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#3D5B4F] hover:text-white transition-all shadow-xl shadow-[#3D5B4F]/10"
      >
        {cta}
      </button>
    </div>
  );

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-[#F6F2EC] font-sans" data-testid="profile-guard">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3D5B4F]/10 blur-[100px] rounded-full animate-pulse" />
        </div>
        <div className="relative z-10 p-12 bg-white/40 backdrop-blur-2xl rounded-[3rem] border border-black/5 text-center max-w-md w-full mx-6 shadow-2xl">
          <div className="w-20 h-20 bg-[#3D5B4F]/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Sparkles className="w-10 h-10 text-[#3D5B4F]" />
          </div>
          <h2 className="text-3xl font-bold text-[#2D2A26] mb-4 font-serif">Sign in to view your profile</h2>
          <p className="text-[#2D2A26]/50 text-sm mb-10 leading-relaxed">Access your saved articles, skin insights and preferences in one place.</p>
          <button
            onClick={() => navigate('/Login')}
            data-testid="profile-guard-signin"
            className="w-full py-4 bg-[#3D5B4F] text-white rounded-2xl font-semibold tracking-wide text-sm hover:bg-[#4B695A] transition-all shadow-lg shadow-[#3D5B4F]/20"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#F6F2EC] font-sans overflow-x-hidden pb-32" data-testid="profile-page">
      {/* ── Background Elements ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="profile-blob w-[600px] h-[600px] bg-[#3D5B4F]/10 top-[-100px] right-[-100px] rounded-full" />
        <div className="profile-blob w-[500px] h-[500px] bg-[#C6A66B]/20 bottom-[-100px] left-[-100px] rounded-full [animation-delay:-5s]" />
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative h-[45vh] w-full overflow-hidden">
        <img
          src={toAbsoluteUrl(settings?.coverImage) || Img6}
          alt="Profile cover"
          className={`w-full h-full object-cover transition-transform duration-[3000ms] ${isLoaded ? 'scale-100' : 'scale-110'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F6F2EC]/20 to-[#F6F2EC]" />
        
        <div className="absolute top-10 left-8 right-8 flex justify-between items-center z-20">
          <button onClick={() => navigate(-1)} className="p-4 rounded-full bg-white/40 backdrop-blur-xl border border-white/80 text-[#2D2A26] hover:bg-white/80 transition-all shadow-sm">
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex gap-3">
            <button className="p-4 rounded-full bg-white/40 backdrop-blur-xl border border-white/80 text-[#2D2A26] hover:bg-white/80 transition-all shadow-sm">
              <Bell size={18} />
            </button>
            <button onClick={() => setShowEditModal(true)} aria-label="Edit profile & settings" data-testid="profile-open-settings" className="p-4 rounded-full bg-white/40 backdrop-blur-xl border border-white/80 text-[#2D2A26] hover:bg-[#3D5B4F] hover:text-white transition-all shadow-sm">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-10 profile-animate-slide-up">
        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="profile-glass-card rounded-[3.5rem] p-10 overflow-hidden relative">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-10 group cursor-pointer" onClick={handleImageClick}>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <div className="w-40 h-40 rounded-full border-4 border-white shadow-2xl transition-all duration-700 overflow-hidden p-1 bg-white">
                    <img
                      src={toAbsoluteUrl(currentUser.ProfilePicture) || "https://picsum.photos/seed/aura/300/300"}
                      className={`w-full h-full object-cover rounded-full transition-transform duration-700 ${loading ? 'opacity-40' : 'group-hover:scale-110'}`} 
                      alt="Profile" 
                    />
                    <div className="absolute inset-1 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Camera size={24} />
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 w-10 h-10 bg-[#3D5B4F] rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                    <Sparkles size={16} />
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold text-[#2D2A26] mb-2 font-serif" data-testid="profile-name">
                  {currentUser.FirstName} {currentUser.LastName}
                </h1>
                <p className="text-[#3D5B4F] text-[9px] font-black uppercase tracking-[0.4em] mb-4">Member</p>
                
                {currentUser.Bio && (
                  <p className="text-[#2D2A26]/60 text-sm italic mb-8 px-4 font-medium leading-relaxed">"{currentUser.Bio}"</p>
                )}

                <div className="w-full space-y-4 pt-6 border-t border-black/[0.03]">
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2 text-[#2D2A26]/30">
                      <MapPin size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Location</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#2D2A26]/80">{currentUser.Location || "Not set"}</span>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2 text-[#2D2A26]/30">
                      <Droplets size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Skin Type</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#c67d63]">{currentUser.SkinType || "Normal"}</span>
                  </div>
                </div>

                <div className="mt-10 flex gap-3 w-full">
                  <button onClick={() => setShowEditModal(true)} data-testid="profile-edit-profile" className="flex-1 py-4 rounded-2xl bg-[#2D2A26] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#4B695A] transition-all shadow-lg">
                    Edit Profile
                  </button>
                  <button
                    onClick={async () => {
                      // Tell the server, but clear the client session regardless
                      // of the result, then navigate. Clearing BEFORE navigating
                      // avoids the Login guard bouncing back to /profile while
                      // currentUser is still set.
                      try {
                        await dispatch(logoutUser()).unwrap();
                      } catch {
                        /* ignore server logout failure */
                      }
                      dispatch(logout());
                      navigate('/Login');
                    }}
                    aria-label="Log out"
                    data-testid="profile-logout"
                    className="p-4 rounded-2xl bg-[#b4413c]/8 text-[#8f322e] hover:bg-[#b4413c]/15 transition-all border border-[#b4413c]/20"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Studio — visible only to admins */}
            {isAdmin && (
              <div className="profile-glass-card rounded-[2.5rem] p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Shield size={14} className="text-[#3D5B4F]" />
                  <p className="text-[10px] font-black text-[#2D2A26]/40 uppercase tracking-[0.3em]">Admin Studio</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/admin/categories')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#3D5B4F]/10 text-[#2D2A26] text-sm font-bold hover:bg-[#3D5B4F]/20 transition-all"
                  >
                    <span className="flex items-center gap-2"><Leaf size={14} className="text-[#3D5B4F]" /> Manage Categories</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate('/admin/content-editor')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#3D5B4F]/10 text-[#2D2A26] text-sm font-bold hover:bg-[#3D5B4F]/20 transition-all"
                  >
                    <span className="flex items-center gap-2"><FileText size={14} className="text-[#3D5B4F]" /> Content Dashboard</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate('/admin/story-editor')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#3D5B4F]/10 text-[#2D2A26] text-sm font-bold hover:bg-[#3D5B4F]/20 transition-all"
                  >
                    <span className="flex items-center gap-2"><Sparkles size={14} className="text-[#3D5B4F]" /> Story Editor</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate('/admin/skin-reports')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#3D5B4F]/10 text-[#2D2A26] text-sm font-bold hover:bg-[#3D5B4F]/20 transition-all"
                  >
                    <span className="flex items-center gap-2"><Activity size={14} className="text-[#3D5B4F]" /> Skin Reports</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="profile-glass-card rounded-[2.5rem] p-8 flex justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#2D2A26]">{currentUser.SkinConcern || "None"}</p>
                <p className="text-[8px] font-black text-[#2D2A26]/30 uppercase tracking-widest mt-1">Primary Concern</p>
              </div>
              <div className="w-px h-10 bg-black/5" />
              <div className="text-center">
                <p className="text-2xl font-bold text-[#2D2A26]">{currentUser.RitualFrequency || "Daily"}</p>
                <p className="text-[8px] font-black text-[#2D2A26]/30 uppercase tracking-widest mt-1">Rituals</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/my-reports')}
              className="w-full flex items-center justify-between px-6 py-4 rounded-[2rem] bg-white/60 backdrop-blur-xl border border-white text-[#2D2A26] text-sm font-bold hover:bg-white/80 transition-all shadow-sm"
            >
              <span className="flex items-center gap-2"><Activity size={16} className="text-[#3D5B4F]" /> My Skin Reports</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="lg:col-span-8 space-y-8">
              <div className="relative p-2 bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white flex gap-1 shadow-sm overflow-hidden">
              <div
                className="absolute top-2 left-2 bottom-2 bg-[#3D5B4F] rounded-[1.8rem] transition-all duration-500 ease-out z-0 w-[calc(25%_-_7px)]"
                style={{
                  transform: `translateX(${activeTab === 'articles' ? '0%' : activeTab === 'liked' ? '102%' : activeTab === 'ingredients' ? '204%' : '306%'})`,
                }}
              />
              {['articles', 'liked', 'ingredients', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  data-testid={`profile-tab-${tab}`}
                  aria-pressed={activeTab === tab}
                  className={`relative z-10 flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${activeTab === tab ? 'text-white' : 'text-[#2D2A26]/40 hover:text-[#2D2A26]/60'}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {tab === 'articles' && <BookOpen size={14} />}
                    {tab === 'liked' && <Heart size={14} />}
                    {tab === 'ingredients' && <Leaf size={14} />}
                    {tab === 'settings' && <Settings size={14} />}
                    {tab === 'articles' ? 'Saved' : tab === 'liked' ? 'Liked' : tab === 'ingredients' ? 'Ingredients' : 'Settings'}
                  </span>
                </button>
              ))}
            </div>

            <div className="min-h-[500px]">
              {activeTab === 'articles' && (
                <div className="profile-animate-slide-up">
                  {savedLoading ? (
                    <p className="text-center text-[#2D2A26]/40 text-sm py-16">Loading your saved rituals…</p>
                  ) : savedPosts.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-8">
                      {savedPosts.map((article: any) => {
                        const aid = article._id || article.id;
                        const cover =
                          toAbsoluteUrl(article.thumbnailUrl || article.thumbnail || article.imageUrl) ||
                          `https://picsum.photos/seed/${aid}/800/400`;
                        return (
                          <div
                            key={aid}
                            onClick={() => navigate(`/article/${aid}`)}
                            className="group profile-glass-card rounded-[3rem] p-6 cursor-pointer hover:shadow-2xl transition-all duration-500"
                          >
                            <div className="h-56 rounded-[2rem] overflow-hidden mb-6">
                              <img src={cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={article.title} />
                            </div>
                            <h4 className="text-xl font-bold text-[#2D2A26] mb-2 italic font-serif">{article.title}</h4>
                            <p className="text-[#2D2A26]/40 text-xs mb-6 line-clamp-2">{article.subtitle || "A saved article from your collection."}</p>
                            <div className="flex justify-between items-center pt-4 border-t border-black/5 text-[9px] font-bold text-[#2D2A26]/30 uppercase tracking-widest">
                              <span className="flex items-center gap-2"><BookOpen size={10} /> Saved</span>
                              <span className="text-[#3D5B4F] flex items-center gap-1 group-hover:gap-2 transition-all">Read Ritual <ChevronRight size={10} /></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={BookOpen} title="Nothing saved yet"
                      desc="Articles you save will be collected here for easy access."
                      cta="Explore articles" onCta={() => navigate('/explore')}
                    />
                  )}
                </div>
              )}

              {activeTab === 'liked' && (
                <div className="profile-animate-slide-up">
                  {likedLoading ? (
                    <p className="text-center text-[#2D2A26]/40 text-sm py-16">Loading your liked posts…</p>
                  ) : likedPosts.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-8">
                      {likedPosts.map((article: any) => {
                        const aid = article._id || article.id;
                        const cover =
                          toAbsoluteUrl(article.thumbnailUrl || article.thumbnail || article.imageUrl) ||
                          `https://picsum.photos/seed/${aid}/800/400`;
                        return (
                          <div
                            key={aid}
                            onClick={() => navigate(`/article/${aid}`)}
                            className="group profile-glass-card rounded-[3rem] p-6 cursor-pointer hover:shadow-2xl transition-all duration-500"
                          >
                            <div className="h-56 rounded-[2rem] overflow-hidden mb-6">
                              <img src={cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={article.title} />
                            </div>
                            <h4 className="text-xl font-bold text-[#2D2A26] mb-2 italic font-serif">{article.title}</h4>
                            <p className="text-[#2D2A26]/40 text-xs mb-6 line-clamp-2">{article.subtitle || "A post you liked."}</p>
                            <div className="flex justify-between items-center pt-4 border-t border-black/5 text-[9px] font-bold text-[#2D2A26]/30 uppercase tracking-widest">
                              <span className="flex items-center gap-2"><Heart size={10} /> Liked</span>
                              <span className="text-[#3D5B4F] flex items-center gap-1 group-hover:gap-2 transition-all">Read Ritual <ChevronRight size={10} /></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Heart} title="No liked posts yet"
                      desc="Tap the heart on any article and it will appear here."
                      cta="Explore articles" onCta={() => navigate('/explore')}
                    />
                  )}
                </div>
              )}

              {activeTab === 'ingredients' && (
                <div className="profile-animate-slide-up">
                  <EmptyState
                    icon={Leaf} title="No ingredients yet"
                    desc="Ingredients you explore in the library will appear here."
                    cta="Browse ingredients" onCta={() => navigate('/ingredients')}
                  />
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="profile-animate-slide-up space-y-8" data-testid="profile-settings-panel">
                  {/* Account settings — every row here reflects a value the user
                     actually saved, and every one is editable via the same modal.
                     Vanity counters and social-channel badges deliberately live on
                     the profile header, not here: this tab is settings only. */}
                  <div className="profile-glass-card rounded-[3rem] p-10">
                    <div className="flex items-start justify-between gap-6 mb-8">
                      <div>
                        <h3 className="text-xl font-bold text-[#2D2A26] italic font-serif">Account settings</h3>
                        <p className="text-xs text-[#2D2A26]/40 mt-1">How Aura &amp; Earth behaves for you.</p>
                      </div>
                      <button
                        onClick={() => setShowEditModal(true)}
                        data-testid="profile-settings-edit"
                        className="flex-none px-5 py-3 rounded-2xl bg-[#2D2A26] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#4B695A] transition-all shadow-lg"
                      >
                        Change
                      </button>
                    </div>

                    <dl className="divide-y divide-black/[0.06]">
                      {[
                        { icon: Palette, tint: 'bg-sage-light text-sage', label: 'Appearance theme', value: settings?.theme || 'Light', capitalize: true },
                        { icon: Globe, tint: 'bg-[#8a94a6]/15 text-[#8a94a6]', label: 'Language', value: settings?.language || 'English' },
                        { icon: Clock, tint: 'bg-turmeric/15 text-ink', label: 'Timezone', value: settings?.timezone || 'IST' },
                        { icon: Mail, tint: 'bg-clay/15 text-clay', label: 'Newsletter', value: settings?.newsletterFrequency || 'Weekly' },
                        { icon: Eye, tint: 'bg-sage-light text-sage', label: 'Profile visibility', value: settings?.isPrivate ? 'Private' : 'Public' },
                        { icon: MessageSquare, tint: 'bg-[#8a94a6]/15 text-[#8a94a6]', label: 'Comments', value: settings?.allowComments === false ? 'Off' : 'On' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.tint}`}><row.icon size={18} /></div>
                            <dt className="text-sm font-bold text-ink">{row.label}</dt>
                          </div>
                          <dd className={`text-xs font-bold text-ink/50 ${row.capitalize ? 'capitalize' : ''}`}>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Enhanced Edit Profile Modal ───────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#2D2A26]/40 backdrop-blur-md profile-animate-slide-up" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="w-full max-w-2xl bg-white rounded-[3rem] p-12 relative shadow-2xl overflow-y-auto max-h-[90vh] profile-custom-scrollbar" role="dialog" aria-modal="true" aria-label="Edit profile and settings" data-testid="profile-edit-modal">
            <button onClick={() => setShowEditModal(false)} aria-label="Close" data-testid="profile-modal-close" className="absolute top-8 right-8 text-[#2D2A26]/30 hover:text-[#2D2A26]"><X size={24} /></button>

            <div className="mb-10 text-center">
              <p className="text-[10px] font-black text-[#3D5B4F] uppercase tracking-[0.3em] mb-2">Your profile</p>
              <h2 className="text-3xl font-bold text-[#2D2A26] font-serif">Edit profile</h2>
            </div>
            
            <div className="space-y-10">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => modalFileInputRef.current?.click()} className="relative w-32 h-32 rounded-3xl overflow-hidden cursor-pointer shadow-lg group border-2 border-dashed border-[#3D5B4F]/20 p-1">
                  <input ref={modalFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleModalFileChange} />
                  <img src={toAbsoluteUrl(previewPic) || "https://picsum.photos/seed/user/300/300"} className="w-full h-full object-cover rounded-2xl" alt="preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">{uploadingAvatar ? <span className="text-xs font-bold">Uploading…</span> : <Camera size={24} />}</div>
                </div>
                <p className="text-[10px] font-bold text-[#2D2A26]/30 uppercase tracking-widest">Update photo</p>
              </div>

              {/* Form Grid */}
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">First Name</label>
                  <input className="profile-edit-input" value={editForm.FirstName} onChange={(e) => handleEditChange('FirstName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Last Name</label>
                  <input className="profile-edit-input" value={editForm.LastName} onChange={(e) => handleEditChange('LastName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Location</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D5B4F]" size={14} />
                    <input className="profile-edit-input pl-10 pr-12" value={editForm.Location} placeholder="e.g. Mumbai, India" onChange={(e) => handleEditChange('Location', e.target.value)} />
                    <button 
                      onClick={handleDetectLocation}
                      disabled={locationLoading}
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#3D5B4F] hover:bg-[#3D5B4F]/10 rounded-lg transition-all active:scale-90 disabled:opacity-50"
                      title="Detect Location"
                    >
                      {locationLoading ? (
                        <div className="w-4 h-4 border-2 border-[#3D5B4F]/30 border-t-[#3D5B4F] rounded-full animate-spin" />
                      ) : (
                        <LocateFixed size={14} className="group-hover:rotate-12 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Skin Type</label>
                  <div className="relative">
                    <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D5B4F]" size={14} />
                    <select className="profile-edit-input pl-10 appearance-none cursor-pointer" value={editForm.SkinType} onChange={(e) => handleEditChange('SkinType', e.target.value)}>
                      <option value="Normal">Normal</option>
                      <option value="Dry">Dry</option>
                      <option value="Oily">Oily</option>
                      <option value="Combination">Combination</option>
                      <option value="Sensitive">Sensitive</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Primary Concern</label>
                  <div className="relative">
                    <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D5B4F]" size={14} />
                    <input className="profile-edit-input pl-10" value={editForm.SkinConcern} placeholder="e.g. Hydration" onChange={(e) => handleEditChange('SkinConcern', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Ritual Frequency</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D5B4F]" size={14} />
                    <select className="profile-edit-input pl-10 appearance-none cursor-pointer" value={editForm.RitualFrequency} onChange={(e) => handleEditChange('RitualFrequency', e.target.value)}>
                      <option value="Daily">Daily</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Bio</label>
                <textarea className="profile-edit-input min-h-[100px] resize-none" placeholder="Tell us a little about yourself…" value={editForm.Bio} onChange={(e) => handleEditChange('Bio', e.target.value)} />
              </div>

              <div className="border-t border-black/[0.03] pt-12">
                <div className="mb-10 text-center">
                  <p className="text-[10px] font-black text-[#3D5B4F] uppercase tracking-[0.3em] mb-2">Account &amp; preferences</p>
                  <h2 className="text-2xl font-bold text-[#2D2A26] font-serif">Settings</h2>
                </div>

                <div className="space-y-10">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Username</label>
                      <input className="profile-edit-input" placeholder="@yourhandle" value={editSettingsForm.username || ''} onChange={(e) => handleSettingsChange('username', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Cover Image</label>
                      {editSettingsForm.coverImage ? (
                        <div className="relative">
                          <img
                            src={toAbsoluteUrl(editSettingsForm.coverImage)}
                            alt=""
                            className="w-full h-24 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => handleSettingsChange('coverImage', '')}
                            className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className={`profile-edit-input flex items-center justify-center cursor-pointer ${uploadingCover ? 'opacity-60 cursor-wait' : ''}`}>
                          {uploadingCover ? 'Uploading…' : 'Upload cover from device'}
                          <input type="file" accept="image/*" disabled={uploadingCover} className="hidden" onChange={handleCoverFileChange} />
                        </label>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Account Theme</label>
                      <select className="profile-edit-input appearance-none" value={editSettingsForm.theme || 'light'} onChange={(e) => handleSettingsChange('theme', e.target.value)}>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="sepia">Sepia</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Language</label>
                      <select className="profile-edit-input appearance-none" value={editSettingsForm.language || 'English'} onChange={(e) => handleSettingsChange('language', e.target.value)}>
                        <option value="English">English</option>
                        <option value="French">French</option>
                        <option value="Spanish">Spanish</option>
                        <option value="German">German</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Timezone</label>
                      <select className="profile-edit-input appearance-none" value={editSettingsForm.timezone || 'IST'} onChange={(e) => handleSettingsChange('timezone', e.target.value)}>
                        <option value="IST">IST (India · GMT+5:30)</option>
                        <option value="UTC">UTC</option>
                        <option value="EST">EST</option>
                        <option value="PST">PST</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Newsletter</label>
                      <select className="profile-edit-input appearance-none" value={editSettingsForm.newsletterFrequency || 'Weekly'} onChange={(e) => handleSettingsChange('newsletterFrequency', e.target.value)}>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  {isAdmin && (
                  <div className="space-y-4">
                    <label className="text-[9px] font-black text-[#2D2A26]/40 uppercase tracking-widest ml-1">Social links</label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D5B4F]" size={14} />
                        <input className="profile-edit-input pl-10" placeholder="Instagram URL" value={editSettingsForm.socialLinks?.instagram || ''} onChange={(e) => handleSettingsChange('socialLinks.instagram', e.target.value)} />
                      </div>
                      <div className="relative">
                        <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3D5B4F]" size={14} />
                        <input className="profile-edit-input pl-10" placeholder="YouTube URL" value={editSettingsForm.socialLinks?.youtube || ''} onChange={(e) => handleSettingsChange('socialLinks.youtube', e.target.value)} />
                      </div>
                    </div>
                  </div>
                  )}

                  {isAdmin && (
                  <div className="grid grid-cols-2 gap-6">
                    <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl bg-[#F6F2EC] border border-black/[0.03]">
                      <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${editSettingsForm.isPrivate ? 'bg-[#3D5B4F]' : 'bg-black/10'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${editSettingsForm.isPrivate ? 'left-5' : 'left-1'}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={editSettingsForm.isPrivate || false} onChange={(e) => handleSettingsChange('isPrivate', e.target.checked)} />
                      <div>
                        <p className="text-[10px] font-bold text-[#2D2A26] uppercase tracking-widest">Private Account</p>
                        <p className="text-[8px] text-[#2D2A26]/30">Hide your profile from others</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl bg-[#F6F2EC] border border-black/[0.03]">
                      <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${editSettingsForm.allowComments ? 'bg-[#3D5B4F]' : 'bg-black/10'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${editSettingsForm.allowComments ? 'left-5' : 'left-1'}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={editSettingsForm.allowComments || false} onChange={(e) => handleSettingsChange('allowComments', e.target.checked)} />
                      <div>
                        <p className="text-[10px] font-bold text-[#2D2A26] uppercase tracking-widest">Allow Comments</p>
                        <p className="text-[8px] text-[#2D2A26]/30">Let others share their wisdom</p>
                      </div>
                    </label>
                  </div>
                  )}

                  <button
                    onClick={handleSaveAll} disabled={loading}
                    data-testid="profile-save-settings"
                    className={`w-full py-4 rounded-2xl font-semibold tracking-wide text-sm transition-all shadow-lg ${settingsSaveSuccess ? 'bg-sage-dark text-white' : 'bg-ink text-white hover:bg-sage-dark'}`}
                  >
                    {loading ? 'Saving…' : settingsSaveSuccess ? 'Saved ✓' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
