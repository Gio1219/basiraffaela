"use client";

import { useState, useEffect, useRef } from "react";
import { Music, LogOut, FileAudio, Users, ArrowUpRight, Search, ChevronLeft, Camera, Trash2, Edit3, X, Upload, MessageSquare, Save, Download, Play, Pause, RotateCcw, RotateCw, Disc, ShieldCheck, AlertTriangle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Image from "next/image";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface Allievo {
  id: string;
  nome: string;
  cognome: string;
  password?: string | null;
  avatar_url?: string | null;
  corso?: string | null;
}

interface BaseMusicale {
  id: string;
  allievo_nome?: string;
  allievo_cognome?: string;
  titolo: string;
  artista?: string | null;
  tonalita?: string | null;
  file_url: string;
  commento?: string | null;
  created_at: string;
}

interface WarmupItem {
  id: string;
  titolo: string;
  artista?: string | null;
  tonalita?: string | null;
  file_url: string;
  corso_destinazione?: string | null;
  allievo_nome?: string | null;
  created_at: string;
}

export default function MaestraDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"warmup" | "allievi">("warmup");
  const [allievi, setAllievi] = useState<Allievo[]>([]);
  const [basi, setBasi] = useState<BaseMusicale[]>([]);
  const [warmupBasi, setWarmupBasi] = useState<WarmupItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAllievo, setSelectedAllievo] = useState<Allievo | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [isEditingAllievo, setIsEditingAllievo] = useState(false);
  const [editAllievoNome, setEditAllievoNome] = useState("");
  const [editAllievoCognome, setEditAllievoCognome] = useState("");
  const [editAllievoCorso, setEditAllievoCorso] = useState("");

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isConvertingYoutube, setIsConvertingYoutube] = useState(false);
  const [ytTitolo, setYtTitolo] = useState("");
  const [ytArtista, setYtArtista] = useState("");

  const [warmupTitolo, setWarmupTitolo] = useState("");
  const [warmupArtista, setWarmupArtista] = useState("M° Raffaela Carfora");
  const [warmupTonalita, setWarmupTonalita] = useState("");
  const [warmupCorsoDestinazione, setWarmupCorsoDestinazione] = useState("Tutti");
  const [warmupFile, setWarmupFile] = useState<File | null>(null);
  const [isUploadingWarmup, setIsUploadingWarmup] = useState(false);

  const [allievoWarmupTitolo, setAllievoWarmupTitolo] = useState("");
  const [allievoWarmupFile, setAllievoWarmupFile] = useState<File | null>(null);
  const [isUploadingAllievoWarmup, setIsUploadingAllievoWarmup] = useState(false);

  const [titoloBase, setTitoloBase] = useState("");
  const [artistaBase, setArtistaBase] = useState("");
  const [tonalitaBase, setTonalitaBase] = useState("Standard (0)");
  const [commentoBase, setCommentoBase] = useState("");
  const [fileBase, setFileBase] = useState<File | null>(null);
  const [isUploadingBase, setIsUploadingBase] = useState(false);

  const [commentiModificati, setCommentiModificati] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [audioDebugLog, setAudioDebugLog] = useState<string | null>(null);

  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const storedNome = localStorage.getItem("allievo_nome");
    const storedCognome = localStorage.getItem("allievo_cognome");
    const cookieAuth = document.cookie.includes("maestra_logged=true");
    
    const isRaffaela = 
      (storedNome && storedCognome && 
       storedNome.toLowerCase().trim() === "raffaela" && 
       storedCognome.toLowerCase().trim() === "carfora");

    if (!isRaffaela && !cookieAuth) {
      router.push("/");
      return;
    }

    localStorage.setItem("allievo_nome", "Raffaela");
    localStorage.setItem("allievo_cognome", "Carfora");
    document.cookie = "maestra_logged=true; path=/; max-age=31536000";

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [allieviRes, basiRes, warmupRes] = await Promise.all([
        supabase.from("allievi").select("*").order("cognome"),
        supabase.from("basi").select("*").order("created_at", { ascending: false }),
        supabase.from("warmup").select("*").order("created_at", { ascending: false })
      ]);

      const safeAllievi = allieviRes.data || [];
      setAllievi(safeAllievi);
      
      const raffaela = safeAllievi.find((a) => a.nome.toLowerCase() === "raffaela" && a.cognome.toLowerCase() === "carfora");
      if (raffaela?.avatar_url) setAvatarUrl(raffaela.avatar_url);

      const safeBasi = basiRes.data || [];
      setBasi(safeBasi);
      const initialComments: { [key: string]: string } = {};
      safeBasi.forEach((b) => { initialComments[b.id] = b.commento || ""; });
      setCommentiModificati(initialComments);

      setWarmupBasi(warmupRes.data || []);
    } catch (err) {
      console.error("Errore di caricamento dati:", err);
      showToast("Errore nel caricamento dei dati.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Funzione sicura per risolvere l'URL del file in tempo reale (evita link rotti)
  const resolveSafeAudioUrl = (url: string) => {
    if (!url) return "";
    // Se l'URL è già un link completo valido di Supabase o esterno, lo restituisce
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // Se nel database è rimasto salvato solo il percorso relativo, lo ricostruisce al volo
    const { data } = supabase.storage.from("basi").getPublicUrl(url);
    return data.publicUrl;
  };

  const handleUploadWarmup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warmupFile || !warmupTitolo.trim()) {
      showToast("Inserisci il titolo e seleziona un file audio.", "error");
      return;
    }

    setIsUploadingWarmup(true);
    try {
      const fileExt = warmupFile.name.split(".").pop()?.toLowerCase() || "mp3";
      const filePath = `warmup/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("basi").upload(filePath, warmupFile, { 
        upsert: true,
        contentType: 'audio/mpeg'
      });
      if (uploadError) throw uploadError;

      const newWarmup = {
        titolo: warmupTitolo.trim(),
        artista: warmupArtista.trim() || "M° Raffaela Carfora",
        tonalita: warmupTonalita.trim() || null,
        corso_destinazione: warmupCorsoDestinazione,
        allievo_nome: null,
        file_url: filePath, // Salviamo il percorso strutturato per massima sicurezza
      };

      const { data, error } = await supabase.from("warmup").insert([newWarmup]).select();
      if (error) throw error;

      if (data) {
        setWarmupBasi([data[0], ...warmupBasi]);
        setWarmupTitolo("");
        setWarmupTonalita("");
        setWarmupCorsoDestinazione("Tutti");
        setWarmupFile(null);
        showToast("Esercizio di riscaldamento caricato con successo!");
      }
    } catch (err: any) {
      showToast("Errore caricamento warm-up: " + err.message, "error");
    } finally {
      setIsUploadingWarmup(false);
    }
  };

  const handleUploadAllievoWarmup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allievoWarmupFile || !allievoWarmupTitolo.trim() || !selectedAllievo) {
      showToast("Inserisci titolo e file audio per l'allievo.", "error");
      return;
    }

    setIsUploadingAllievoWarmup(true);
    try {
      const fileExt = allievoWarmupFile.name.split(".").pop()?.toLowerCase() || "mp3";
      const cartellaAllievo = `${selectedAllievo.cognome.toLowerCase().trim()}_${selectedAllievo.nome.toLowerCase().trim()}`;
      const filePath = `warmup/allievi/${cartellaAllievo}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from("basi").upload(filePath, allievoWarmupFile, { 
        upsert: true,
        contentType: 'audio/mpeg'
      });
      if (uploadError) throw uploadError;

      const newWarmup = {
        titolo: allievoWarmupTitolo.trim(),
        artista: "M° Raffaela Carfora",
        tonalita: null,
        corso_destinazione: null,
        allievo_nome: selectedAllievo.nome,
        file_url: filePath,
      };

      const { data, error } = await supabase.from("warmup").insert([newWarmup]).select();
      if (error) throw error;

      if (data) {
        setWarmupBasi([data[0], ...warmupBasi]);
        setAllievoWarmupTitolo("");
        setAllievoWarmupFile(null);
        showToast(`Warm-up assegnato a ${selectedAllievo.nome} con successo!`);
      }
    } catch (err: any) {
      showToast("Errore caricamento warm-up allievo: " + err.message, "error");
    } finally {
      setIsUploadingAllievoWarmup(false);
    }
  };

  const handleDeleteWarmup = async (id: string) => {
    if (!confirm("Vuoi eliminare questo esercizio di riscaldamento?")) return;
    if (activeAudioId === id && audioRef.current) {
      audioRef.current.pause();
      setActiveAudioId(null);
      setIsPlaying(false);
    }
    await supabase.from("warmup").delete().eq("id", id);
    setWarmupBasi(warmupBasi.filter(w => w.id !== id));
    showToast("Esercizio eliminato.");
  };

  const handleYoutubeImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || !selectedAllievo) return;

    setIsConvertingYoutube(true);
    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Errore conversione YouTube');

      const nuovaBaseRecord = {
        allievo_nome: selectedAllievo.nome,
        allievo_cognome: selectedAllievo.cognome,
        titolo: ytTitolo.trim() || data.titolo,
        artista: ytArtista.trim() || data.artista,
        tonalita: tonalitaBase,
        commento: commentoBase.trim() || null,
        file_url: data.file_url,
      };

      const { data: inserted, error } = await supabase.from("basi").insert([nuovaBaseRecord]).select();
      if (error) throw error;

      if (inserted) {
        setBasi([inserted[0], ...basi]);
        setYoutubeUrl("");
        setYtTitolo("");
        setYtArtista("");
        setCommentoBase("");
        showToast("Brano importato da YouTube con successo!");
      }
    } catch (err: any) {
      showToast("Errore importazione: " + err.message, "error");
    } finally {
      setIsConvertingYoutube(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const avatarFile = e.target.files?.[0];
    if (!avatarFile) return;
    setIsUploadingAvatar(true);
    try {
      const filePath = `Raffaela_Carfora/avatar-${Date.now()}.${avatarFile.name.split(".").pop()}`;
      await supabase.storage.from("avatars").upload(filePath, avatarFile, { upsert: true });
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const newAvatarUrl = publicUrlData.publicUrl;

      let raffaelaRecord = allievi.find((a) => a.nome.toLowerCase() === "raffaela" && a.cognome.toLowerCase() === "carfora");
      if (raffaelaRecord) {
        await supabase.from("allievi").update({ avatar_url: newAvatarUrl }).eq("id", raffaelaRecord.id);
      } else {
        const { data: newRec } = await supabase.from("allievi").insert([{ nome: "Raffaela", cognome: "Carfora", avatar_url: newAvatarUrl }]).select();
        if (newRec) setAllievi([...allievi, newRec[0]]);
      }
      setAvatarUrl(newAvatarUrl);
      showToast("Foto profilo salvata!");
    } catch (err: any) {
      showToast("Errore: " + err.message, "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAllievoInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllievo) return;

    const updatedData = {
      nome: editAllievoNome.trim(),
      cognome: editAllievoCognome.trim(),
      corso: editAllievoCorso.trim() || null,
    };

    const { error } = await supabase.from("allievi").update(updatedData).eq("id", selectedAllievo.id);
    if (error) {
      showToast("Errore aggiornamento allievo: " + error.message, "error");
      return;
    }

    const updatedAllievoObj = { ...selectedAllievo, ...updatedData };
    setSelectedAllievo(updatedAllievoObj);
    setAllievi(allievi.map((a) => (a.id === selectedAllievo.id ? updatedAllievoObj : a)));
    setIsEditingAllievo(false);
    showToast("Informazioni aggiornate!");
  };

  const handleUploadBaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileBase || !selectedAllievo || !titoloBase.trim()) return;

    setIsUploadingBase(true);
    try {
      const fileExt = fileBase.name.split(".").pop()?.toLowerCase() || "mp3";
      const cartellaAllieva = `${selectedAllievo.cognome.toLowerCase().trim()}_${selectedAllievo.nome.toLowerCase().trim()}`;
      const filePath = `basi_audio/${cartellaAllieva}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from("basi").upload(filePath, fileBase, { 
        upsert: true,
        contentType: 'audio/mpeg'
      });
      if (uploadError) throw uploadError;

      const nuovaBaseRecord = {
        allievo_nome: selectedAllievo.nome,
        allievo_cognome: selectedAllievo.cognome,
        titolo: titoloBase.trim(),
        artista: artistaBase.trim() || "Autore non specificato",
        tonalita: tonalitaBase,
        commento: commentoBase.trim() || null,
        file_url: filePath, // Salvato in modo sicuro per evitare rotture future dei link
      };

      const { data, error } = await supabase.from("basi").insert([nuovaBaseRecord]).select();
      if (error) throw error;

      if (data) {
        setBasi([data[0], ...basi]);
        setTitoloBase("");
        setArtistaBase("");
        setCommentoBase("");
        setFileBase(null);
        showToast("Base caricata nella cartella dell'allieva con successo!");
      }
    } catch (err: any) {
      showToast("Errore: " + err.message, "error");
    } finally {
      setIsUploadingBase(false);
    }
  };

  const handleDeleteBase = async (id: string) => {
    if (!confirm("Vuoi davvero eliminare questa base?")) return;
    if (activeAudioId === id) {
      if (audioRef.current) audioRef.current.pause();
      setActiveAudioId(null);
      setIsPlaying(false);
    }
    await supabase.from("basi").delete().eq("id", id);
    setBasi(basi.filter((b) => b.id !== id));
    showToast("Base eliminata.");
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const resolvedUrl = resolveSafeAudioUrl(url);
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'base-musicale';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast("Download avviato!");
    } catch (err) {
      window.open(resolveSafeAudioUrl(url), '_blank');
    }
  };

  const togglePlayTrack = (id: string, url: string) => {
    setAudioDebugLog(null);

    if (activeAudioId === id && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch((err) => {
          const errMsg = `Errore Play (Ripresa): ${err.message || err}`;
          setAudioDebugLog(errMsg);
          showToast(errMsg, "error");
        });
        setIsPlaying(true);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const resolvedUrl = resolveSafeAudioUrl(url);
    const safeUrl = encodeURI(resolvedUrl.trim());
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = safeUrl;
    audio.playbackRate = playbackRate;
    audioRef.current = audio;
    
    setActiveAudioId(id);

    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.onended = () => { 
      setIsPlaying(false); 
      setCurrentTime(0); 
    };

    audio.onerror = (e) => {
      const target = audio;
      let errorDetails = "Errore sconosciuto";
      if (target && target.error) {
        switch (target.error.code) {
          case 1: errorDetails = "MEDIA_ERR_ABORTED (Caricamento interrotto)"; break;
          case 2: errorDetails = "MEDIA_ERR_NETWORK (Errore di rete o file non raggiungibile su Supabase)"; break;
          case 3: errorDetails = "MEDIA_ERR_DECODE (File audio corrotto o codec non supportato dal browser)"; break;
          case 4: errorDetails = "MEDIA_ERR_SRC_NOT_SUPPORTED (Formato non supportato o URL non valido)"; break;
        }
      }
      const fullLog = `[Log Audio ID: ${id}] Codice ${target?.error?.code || 'N/A'}: ${errorDetails} | URL: ${resolvedUrl}`;
      console.error(fullLog);
      setAudioDebugLog(fullLog);
      showToast("Errore riproduzione: " + errorDetails, "error");
      setIsPlaying(false);
      setActiveAudioId(null);
    };

    audio.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        const catchLog = `Errore Avvio (Autoplay/Codec): ${err.message || err}`;
        console.error(catchLog);
        setAudioDebugLog(catchLog);
        showToast("Impossibile riprodurre l'audio. Controlla il log.", "error");
        setIsPlaying(false);
        setActiveAudioId(null);
      });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSaveComment = async (id: string) => {
    const nuovoCommento = commentiModificati[id] || "";
    const { error } = await supabase.from("basi").update({ commento: nuovoCommento.trim() || null }).eq("id", id);
    if (error) {
      showToast("Errore salvataggio commento: " + error.message, "error");
      return;
    }
    setBasi(basi.map((b) => (b.id === id ? { ...b, commento: nuovoCommento } : b)));
    showToast("Commento aggiornato!");
  };

  const handleUpdateCorso = async (allievoId: string, nuovoCorso: string) => {
    const { error } = await supabase.from("allievi").update({ corso: nuovoCorso }).eq("id", allievoId);
    if (error) {
      showToast("Errore aggiornamento corso: " + error.message, "error");
      return;
    }
    setAllievi(allievi.map((a) => (a.id === allievoId ? { ...a, corso: nuovoCorso } : a)));
    if (selectedAllievo) setSelectedAllievo({ ...selectedAllievo, corso: nuovoCorso });
    showToast("Livello corso aggiornato!");
  };

  const handleLogout = () => { 
    localStorage.removeItem("allievo_nome");
    localStorage.removeItem("allievo_cognome");
    document.cookie = "maestra_logged=; path=/; max-age=0";
    router.push("/"); 
  };

  const getCardStyle = (tipoModifica?: string | null, corso?: string | null) => {
    switch (corso) {
      case "Avanzato": return "bg-amber-100 text-amber-800 border-amber-200";
      case "Professional": return "bg-purple-100 text-purple-800 border-purple-200";
      case "Base": return "bg-teal-100 text-teal-800 border-teal-200";
      default: return "bg-white text-stone-900 border-stone-200";
    }
  };

  const filteredAllievi = allievi.filter(
    (a) => (a.nome.toLowerCase() !== "raffaela" || a.cognome.toLowerCase() !== "carfora") &&
      (a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || a.cognome.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#FCFBF9] text-stone-900 flex flex-col selection:bg-[#7A2238] selection:text-white relative">
      <header className="border-b border-stone-200/80 bg-[#FCFBF9]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-16 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm border border-stone-200/80 shrink-0">
            <Image src="/logo-2.png" alt="Logo" fill sizes="64px" className="object-contain p-1" />
          </div>
          <div>
            <h1 className="text-[10px] sm:text-xs font-semibold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900">
              Nuova Accademia Toscanini
            </h1>
            <p className="text-[9px] sm:text-[10px] tracking-widest sm:tracking-[0.15em] text-[#7A2238] uppercase font-medium">
              Canto Moderno · M° Raffaela Carfora
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 bg-stone-200/60 p-1 rounded-2xl">
          <button
            onClick={() => { setActiveTab("warmup"); setSelectedAllievo(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "warmup" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Warm-up</span>
          </button>
          <button
            onClick={() => setActiveTab("allievi")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "allievi" || selectedAllievo ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Allievi ({filteredAllievi.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-white border border-stone-200/80 rounded-full py-1 pl-2.5 pr-3.5 sm:py-1.5 sm:pl-3 sm:pr-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <label className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-stone-300 text-stone-800 font-semibold text-xs flex items-center justify-center cursor-pointer group shadow-inner shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profilo" fill sizes="36px" className="object-cover" />
              ) : (
                <Image src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=srgb&fm=jpg" alt="Profilo" fill sizes="36px" className="object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                <Camera className="w-4 h-4" />
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>

            <div className="text-left">
              <p className="text-xs font-medium text-stone-900 leading-none">Raffaela Carfora</p>
              <p className="text-[10px] text-stone-400 tracking-wider uppercase mt-0.5">Insegnante</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-stone-200/80 bg-white hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-stone-600 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
            title="Esci"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-12 space-y-10 pb-32">
        
        {audioDebugLog && (
          <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h5 className="text-xs font-bold uppercase tracking-wider text-red-800">Diagnostica Log Audio (Errore Rilevato)</h5>
              <p className="text-xs font-mono bg-white/80 p-2.5 rounded-xl border border-red-200/60 break-all">{audioDebugLog}</p>
              <p className="text-[11px] text-red-700 pt-0.5">💡 Consiglio: Le ultime basi caricate potrebbero non essere in formato MP3 standard (es. file m4a o webm). Ti consigliamo di convertirle in MP3 prima di ricaricarle.</p>
            </div>
            <button onClick={() => setAudioDebugLog(null)} className="text-red-400 hover:text-red-700 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex md:hidden items-center gap-1 bg-stone-200/60 p-1 rounded-2xl w-full overflow-x-auto">
          <button
            onClick={() => { setActiveTab("warmup"); setSelectedAllievo(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-medium transition-all ${
              activeTab === "warmup" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Warm-up</span>
          </button>
          <button
            onClick={() => setActiveTab("allievi")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] font-medium transition-all ${
              activeTab === "allievi" || selectedAllievo ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Allievi</span>
          </button>
        </div>

        {activeTab === "warmup" && !selectedAllievo && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-[#7A2238] uppercase">Gestione Didattica</span>
                <h2 className="text-3xl lg:text-4xl font-serif text-stone-900 tracking-tight mt-1">
                  Esercizi di <span className="italic font-light">Riscaldamento Vocale</span>
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
                <ShieldCheck className="w-4 h-4 text-[#7A2238]" />
                <span>© 2026 M° Raffaela Carfora (Streaming protetto - No Download)</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-xs font-bold tracking-widest text-[#7A2238] uppercase flex items-center gap-2">
                <Upload className="w-4 h-4" /> Carica Nuovo Esercizio Warm-up & Filtra Corso
              </h3>
              <form onSubmit={handleUploadWarmup} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Titolo Esercizio</label>
                  <input
                    type="text" value={warmupTitolo} onChange={(e) => setWarmupTitolo(e.target.value)}
                    placeholder="es. Riscaldamento Legato" required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Tonalità</label>
                  <input
                    type="text" value={warmupTonalita} onChange={(e) => setWarmupTonalita(e.target.value)}
                    placeholder="es. C Major"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Corso di Destinazione</label>
                  <select
                    value={warmupCorsoDestinazione} onChange={(e) => setWarmupCorsoDestinazione(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs font-semibold focus:outline-none"
                  >
                    <option value="Tutti">Per Tutti</option>
                    <option value="Base">Solo per Corso Base</option>
                    <option value="Avanzato">Solo per Corso Avanzato</option>
                    <option value="Professional">Solo per Pro</option>
                    <option value="Avanzato e Pro">Avanzato e Pro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">File Audio (MP3/WAV)</label>
                  <input
                    type="file" accept="audio/*" onChange={(e) => setWarmupFile(e.target.files?.[0] || null)} required
                    className="w-full text-xs text-stone-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7A2238]/10 file:text-[#7A2238] cursor-pointer"
                  />
                </div>

                <button
                  type="submit" disabled={isUploadingWarmup}
                  className="py-3 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isUploadingWarmup ? "Caricamento..." : "Carica Warm-up"}
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-widest text-stone-500 uppercase">Esercizi Attivi ({warmupBasi.length})</h3>
              {warmupBasi.length === 0 ? (
                <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center space-y-3 shadow-sm">
                  <Music className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-stone-800 font-medium text-sm">Nessun esercizio di riscaldamento caricato</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {warmupBasi.map((item) => {
                    const isThisActive = activeAudioId === item.id;
                    return (
                      <div key={item.id} className="bg-white rounded-2xl border border-stone-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#7A2238]/10 text-[#7A2238] flex items-center justify-center shrink-0">
                            <FileAudio className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif text-base text-stone-900 font-medium">{item.titolo}</h4>
                              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-[#7A2238] text-[9px] font-bold uppercase tracking-wider border border-stone-200">
                                {item.allievo_nome ? `Assegnato a: ${item.allievo_nome}` : (item.corso_destinazione || "Tutti")}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">{item.artista} {item.tonalita ? `· ${item.tonalita}` : ''}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => togglePlayTrack(item.id, item.file_url)}
                            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                              isThisActive && isPlaying ? 'bg-amber-600 text-white' : 'bg-[#7A2238] text-white hover:bg-[#651c2e]'
                            }`}
                          >
                            {isThisActive && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{isThisActive && isPlaying ? "Pausa" : "Ascolta"}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteWarmup(item.id)}
                            className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 cursor-pointer"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "allievi" && !selectedAllievo && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-[#7A2238] uppercase">Gestione Allievi</span>
                <h2 className="text-3xl lg:text-4xl font-serif text-stone-900 tracking-tight mt-1">
                  Archivio <span className="italic font-light">allievi e corsi</span>
                </h2>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-stone-400" />
                <input
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca allievo..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 text-xs transition-all shadow-xs"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-stone-400 text-sm">Caricamento allievi...</div>
            ) : filteredAllievi.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center space-y-3 shadow-sm">
                <Users className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-stone-800 font-medium text-sm">Nessun allievo trovato</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAllievi.map((allievo) => {
                  const basiAllievo = basi.filter(
                    (b) =>
                      b.allievo_nome?.toLowerCase() === allievo.nome.toLowerCase() &&
                      b.allievo_cognome?.toLowerCase() === allievo.cognome.toLowerCase()
                  );
                  const badgeStyle = getCardStyle("normale", allievo.corso || "Base");

                  return (
                    <div
                      key={allievo.id}
                      onClick={() => {
                        setSelectedAllievo(allievo);
                        setEditAllievoNome(allievo.nome);
                        setEditAllievoCognome(allievo.cognome);
                        setEditAllievoCorso(allievo.corso || "");
                        setIsEditingAllievo(false);
                      }}
                      className="bg-white rounded-2xl border border-stone-200/80 p-5 flex items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-[#7A2238]/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-200 text-stone-700 font-semibold text-xs flex items-center justify-center shrink-0 shadow-inner">
                          {allievo.avatar_url ? (
                            <img src={allievo.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span>{allievo.nome.charAt(0)}{allievo.cognome.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-serif text-base text-stone-900 font-medium group-hover:text-[#7A2238] transition-colors">
                            {allievo.nome} {allievo.cognome}
                          </h4>
                          {allievo.corso && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                                {allievo.corso}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold text-stone-800">{basiAllievo.length}</span>
                          <p className="text-[9px] text-stone-400 uppercase tracking-widest">Basi</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-stone-50 group-hover:bg-[#7A2238] group-hover:text-white text-stone-400 flex items-center justify-center transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedAllievo && (
          <div className="space-y-6">
            <button
              onClick={() => { setSelectedAllievo(null); setIsEditingAllievo(false); }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-[#7A2238] transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-stone-200/80 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Torna all'elenco allievi</span>
            </button>

            <div className="bg-white rounded-3xl border border-stone-200/80 p-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row w-full">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-200 text-stone-800 font-semibold text-lg flex items-center justify-center shrink-0 shadow-md">
                    {selectedAllievo.avatar_url ? (
                      <img src={selectedAllievo.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{selectedAllievo.nome.charAt(0)}{selectedAllievo.cognome.charAt(0)}</span>
                    )}
                  </div>
                  
                  {isEditingAllievo ? (
                    <form onSubmit={handleSaveAllievoInfo} className="space-y-3 w-full flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Nome</label>
                          <input type="text" value={editAllievoNome} onChange={(e) => setEditAllievoNome(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Cognome</label>
                          <input type="text" value={editAllievoCognome} onChange={(e) => setEditAllievoCognome(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Corso</label>
                        <input type="text" value={editAllievoCorso} onChange={(e) => setEditAllievoCorso(e.target.value)} placeholder="es. Base, Avanzato..." className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button type="submit" className="px-4 py-2 bg-[#7A2238] text-white text-xs font-medium rounded-xl hover:bg-[#651c2e] cursor-pointer">Salva Modifiche</button>
                        <button type="button" onClick={() => setIsEditingAllievo(false)} className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-medium rounded-xl hover:bg-stone-50 cursor-pointer">Annulla</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold tracking-[0.2em] text-[#7A2238] uppercase">Profilo Allievo</span>
                        <button onClick={() => setIsEditingAllievo(true)} className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-[#7A2238] bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer">
                          <Edit3 className="w-3 h-3" /> Modifica Info
                        </button>
                      </div>
                      <h3 className="text-3xl font-serif text-stone-900 tracking-tight">
                        {selectedAllievo.nome} {selectedAllievo.cognome}
                      </h3>
                      {selectedAllievo.corso && (
                        <p className="text-xs text-stone-500 font-medium pt-0.5 uppercase tracking-wider">Corso: {selectedAllievo.corso}</p>
                      )}
                    </div>
                  )}
                </div>

                {!isEditingAllievo && (
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 w-full md:w-auto space-y-2 shrink-0">
                    <label className="text-[10px] font-bold tracking-widest text-stone-600 uppercase block text-center md:text-left">Livello Corso</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUpdateCorso(selectedAllievo.id, "Base")} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${selectedAllievo.corso === "Base" ? "bg-teal-700 text-white shadow-sm" : "bg-teal-50 text-teal-800 border border-teal-200"}`}>Base</button>
                      <button onClick={() => handleUpdateCorso(selectedAllievo.id, "Avanzato")} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${selectedAllievo.corso === "Avanzato" ? "bg-amber-700 text-white shadow-sm" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>Avanzato</button>
                      <button onClick={() => handleUpdateCorso(selectedAllievo.id, "Professional")} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${selectedAllievo.corso === "Professional" ? "bg-purple-700 text-white shadow-sm" : "bg-purple-50 text-purple-800 border border-purple-200"}`}>Professional</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-bold tracking-widest text-[#7A2238] uppercase flex items-center gap-2">
                <Music className="w-4 h-4" /> Assegna Warm-up Specifico a {selectedAllievo.nome}
              </h4>
              <form onSubmit={handleUploadAllievoWarmup} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Titolo Esercizio</label>
                  <input
                    type="text" value={allievoWarmupTitolo} onChange={(e) => setAllievoWarmupTitolo(e.target.value)}
                    placeholder="es. Riscaldamento Personalizzato" required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">File Audio (MP3/WAV)</label>
                  <input
                    type="file" accept="audio/*" onChange={(e) => setAllievoWarmupFile(e.target.files?.[0] || null)} required
                    className="w-full text-xs text-stone-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7A2238]/10 file:text-[#7A2238] cursor-pointer"
                  />
                </div>
                <button
                  type="submit" disabled={isUploadingAllievoWarmup}
                  className="py-3 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isUploadingAllievoWarmup ? "Caricamento..." : "Assegna Warm-up all'allievo"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-bold tracking-widest text-[#7A2238] uppercase flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube Downloader & Convertitore MP3 per {selectedAllievo.nome}
              </h4>
              <form onSubmit={handleYoutubeImport} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Link YouTube</label>
                    <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Titolo Brano</label>
                    <input type="text" value={ytTitolo} onChange={(e) => setYtTitolo(e.target.value)} placeholder="es. E poi" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Artista</label>
                    <input type="text" value={ytArtista} onChange={(e) => setYtArtista(e.target.value)} placeholder="es. Giorgia" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Tonalità</label>
                    <input type="text" value={tonalitaBase} onChange={(e) => setTonalitaBase(e.target.value)} placeholder="es. A major, -1" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                  </div>
                </div>
                <button type="submit" disabled={isConvertingYoutube} className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50">
                  <span>{isConvertingYoutube ? "Estrazione ed elaborazione audio..." : "Estrai MP3 da YouTube e Assegna"}</span>
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-bold tracking-widest text-[#7A2238] uppercase flex items-center gap-2">
                <Upload className="w-4 h-4" /> Carica Nuova Base Musicale & Commento (Cartella Dedicata all'Allieva)
              </h4>
              <form onSubmit={handleUploadBaseSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Titolo Brano</label>
                    <input type="text" value={titoloBase} onChange={(e) => setTitoloBase(e.target.value)} placeholder="es. Brano" required className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Artista</label>
                    <input type="text" value={artistaBase} onChange={(e) => setArtistaBase(e.target.value)} placeholder="es. Autore" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Tonalità</label>
                    <input type="text" value={tonalitaBase} onChange={(e) => setTonalitaBase(e.target.value)} placeholder="es. A major, -1" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Commento / Note per l'allievo</label>
                  <textarea value={commentoBase} onChange={(e) => setCommentoBase(e.target.value)} placeholder="es. Lavora di più sull'intonazione..." rows={2} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">File Audio (MP3, WAV)</label>
                    <input type="file" accept="audio/*,.pdf" onChange={(e) => setFileBase(e.target.files?.[0] || null)} required className="w-full text-xs text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7A2238]/10 file:text-[#7A2238] cursor-pointer" />
                  </div>
                  <button type="submit" disabled={isUploadingBase} className="py-3 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50">
                    {isUploadingBase ? "Caricamento in cartella..." : "Carica Base & Commento"}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold tracking-widest text-stone-500 uppercase">Basi caricate da {selectedAllievo.nome}</h4>
              {(() => {
                const basiAllievo = basi.filter(
                  (b) => b.allievo_nome?.toLowerCase() === selectedAllievo.nome.toLowerCase() && b.allievo_cognome?.toLowerCase() === selectedAllievo.cognome.toLowerCase()
                );

                if (basiAllievo.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center space-y-3 shadow-sm">
                      <Music className="w-8 h-8 text-stone-300 mx-auto" />
                      <p className="text-stone-800 font-medium text-sm">Nessuna base caricata da {selectedAllievo.nome}</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-4">
                    {basiAllievo.map((item) => {
                      const isThisActive = activeAudioId === item.id;
                      return (
                        <div key={item.id} className="bg-white rounded-2xl border border-stone-200/80 p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-[#7A2238]/10 text-[#7A2238] flex items-center justify-center shrink-0">
                                <FileAudio className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-serif text-lg text-stone-900 font-medium leading-snug">
                                  {item.titolo} <span className="font-sans text-xs text-stone-500">di {item.artista}</span>
                                </h4>
                                {item.tonalita && (<p className="text-xs text-stone-500 mt-0.5">Tonalità: {item.tonalita}</p>)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => togglePlayTrack(item.id, item.file_url)}
                                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs ${
                                  isThisActive && isPlaying ? 'bg-amber-600 text-white' : 'bg-[#7A2238] text-white hover:bg-[#651c2e]'
                                }`}
                              >
                                {isThisActive && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                <span>{isThisActive && isPlaying ? "Pausa" : "Ascolta"}</span>
                              </button>
                              <button onClick={() => handleDownload(item.file_url, `${item.titolo}_${item.artista}`)} className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#7A2238] text-white text-xs font-medium hover:bg-[#651c2e] cursor-pointer">
                                <Download className="w-3.5 h-3.5" />
                                <span>Scarica</span>
                              </button>
                              <button onClick={() => handleDeleteBase(item.id)} className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Elimina</span>
                              </button>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-stone-100 space-y-2">
                            <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3 text-[#7A2238]" /> Commento / Note per l'allievo
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentiModificati[item.id] !== undefined ? commentiModificati[item.id] : (item.commento || "")}
                                onChange={(e) => setCommentiModificati({ ...commentiModificati, [item.id]: e.target.value })}
                                placeholder="Scrivi un commento..."
                                className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-xs focus:outline-none focus:bg-white"
                              />
                              <button onClick={() => handleSaveComment(item.id)} className="flex items-center gap-1 px-4 py-2 bg-[#7A2238] hover:bg-[#651c2e] text-white text-xs font-medium rounded-xl cursor-pointer">
                                <Save className="w-3.5 h-3.5" />
                                <span>Salva Nota</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </main>

      {activeAudioId && (() => {
        const activeTrack = [...basi, ...warmupBasi].find(b => b.id === activeAudioId);
        if (!activeTrack) return null;
        return (
          <div className="fixed bottom-6 right-6 z-50 bg-white border border-stone-200 shadow-2xl rounded-2xl p-4 w-80 sm:w-96 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-widest text-[#7A2238] uppercase">
                {activeTrack.allievo_nome ? `Allievo: ${activeTrack.allievo_nome}` : "Warm-up Vocale © 2026 Raffaela Carfora"}
              </span>
              <button onClick={() => { if(audioRef.current) audioRef.current.pause(); setActiveAudioId(null); setIsPlaying(false); }} className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#7A2238]/10 text-[#7A2238] flex items-center justify-center shrink-0">
                <Disc className="w-5 h-5 animate-spin" />
              </div>
              <div className="overflow-hidden flex-1">
                <h5 className="font-serif text-sm font-medium text-stone-900 truncate">{activeTrack.titolo}</h5>
                <p className="text-[11px] text-stone-500 truncate">{activeTrack.artista}</p>
              </div>
            </div>

            <div className="space-y-1">
              <input
                type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#7A2238]"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleSkip(-10)} className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleSkip(10)} className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"><RotateCw className="w-3.5 h-3.5" /></button>
              </div>
              <button
                onClick={() => togglePlayTrack(activeTrack.id, activeTrack.file_url)}
                className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl flex items-center gap-1 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pausa" : "Riproduci"}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl text-xs font-medium shadow-2xl transition-all ${
          toast.type === 'success' ? 'bg-stone-900 text-white' : 'bg-[#7A2238] text-white'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      <footer className="border-t border-stone-200/80 py-6 px-6 text-center text-xs text-stone-400 space-y-1">
        <p>Nuova Accademia Toscanini &middot; Canto Moderno &middot; M° Raffaela Carfora</p>
        <p className="text-[10px] tracking-widest uppercase font-medium text-stone-500">
          &copy; 2026 M° Raffaela Carfora &mdash; Tutti i diritti riservati. Esercizi protetti da copyright (Solo ascolto streaming).
        </p>
      </footer>
    </div>
  );
}
