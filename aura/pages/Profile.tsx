import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AppDispatch, RootState } from "../store/store";
import { logoutUser, updateUserProfile, fetchUserProfile, fetchUserSettings, updateUserSettings } from "../store/user/user.action";
import { UpdateProfilePayload, UpdateSettingsPayload, UserSettings } from "../types";
import { uploadSingleImage, toAbsoluteUrl } from "../services/uploadImage";
import { getMyBookmarks } from "../services/engagement";
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
  Instagram,
  Youtube,
  Mail,
  Palette,
  Eye,
  MessageSquare,
} from "lucide-react";

/**
 * Aesthetic Profile Page - "Cream Sanctuary" 
 * Light theme with expanded personalization fields and dynamic data displays.
 */
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser, settings, loading } = useSelector((state: RootState) => state.user);
  const isAdmin = currentUser?.Role === "admin";
  const [activeTab, setActiveTab] = useState<"articles" | "ingredients" | "settings">("articles");
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

  // ── Saved (bookmarked) posts from the engagement API ──
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (currentUser) {
      setSavedLoading(true);
      getMyBookmarks()
        .then((posts) => active && setSavedPosts(posts))
        .catch(() => active && setSavedPosts([]))
        .finally(() => active && setSavedLoading(false));
    } else {
      setSavedPosts([]);
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
    }
  }, [dispatch, currentUser?.id, currentUser?._id]);

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
      alert(err?.message || "Image upload failed.");
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
      alert(err?.message || "Image upload failed.");
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
      alert(err?.message || "Image upload failed.");
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

  const handleSaveProfile = async () => {
    if (!currentUser) return;
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

    const result = await dispatch(updateUserProfile({
      userId: currentUser.id || currentUser._id!,
      profileData: payload,
    }));

    if (updateUserProfile.fulfilled.match(result)) {
      setSaveSuccess(true);
      setTimeout(() => {
        setShowEditModal(false);
        setSaveSuccess(false);
      }, 900);
    }
  };

  const handleSaveSettings = async () => {
    const userId = currentUser?.id || currentUser?._id;
    if (!userId) return;

    // Strip server-managed fields — the backend rejects unknown properties.
    const { id, _id, userId: _uid, createdAt, updatedAt, __v, ...settingsData } =
      editSettingsForm as any;

    const result = await dispatch(updateUserSettings({
      userId,
      settingsData,
    }));

    if (updateUserSettings.fulfilled.match(result)) {
      setSettingsSaveSuccess(true);
      setTimeout(() => {
        setShowEditModal(false);
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
    <div className="w-full py-20 flex flex-col items-center justify-center text-center animate-slide-up">
      <div className="w-24 h-24 rounded-full bg-[#6B8E7A]/10 flex items-center justify-center text-[#6B8E7A] mb-8 relative">
        <Icon size={40} className="relative z-10" />
        <div className="absolute inset-0 bg-[#6B8E7A]/10 blur-2xl rounded-full animate-pulse" />
      </div>
      <h3 className="text-2xl font-bold text-[#1a2e25] mb-3 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h3>
      <p className="text-[#1a2e25]/40 text-sm max-w-xs leading-relaxed mb-10 font-light px-4">
        {desc}
      </p>
      <button 
        onClick={onCta}
        className="px-8 py-4 rounded-2xl border border-[#6B8E7A] text-[#6B8E7A] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#6B8E7A] hover:text-white transition-all shadow-xl shadow-[#6B8E7A]/10"
      >
        {cta}
      </button>
    </div>
  );

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-[#fdfcfb] font-sans">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#6B8E7A]/10 blur-[100px] rounded-full animate-pulse" />
        </div>
        <div className="relative z-10 p-12 bg-white/40 backdrop-blur-2xl rounded-[3rem] border border-black/5 text-center max-w-md w-full mx-6 shadow-2xl">
          <div className="w-20 h-20 bg-[#6B8E7A]/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Sparkles className="w-10 h-10 text-[#6B8E7A]" />
          </div>
          <h2 className="text-3xl font-bold text-[#1a2e25] mb-4 italic" style={{ fontFamily: "'Playfair Display', serif" }}>Your Sanctuary Awaits</h2>
          <p className="text-[#1a2e25]/50 text-sm mb-10 leading-relaxed font-light">Please sign in to view your personalized rituals.</p>
          <button 
            onClick={() => navigate('/Login')}
            className="w-full py-5 bg-[#6B8E7A] text-white rounded-2xl font-bold tracking-[0.2em] text-xs hover:bg-[#5a7a68] transition-all shadow-xl shadow-[#6B8E7A]/20"
          >
            ENTER THE SANCTUARY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#fdfcfb] font-sans overflow-x-hidden pb-32">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-10px, -10px); }
          100% { transform: translate(0, 0); }
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 20px 40px -15px rgba(26, 46, 37, 0.05);
        }

        .animate-slide-up {
          animation: slideUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .blob {
          position: absolute;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.3;
          animation: float 20s ease-in-out infinite;
        }

        .edit-input {
          width: 100%;
          background: #fdfcfb;
          border: 1px solid rgba(26,46,37,0.06);
          border-radius: 1rem;
          padding: 0.85rem 1.1rem;
          color: #1a2e25;
          font-size: 0.85rem;
          outline: none;
          transition: all 0.3s;
        }

        .edit-input:focus {
          border-color: #6B8E7A;
          background: #fff;
          box-shadow: 0 4px 12px -2px rgba(107,142,122,0.1);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
      `}</style>

      {/* ── Background Elements ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="blob w-[600px] h-[600px] bg-[#6B8E7A]/10 top-[-100px] right-[-100px] rounded-full" />
        <div className="blob w-[500px] h-[500px] bg-[#E5DCC5]/20 bottom-[-100px] left-[-100px] rounded-full" style={{ animationDelay: "-5s" }} />
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative h-[45vh] w-full overflow-hidden">
        <img
          src={toAbsoluteUrl(settings?.coverImage) || Img6}
          alt="Botanical Muse"
          className={`w-full h-full object-cover transition-transform duration-[3000ms] ${isLoaded ? 'scale-100' : 'scale-110'}`} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#fdfcfb]/20 to-[#fdfcfb]" />
        
        <div className="absolute top-10 left-8 right-8 flex justify-between items-center z-20">
          <button onClick={() => navigate(-1)} className="p-4 rounded-full bg-white/40 backdrop-blur-xl border border-white/80 text-[#1a2e25] hover:bg-white/80 transition-all shadow-sm">
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex gap-3">
            <button className="p-4 rounded-full bg-white/40 backdrop-blur-xl border border-white/80 text-[#1a2e25] hover:bg-white/80 transition-all shadow-sm">
              <Bell size={18} />
            </button>
            <button onClick={() => setShowEditModal(true)} className="p-4 rounded-full bg-white/40 backdrop-blur-xl border border-white/80 text-[#1a2e25] hover:bg-[#6B8E7A] hover:text-white transition-all shadow-sm">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-10 animate-slide-up">
        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass-card rounded-[3.5rem] p-10 overflow-hidden relative">
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
                  <div className="absolute bottom-1 right-1 w-10 h-10 bg-[#6B8E7A] rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                    <Sparkles size={16} />
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold text-[#1a2e25] mb-2 italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {currentUser.FirstName} {currentUser.LastName}
                </h1>
                <p className="text-[#6B8E7A] text-[9px] font-black uppercase tracking-[0.4em] mb-4">Botanical Voyager</p>
                
                {currentUser.Bio && (
                  <p className="text-[#1a2e25]/60 text-sm italic mb-8 px-4 font-medium leading-relaxed">"{currentUser.Bio}"</p>
                )}

                <div className="w-full space-y-4 pt-6 border-t border-black/[0.03]">
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2 text-[#1a2e25]/30">
                      <MapPin size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Location</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#1a2e25]/80">{currentUser.Location || "Unmapped"}</span>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2 text-[#1a2e25]/30">
                      <Droplets size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Essence</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#6B8E7A]">{currentUser.SkinType || "Normal"}</span>
                  </div>
                </div>

                <div className="mt-10 flex gap-3 w-full">
                  <button onClick={() => setShowEditModal(true)} className="flex-1 py-4 rounded-2xl bg-[#1a2e25] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#2d4a3e] transition-all shadow-lg">
                    Edit Profile
                  </button>
                  <button 
                    onClick={() => { 
                      dispatch(logoutUser());
                      navigate('/Login'); 
                    }}
                    className="p-4 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-all border border-red-50"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Studio — visible only to admins */}
            {isAdmin && (
              <div className="glass-card rounded-[2.5rem] p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Shield size={14} className="text-[#6B8E7A]" />
                  <p className="text-[10px] font-black text-[#1a2e25]/40 uppercase tracking-[0.3em]">Admin Studio</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/admin/categories')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#6B8E7A]/10 text-[#1a2e25] text-sm font-bold hover:bg-[#6B8E7A]/20 transition-all"
                  >
                    <span className="flex items-center gap-2"><Leaf size={14} className="text-[#6B8E7A]" /> Manage Categories</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate('/admin/content-editor')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#6B8E7A]/10 text-[#1a2e25] text-sm font-bold hover:bg-[#6B8E7A]/20 transition-all"
                  >
                    <span className="flex items-center gap-2"><FileText size={14} className="text-[#6B8E7A]" /> Content Dashboard</span>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => navigate('/admin/story-editor')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#6B8E7A]/10 text-[#1a2e25] text-sm font-bold hover:bg-[#6B8E7A]/20 transition-all"
                  >
                    <span className="flex items-center gap-2"><Sparkles size={14} className="text-[#6B8E7A]" /> Story Editor</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="glass-card rounded-[2.5rem] p-8 flex justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#1a2e25]">{currentUser.SkinConcern || "None"}</p>
                <p className="text-[8px] font-black text-[#1a2e25]/30 uppercase tracking-widest mt-1">Primary Concern</p>
              </div>
              <div className="w-px h-10 bg-black/5" />
              <div className="text-center">
                <p className="text-2xl font-bold text-[#1a2e25]">{currentUser.RitualFrequency || "Daily"}</p>
                <p className="text-[8px] font-black text-[#1a2e25]/30 uppercase tracking-widest mt-1">Rituals</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
              <div className="relative p-2 bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white flex gap-1 shadow-sm overflow-hidden">
              <div
                className="absolute top-2 left-2 bottom-2 bg-[#6B8E7A] rounded-[1.8rem] transition-all duration-500 ease-out z-0"
                style={{
                  width: "calc(33.333% - 8px)",
                  transform: `translateX(${activeTab === 'articles' ? '0%' : activeTab === 'ingredients' ? '103%' : '206%'})`,
                }}
              />
              {['articles', 'ingredients', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`relative z-10 flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${activeTab === tab ? 'text-white' : 'text-[#1a2e25]/40 hover:text-[#1a2e25]/60'}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {tab === 'articles' && <BookOpen size={14} />}
                    {tab === 'ingredients' && <Leaf size={14} />}
                    {tab === 'settings' && <Settings size={14} />}
                    {tab === 'articles' ? 'Saved Wisdom' : tab === 'ingredients' ? 'Botanical Lab' : 'Settings'}
                  </span>
                </button>
              ))}
            </div>

            <div className="min-h-[500px]">
              {activeTab === 'articles' && (
                <div className="animate-slide-up">
                  {savedLoading ? (
                    <p className="text-center text-[#1a2e25]/40 text-sm py-16">Loading your saved rituals…</p>
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
                            className="group glass-card rounded-[3rem] p-6 cursor-pointer hover:shadow-2xl transition-all duration-500"
                          >
                            <div className="h-56 rounded-[2rem] overflow-hidden mb-6">
                              <img src={cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={article.title} />
                            </div>
                            <h4 className="text-xl font-bold text-[#1a2e25] mb-2 italic" style={{ fontFamily: "'Playfair Display', serif" }}>{article.title}</h4>
                            <p className="text-[#1a2e25]/40 text-xs mb-6 line-clamp-2">{article.subtitle || "A saved botanical ritual from your sanctuary."}</p>
                            <div className="flex justify-between items-center pt-4 border-t border-black/5 text-[9px] font-bold text-[#1a2e25]/30 uppercase tracking-widest">
                              <span className="flex items-center gap-2"><BookOpen size={10} /> Saved</span>
                              <span className="text-[#6B8E7A] flex items-center gap-1 group-hover:gap-2 transition-all">Read Ritual <ChevronRight size={10} /></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={BookOpen} title="No Saved Wisdom"
                      desc="Your collection of botanical knowledge is waiting to be started."
                      cta="Explore Sanctuary" onCta={() => navigate('/explore')}
                    />
                  )}
                </div>
              )}

              {activeTab === 'ingredients' && (
                <div className="animate-slide-up">
                  <EmptyState 
                    icon={Leaf} title="Lab Collections" 
                    desc="Discover ingredients in the lab to see them here." 
                    cta="Enter the Lab" onCta={() => navigate('/Lab')}
                  />
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="animate-slide-up space-y-8">
                  {/* Social Links Summary — publisher-only */}
                  {isAdmin && (
                  <div className="glass-card rounded-[3rem] p-10">
                    <h3 className="text-xl font-bold text-[#1a2e25] mb-8 italic" style={{ fontFamily: "'Playfair Display', serif" }}>Connected Channels</h3>
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        { icon: Instagram, label: 'Instagram', value: settings?.socialLinks?.instagram },
                        { icon: Youtube, label: 'YouTube', value: settings?.socialLinks?.youtube },
                      ].map((social) => (
                        <div key={social.label} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${social.value ? 'bg-[#6B8E7A]/5 border-[#6B8E7A]/20 text-[#6B8E7A]' : 'bg-black/[0.02] border-black/[0.05] text-[#1a2e25]/30'}`}>
                          <social.icon size={18} />
                          <div className="overflow-hidden">
                            <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">{social.label}</p>
                            <p className="text-xs font-bold truncate">{social.value || 'Not Linked'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Account Stats — publisher-only */}
                  {isAdmin && (
                  <div className="grid md:grid-cols-4 gap-6">
                    {[
                      { label: 'Followers', value: settings?.followersCount || 0 },
                      { label: 'Following', value: settings?.followingCount || 0 },
                      { label: 'Posts', value: settings?.postCount || 0 },
                      { label: 'Engagements', value: (settings?.totalLikes || 0) + (settings?.totalComments || 0) },
                    ].map((stat) => (
                      <div key={stat.label} className="glass-card rounded-3xl p-6 text-center">
                        <p className="text-2xl font-bold text-[#1a2e25]">{stat.value}</p>
                        <p className="text-[8px] font-black text-[#1a2e25]/30 uppercase tracking-[0.2em] mt-2">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  )}

                  {/* Preferences — visible to everyone */}
                  <div className="glass-card rounded-[3rem] p-10">
                    <h3 className="text-xl font-bold text-[#1a2e25] mb-8 italic" style={{ fontFamily: "'Playfair Display', serif" }}>Preferences</h3>
                    <div className="grid md:grid-cols-2 gap-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500"><Palette size={20} /></div>
                          <div>
                            <p className="text-sm font-bold text-[#1a2e25]">Appearance Theme</p>
                            <p className="text-xs text-[#1a2e25]/40 capitalize">{settings?.theme || 'Light'} Mode</p>
                          </div>
                        </div>
                        <Check className="text-[#6B8E7A]" size={20} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500"><Eye size={20} /></div>
                          <div>
                            <p className="text-sm font-bold text-[#1a2e25]">Privacy Status</p>
                            <p className="text-xs text-[#1a2e25]/40">{settings?.isPrivate ? 'Private Sanctuary' : 'Open Garden'}</p>
                          </div>
                        </div>
                        <Check className="text-[#6B8E7A]" size={20} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Enhanced Edit Profile Modal ───────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1a2e25]/40 backdrop-blur-md animate-slide-up" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="w-full max-w-2xl bg-white rounded-[3rem] p-12 relative shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <button onClick={() => setShowEditModal(false)} className="absolute top-8 right-8 text-[#1a2e25]/30 hover:text-[#1a2e25]"><X size={24} /></button>
            
            <div className="mb-10 text-center">
              <p className="text-[10px] font-black text-[#6B8E7A] uppercase tracking-[0.3em] mb-2">Sanctuary Settings</p>
              <h2 className="text-3xl font-bold text-[#1a2e25] italic" style={{ fontFamily: "'Playfair Display', serif" }}>Refine Your Essence</h2>
            </div>
            
            <div className="space-y-10">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => modalFileInputRef.current?.click()} className="relative w-32 h-32 rounded-3xl overflow-hidden cursor-pointer shadow-lg group border-2 border-dashed border-[#6B8E7A]/20 p-1">
                  <input ref={modalFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleModalFileChange} />
                  <img src={toAbsoluteUrl(previewPic) || "https://picsum.photos/seed/user/300/300"} className="w-full h-full object-cover rounded-2xl" alt="preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">{uploadingAvatar ? <span className="text-xs font-bold">Uploading…</span> : <Camera size={24} />}</div>
                </div>
                <p className="text-[10px] font-bold text-[#1a2e25]/30 uppercase tracking-widest">Update Essence Image</p>
              </div>

              {/* Form Grid */}
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">First Name</label>
                  <input className="edit-input" value={editForm.FirstName} onChange={(e) => handleEditChange('FirstName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Last Name</label>
                  <input className="edit-input" value={editForm.LastName} onChange={(e) => handleEditChange('LastName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Location</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B8E7A]" size={14} />
                    <input className="edit-input pl-10 pr-12" value={editForm.Location} placeholder="e.g. London, UK" onChange={(e) => handleEditChange('Location', e.target.value)} />
                    <button 
                      onClick={handleDetectLocation}
                      disabled={locationLoading}
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#6B8E7A] hover:bg-[#6B8E7A]/10 rounded-lg transition-all active:scale-90 disabled:opacity-50"
                      title="Detect Location"
                    >
                      {locationLoading ? (
                        <div className="w-4 h-4 border-2 border-[#6B8E7A]/30 border-t-[#6B8E7A] rounded-full animate-spin" />
                      ) : (
                        <LocateFixed size={14} className="group-hover:rotate-12 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Skin Type</label>
                  <div className="relative">
                    <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B8E7A]" size={14} />
                    <select className="edit-input pl-10 appearance-none cursor-pointer" value={editForm.SkinType} onChange={(e) => handleEditChange('SkinType', e.target.value)}>
                      <option value="Normal">Normal</option>
                      <option value="Dry">Dry</option>
                      <option value="Oily">Oily</option>
                      <option value="Combination">Combination</option>
                      <option value="Sensitive">Sensitive</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Primary Concern</label>
                  <div className="relative">
                    <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B8E7A]" size={14} />
                    <input className="edit-input pl-10" value={editForm.SkinConcern} placeholder="e.g. Hydration" onChange={(e) => handleEditChange('SkinConcern', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Ritual Frequency</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B8E7A]" size={14} />
                    <select className="edit-input pl-10 appearance-none cursor-pointer" value={editForm.RitualFrequency} onChange={(e) => handleEditChange('RitualFrequency', e.target.value)}>
                      <option value="Daily">Daily</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Your Botanical Bio</label>
                <textarea className="edit-input min-h-[100px] resize-none" placeholder="Share your essence..." value={editForm.Bio} onChange={(e) => handleEditChange('Bio', e.target.value)} />
              </div>

              <div className="border-t border-black/[0.03] pt-12">
                <div className="mb-10 text-center">
                  <p className="text-[10px] font-black text-[#6B8E7A] uppercase tracking-[0.3em] mb-2">Account & Social</p>
                  <h2 className="text-2xl font-bold text-[#1a2e25] italic" style={{ fontFamily: "'Playfair Display', serif" }}>Sanctuary Settings</h2>
                </div>

                <div className="space-y-10">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Username</label>
                      <input className="edit-input" placeholder="@botanical_muse" value={editSettingsForm.username || ''} onChange={(e) => handleSettingsChange('username', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Cover Image</label>
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
                        <label className={`edit-input flex items-center justify-center cursor-pointer ${uploadingCover ? 'opacity-60 cursor-wait' : ''}`}>
                          {uploadingCover ? 'Uploading…' : 'Upload cover from device'}
                          <input type="file" accept="image/*" disabled={uploadingCover} className="hidden" onChange={handleCoverFileChange} />
                        </label>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Account Theme</label>
                      <select className="edit-input appearance-none" value={editSettingsForm.theme || 'light'} onChange={(e) => handleSettingsChange('theme', e.target.value)}>
                        <option value="light">Light Sanctuary</option>
                        <option value="dark">Midnight Ritual</option>
                        <option value="sepia">Vintage Botanical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Language</label>
                      <select className="edit-input appearance-none" value={editSettingsForm.language || 'English'} onChange={(e) => handleSettingsChange('language', e.target.value)}>
                        <option value="English">English</option>
                        <option value="French">French</option>
                        <option value="Spanish">Spanish</option>
                        <option value="German">German</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Timezone</label>
                      <select className="edit-input appearance-none" value={editSettingsForm.timezone || 'UTC'} onChange={(e) => handleSettingsChange('timezone', e.target.value)}>
                        <option value="UTC">UTC</option>
                        <option value="EST">EST</option>
                        <option value="PST">PST</option>
                        <option value="IST">IST</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Newsletter</label>
                      <select className="edit-input appearance-none" value={editSettingsForm.newsletterFrequency || 'Weekly'} onChange={(e) => handleSettingsChange('newsletterFrequency', e.target.value)}>
                        <option value="Daily">Daily Rituals</option>
                        <option value="Weekly">Weekly Wisdom</option>
                        <option value="Monthly">Monthly Muse</option>
                      </select>
                    </div>
                  </div>

                  {isAdmin && (
                  <div className="space-y-4">
                    <label className="text-[9px] font-black text-[#1a2e25]/40 uppercase tracking-widest ml-1">Social Sanctuary Links</label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B8E7A]" size={14} />
                        <input className="edit-input pl-10" placeholder="Instagram URL" value={editSettingsForm.socialLinks?.instagram || ''} onChange={(e) => handleSettingsChange('socialLinks.instagram', e.target.value)} />
                      </div>
                      <div className="relative">
                        <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B8E7A]" size={14} />
                        <input className="edit-input pl-10" placeholder="YouTube URL" value={editSettingsForm.socialLinks?.youtube || ''} onChange={(e) => handleSettingsChange('socialLinks.youtube', e.target.value)} />
                      </div>
                    </div>
                  </div>
                  )}

                  {isAdmin && (
                  <div className="grid grid-cols-2 gap-6">
                    <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl bg-[#fdfcfb] border border-black/[0.03]">
                      <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${editSettingsForm.isPrivate ? 'bg-[#6B8E7A]' : 'bg-black/10'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${editSettingsForm.isPrivate ? 'left-5' : 'left-1'}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={editSettingsForm.isPrivate || false} onChange={(e) => handleSettingsChange('isPrivate', e.target.checked)} />
                      <div>
                        <p className="text-[10px] font-bold text-[#1a2e25] uppercase tracking-widest">Private Account</p>
                        <p className="text-[8px] text-[#1a2e25]/30">Hide your sanctuary from others</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl bg-[#fdfcfb] border border-black/[0.03]">
                      <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${editSettingsForm.allowComments ? 'bg-[#6B8E7A]' : 'bg-black/10'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${editSettingsForm.allowComments ? 'left-5' : 'left-1'}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={editSettingsForm.allowComments || false} onChange={(e) => handleSettingsChange('allowComments', e.target.checked)} />
                      <div>
                        <p className="text-[10px] font-bold text-[#1a2e25] uppercase tracking-widest">Allow Comments</p>
                        <p className="text-[8px] text-[#1a2e25]/30">Let others share their wisdom</p>
                      </div>
                    </label>
                  </div>
                  )}

                  <button 
                    onClick={handleSaveSettings} disabled={loading}
                    className={`w-full py-5 rounded-2xl font-bold tracking-widest text-[11px] uppercase transition-all shadow-xl ${settingsSaveSuccess ? 'bg-emerald-500 text-white' : 'bg-[#1a2e25] text-white hover:bg-[#2d4a3e]'}`}
                  >
                    {loading ? 'SYNCING UNIVERSE...' : settingsSaveSuccess ? 'SETTINGS HARMONIZED' : 'UPDATE SANCTUARY CONFIG'}
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
