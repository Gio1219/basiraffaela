"use client";

import { useState, useEffect, useRef } from "react";
import { Music, LogOut, FileAudio, Users, Calendar, ArrowUpRight, Search, ChevronLeft, Clock, Camera, Plus, Trash2, Edit3, X, Upload, MessageSquare, Save, Download, Play, Pause, RotateCcw, RotateCw, Sliders, Maximize2, Minimize2 } from "lucide-react";
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
  allievo_nome: string;
  allievo_cognome: string;
  titolo: string;
  artista?: string | null;
  tonalita?: string | null;
  file_url: string;
  commento?: string | null;
  created_at: string;
}

interface LezioneOrario {
  id: string;
  giorno: string;
  ora: string;
  nome_allievo: string;
  corso?: string | null;
  tipo_modifica?: string | null; 
}

const GIORNI_SETTIMANA = ["Lunedì", "Mercoledì", "Giovedì", "Venerdì"];

const ORARIO_INIZIALE: Omit<LezioneOrario, "id">[] = [
  { giorno: "Lunedì", ora: "16:30", nome_allievo: "Maria Rossi", corso: "Avanzato", tipo_modifica: "normale" },
  { giorno: "Lunedì", ora: "17:15", nome_allievo: "Luca Bianchi", corso: "Avanzato", tipo_modifica: "normale" },
  { giorno: "Mercoledì", ora: "17:00", nome_allievo: "Maria Rossi", corso: "Professional", tipo_modifica: "normale" },
  { giorno: "Mercoledì", ora: "18:00", nome_allievo: "Giulia Verdi", corso: "Professional", tipo_modifica: "normale" },
];

export default function MaestraDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orario" | "allievi">("orario");
  const [allievi, setAllievi] = useState<Allievo[]>([]);
  const [basi, setBasi] = useState<BaseMusicale[]>([]);
  const [orarioList, setOrarioList] = useState<LezioneOrario[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAllievo, setSelectedAllievo] = useState<Allievo | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [isEditingAllievo, setIsEditingAllievo] = useState(false);
  const [editAllievoNome, setEditAllievoNome] = useState("");
  const [editAllievoCognome, setEditAllievoCognome] = useState("");
  const [editAllievoCorso, setEditAllievoCorso] = useState("");

  const [editingLezione, setEditingLezione] = useState<LezioneOrario | null>(null);
  const [editGiorno, setEditGiorno] = useState("Lunedì");
  const [editOra, setEditOra] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editCorso, setEditCorso] = useState("");
  const [editTipoModifica, setEditTipoModifica] = useState("normale");

  const [nuovoGiorno, setNuovoGiorno] = useState("Lunedì");
  const [nuovaOra, setNewOra] = useState("");
  const [nuovoAllievoNome, setNuovoAllievoNome] = useState("");
  const [nuovoCorso, setNuovoCorso] = useState("");
  const [nuovoTipoModifica, setNuovoTipoModifica] = useState("normale");

  const [titoloBase, setTitoloBase] = useState("");
  const [artistaBase, setArtistaBase] = useState("");
  const [tonalitaBase, setTonalitaBase] = useState("");
  const [commentoBase, setCommentoBase] = useState("");
  const [fileBase, setFileBase] = useState<File | null>(null);
  const [isUploadingBase, setIsUploadingBase] = useState(false);

  const [commentiModificati, setCommentiModificati] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Player Audio Avanzato & Fullscreen
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isExpandedPlayer, setIsExpandedPlayer] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const storedNome = localStorage.getItem("allievo_nome");
    const storedCognome = localStorage.getItem("allievo_cognome");
    
    if (
      !storedNome || 
      !storedCognome || 
      storedNome.toLowerCase().trim() !== "raffaela" || 
      storedCognome.toLowerCase().trim() !== "carfora"
    ) {
      router.push("/");
      return;
    }

    fetchData();
  }, [router]);

  useEffect(() => {
    const channelBasi = supabase
      .channel('realtime-maestra-basi')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'basi' },
        () => { fetchBasiData(); }
      )
      .subscribe();

    const channelOrario = supabase
      .channel('realtime-maestra-orario')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orario' },
        () => { fetchOrarioData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelBasi);
      supabase.removeChannel(channelOrario);
    };
  }, []);

  const fetchBasiData = async () => {
    const { data: basiData } = await supabase.from("basi").select("*").order("created_at", { ascending: false });
    const safeBasi = basiData || [];
    setBasi(safeBasi);
    const initialComments: { [key: string]: string } = {};
    safeBasi.forEach((b) => {
      initialComments[b.id] = b.commento || "";
    });
    setCommentiModificati(initialComments);
  };

  const fetchOrarioData = async () => {
    const { data: orarioData } = await supabase.from("orario").select("*").order("ora", { ascending: true });
    if (orarioData && orarioData.length > 0) {
      const uniqueOrario = Array.from(
        new Map(orarioData.map(item => [`${item.giorno}-${item.ora}-${item.nome_allievo}`, item])).values()
      );
      setOrarioList(uniqueOrario as LezioneOrario[]);
    } else {
      setOrarioList([]);
    }
  };

  const fetchData = async () => {
    try {
      const { data: allieviData } = await supabase.from("allievi").select("*").order("cognome");
      const safeAllievi = allieviData || [];
      setAllievi(safeAllievi);
      const raffaela = safeAllievi.find(
        (a) => a.nome.toLowerCase() === "raffaela" && a.cognome.toLowerCase() === "carfora"
      );
      if (raffaela?.avatar_url) {
        setAvatarUrl(raffaela.avatar_url);
      }

      await fetchBasiData();

      const { data: orarioData } = await supabase.from("orario").select("*").order("ora", { ascending: true });
      if (orarioData && orarioData.length > 0) {
        const uniqueOrario = Array.from(
          new Map(orarioData.map(item => [`${item.giorno}-${item.ora}-${item.nome_allievo}`, item])).values()
        );
        setOrarioList(uniqueOrario as LezioneOrario[]);
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from("orario")
          .insert(ORARIO_INIZIALE)
          .select();
        
        if (!insertError && insertedData) {
          const uniqueOrario = Array.from(
            new Map(insertedData.map(item => [`${item.giorno}-${item.ora}-${item.nome_allievo}`, item])).values()
          );
          setOrarioList(uniqueOrario as LezioneOrario[]);
        } else {
          setOrarioList(
            ORARIO_INIZIALE.map((item, index) => ({
              id: `init-${index}`,
              ...item,
            }))
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const avatarFile = e.target.files?.[0];
    if (!avatarFile) return;

    if (avatarFile.size > 10 * 1024 * 1024) {
      showToast("L'immagine è troppo grande (max 10MB).", "error");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `avatar-raffaela-${Date.now()}.${fileExt}`;
      const filePath = `Raffaela_Carfora/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        showToast("Errore caricamento foto: " + uploadError.message, "error");
        setIsUploadingAvatar(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = publicUrlData.publicUrl;

      let raffaelaRecord = allievi.find(
        (a) => a.nome.toLowerCase() === "raffaela" && a.cognome.toLowerCase() === "carfora"
      );

      if (raffaelaRecord) {
        await supabase
          .from("allievi")
          .update({ avatar_url: newAvatarUrl })
          .eq("id", raffaelaRecord.id);
      } else {
        const { data: newRec } = await supabase
          .from("allievi")
          .insert([{ nome: "Raffaela", cognome: "Carfora", avatar_url: newAvatarUrl }])
          .select();

        if (newRec) {
          setAllievi([...allievi, newRec[0]]);
        }
      }

      setAvatarUrl(newAvatarUrl);
      showToast("Foto profilo salvata!");
    } catch (err: any) {
      showToast("Errore: " + (err.message || err), "error");
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

    const { error } = await supabase
      .from("allievi")
      .update(updatedData)
      .eq("id", selectedAllievo.id);

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

    if (fileBase.size > 50 * 1024 * 1024) {
      showToast("Il file supera i 50MB consentiti.", "error");
      return;
    }

    setIsUploadingBase(true);
    try {
      const fileExt = fileBase.name.split(".").pop();
      const fileName = `${selectedAllievo.cognome}_${selectedAllievo.nome}_${Date.now()}.${fileExt}`;
      const filePath = `basi_audio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("basi")
        .upload(filePath, fileBase, { upsert: true });

      if (uploadError) {
        showToast("Errore caricamento file: " + uploadError.message, "error");
        setIsUploadingBase(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("basi")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      const nuovaBaseRecord = {
        allievo_nome: selectedAllievo.nome,
        allievo_cognome: selectedAllievo.cognome,
        titolo: titoloBase.trim(),
        artista: artistaBase.trim() || "Autore non specificato",
        tonalita: tonalitaBase.trim() || "Standard",
        commento: commentoBase.trim() || null,
        file_url: fileUrl,
      };

      const { data, error: dbError } = await supabase
        .from("basi")
        .insert([nuovaBaseRecord])
        .select();

      if (dbError) {
        showToast("Errore salvataggio nel database: " + dbError.message, "error");
        setIsUploadingBase(false);
        return;
      }

      if (data) {
        setBasi([data[0], ...basi]);
        setCommentiModificati({ ...commentiModificati, [data[0].id]: data[0].commento || "" });
        setTitoloBase("");
        setArtistaBase("");
        setTonalitaBase("");
        setCommentoBase("");
        setFileBase(null);
        showToast("Base caricata e commento salvato!");
      }
    } catch (err: any) {
      showToast("Errore: " + (err.message || err), "error");
    } finally {
      setIsUploadingBase(false);
    }
  };

  const handleDeleteBase = async (id: string) => {
    if (!confirm("Vuoi davvero eliminare questa base musicale?")) return;
    if (activeAudioId === id && audioRef.current) {
      audioRef.current.pause();
      setActiveAudioId(null);
      setIsPlaying(false);
      setIsExpandedPlayer(false);
    }
    
    const { error } = await supabase.from("basi").delete().eq("id", id);
    if (error) {
      showToast("Errore eliminazione: " + error.message, "error");
      return;
    }

    setBasi(basi.filter((b) => b.id !== id));
    showToast("Base eliminata.");
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
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
      window.open(url, '_blank');
    }
  };

  const togglePlayTrack = (id: string, url: string) => {
    if (activeAudioId === id) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.playbackRate = playbackRate;
      audioRef.current = audio;
      setActiveAudioId(id);
      setIsPlaying(true);

      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.play().catch((e) => console.error(e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSaveComment = async (id: string) => {
    const nuovoCommento = commentiModificati[id] || "";
    const { error } = await supabase
      .from("basi")
      .update({ commento: nuovoCommento.trim() || null })
      .eq("id", id);

    if (error) {
      showToast("Errore salvataggio commento: " + error.message, "error");
      return;
    }

    setBasi(basi.map((b) => (b.id === id ? { ...b, commento: nuovoCommento } : b)));
    showToast("Commento aggiornato!");
  };

  const handleAddLezione = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovaOra.trim() || !nuovoAllievoNome.trim()) return;

    const nuovaLezione = {
      giorno: nuovoGiorno,
      ora: nuovaOra.trim(),
      nome_allievo: nuovoAllievoNome.trim(),
      corso: nuovoCorso.trim() || null,
      tipo_modifica: nuovoTipoModifica,
    };

    const { data, error } = await supabase.from("orario").insert([nuovaLezione]).select();
    if (error) {
      showToast("Errore salvataggio lezione: " + error.message, "error");
      return;
    }

    if (data) {
      setOrarioList([...orarioList, data[0]]);
      setNewOra("");
      setNuovoAllievoNome("");
      setNuovoCorso("");
      setNuovoTipoModifica("normale");
      showToast("Lezione aggiunta!");
    }
  };

  const openEditModal = (lezione: LezioneOrario) => {
    setEditingLezione(lezione);
    setEditGiorno(lezione.giorno);
    setEditOra(lezione.ora);
    setEditNome(lezione.nome_allievo);
    setEditCorso(lezione.corso || "");
    setEditTipoModifica(lezione.tipo_modifica || "normale");
  };

  const handleSaveEditLezione = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLezione) return;

    const updated = {
      giorno: editGiorno,
      ora: editOra,
      nome_allievo: editNome,
      corso: editCorso.trim() || null,
      tipo_modifica: editTipoModifica,
    };

    const { error } = await supabase.from("orario").update(updated).eq("id", editingLezione.id);
    if (error) {
      showToast("Errore aggiornamento lezione: " + error.message, "error");
      return;
    }

    setOrarioList(
      orarioList.map((item) => (item.id === editingLezione.id ? { ...item, ...updated } : item))
    );
    setEditingLezione(null);
    showToast("Lezione aggiornata!");
  };

  const handleDeleteLezione = async (id: string) => {
    if (!confirm("Vuoi eliminare questa lezione?")) return;
    const { error } = await supabase.from("orario").delete().eq("id", id);
    if (error) {
      showToast("Errore eliminazione: " + error.message, "error");
      return;
    }
    setOrarioList(orarioList.filter((item) => item.id !== id));
    showToast("Lezione eliminata.");
  };

  const handleUpdateCorso = async (allievoId: string, nuovoCorso: string) => {
    try {
      const { error } = await supabase.from("allievi").update({ corso: nuovoCorso }).eq("id", allievoId);
      if (error) {
        showToast("Errore aggiornamento corso: " + error.message, "error");
        return;
      }
      setAllievi(
        allievi.map((a) => (a.id === allievoId ? { ...a, corso: nuovoCorso } : a))
      );
      if (selectedAllievo) {
        setSelectedAllievo({ ...selectedAllievo, corso: nuovoCorso });
      }
      showToast("Livello corso aggiornato!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    router.push("/");
  };

  const getCardStyle = (tipoModifica?: string | null, corso?: string | null) => {
    if (tipoModifica === "recupero") {
      return "bg-blue-50 text-blue-900 border-blue-200"; 
    }
    switch (corso) {
      case "Avanzato":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Professional":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Base":
        return "bg-teal-100 text-teal-800 border-teal-200";
      default:
        return "bg-white text-stone-900 border-stone-200";
    }
  };

  const filteredAllievi = allievi.filter(
    (a) =>
      (a.nome.toLowerCase() !== "raffaela" || a.cognome.toLowerCase() !== "carfora") &&
      (a.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
       a.cognome.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#FCFBF9] text-stone-900 flex flex-col selection:bg-[#7A2238] selection:text-white relative">
      <header className="border-b border-stone-200/80 bg-[#FCFBF9]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-16 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm border border-stone-200/80 shrink-0">
            <Image src="/logo-2.png" alt="Logo" fill className="object-contain p-1" />
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
            onClick={() => { setActiveTab("orario"); setSelectedAllievo(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "orario" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Orario Lezioni</span>
          </button>
          <button
            onClick={() => setActiveTab("allievi")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "allievi" || selectedAllievo ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Archivio Allievi ({filteredAllievi.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-white border border-stone-200/80 rounded-full py-1 pl-2.5 pr-3.5 sm:py-1.5 sm:pl-3 sm:pr-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <label className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-stone-300 text-stone-800 font-semibold text-xs flex items-center justify-center cursor-pointer group shadow-inner shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profilo" fill className="object-cover" />
              ) : (
                <Image src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdHxlbnwwfHx8fDE3ODc4MzA0Mjd8MA&ixlib=rb-4.1.0&q=85" alt="Profilo" fill className="object-cover" />
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

        <div className="flex md:hidden items-center gap-2 bg-stone-200/60 p-1 rounded-2xl w-full">
          <button
            onClick={() => { setActiveTab("orario"); setSelectedAllievo(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === "orario" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Orario</span>
          </button>
          <button
            onClick={() => setActiveTab("allievi")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === "allievi" || selectedAllievo ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Allievi</span>
          </button>
        </div>

        {activeTab === "orario" && !selectedAllievo && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold tracking-[0.25em] text-[#7A2238] uppercase">Programmazione Ufficiale</span>
                <h2 className="text-3xl lg:text-4xl font-serif text-stone-900 tracking-tight mt-1">
                  Orario <span className="italic font-light">settimanale</span>
                </h2>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-sm">
              <h3 className="text-xs font-bold tracking-widest text-stone-700 uppercase mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#7A2238]" /> Aggiungi Nuova Lezione / Modifica
              </h3>
              <form onSubmit={handleAddLezione} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Giorno</label>
                  <select
                    value={nuovoGiorno} onChange={(e) => setNuovoGiorno(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none"
                  >
                    {GIORNI_SETTIMANA.map((g) => (<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Orario</label>
                  <input
                    type="text" value={nuovaOra} onChange={(e) => setNewOra(e.target.value)}
                    placeholder="es. 16:30" required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Allievo / Corso</label>
                  <input
                    type="text" value={nuovoAllievoNome} onChange={(e) => setNuovoAllievoNome(e.target.value)}
                    placeholder="es. Maria Rossi" required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Tipo Modifica</label>
                  <select
                    value={nuovoTipoModifica} onChange={(e) => setNuovoTipoModifica(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none"
                  >
                    <option value="normale">Normale</option>
                    <option value="recupero">Recupero (Blu)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="py-3 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium text-xs transition-all shadow-sm cursor-pointer"
                >
                  Aggiungi
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {GIORNI_SETTIMANA.map((giorno) => {
                const lezioniDelGiorno = orarioList.filter((l) => l.giorno === giorno);

                return (
                  <div key={giorno} className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                        <h3 className="font-serif text-lg text-stone-900 font-medium">{giorno}</h3>
                        <span className="px-2.5 py-1 rounded-full bg-[#7A2238]/10 text-[#7A2238] text-[10px] font-bold tracking-wider uppercase">
                          {lezioniDelGiorno.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 mt-3">
                        {lezioniDelGiorno.length === 0 ? (
                          <p className="text-xs text-stone-400 py-4 text-center">Nessuna lezione.</p>
                        ) : (
                          lezioniDelGiorno.map((lezione) => {
                            const cardStyle = getCardStyle(lezione.tipo_modifica, lezione.corso);

                            return (
                              <div key={lezione.id} className={`p-3 rounded-xl border flex items-center justify-between group ${cardStyle}`}>
                                <div>
                                  <span className="text-[11px] font-bold opacity-75 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {lezione.ora} {lezione.tipo_modifica === "recupero" && "· (Recupero)"}
                                  </span>
                                  <span className="text-xs font-semibold block mt-0.5">{lezione.nome_allievo}</span>
                                  {lezione.corso && (
                                    <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold block">{lezione.corso}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditModal(lezione)} className="p-1 hover:bg-black/10 rounded cursor-pointer" title="Modifica">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteLezione(lezione.id)} className="p-1 hover:bg-red-500/20 text-red-700 rounded cursor-pointer" title="Elimina">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                      b.allievo_nome.toLowerCase() === allievo.nome.toLowerCase() &&
                      b.allievo_cognome.toLowerCase() === allievo.cognome.toLowerCase()
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
                <Upload className="w-4 h-4" /> Carica Nuova Base Musicale & Commento
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
                  <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Commento / Note di miglioramento per l'allievo</label>
                  <textarea value={commentoBase} onChange={(e) => setCommentoBase(e.target.value)} placeholder="es. Lavora di più sull'intonazione..." rows={2} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">File Audio (MP3, WAV)</label>
                    <input type="file" accept="audio/*,.pdf" onChange={(e) => setFileBase(e.target.files?.[0] || null)} required className="w-full text-xs text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7A2238]/10 file:text-[#7A2238] cursor-pointer" />
                  </div>

                  <button type="submit" disabled={isUploadingBase} className="py-3 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50">
                    {isUploadingBase ? "Caricamento..." : "Carica Base & Commento"}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold tracking-widest text-stone-500 uppercase">Basi caricate da {selectedAllievo.nome}</h4>

              {(() => {
                const basiAllievo = basi.filter(
                  (b) =>
                    b.allievo_nome.toLowerCase() === selectedAllievo.nome.toLowerCase() &&
                    b.allievo_cognome.toLowerCase() === selectedAllievo.cognome.toLowerCase()
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

      {/* MINI-PLAYER FISSO IN BASSO A DESTRA CON TASTO SCHERMO INTERO */}
      {activeAudioId && (() => {
        const activeTrack = basi.find(b => b.id === activeAudioId);
        if (!activeTrack) return null;
        return (
          <>
            {/* MINI PLAYER */}
            <div className="fixed bottom-6 right-6 z-50 bg-white border border-stone-200 shadow-2xl rounded-2xl p-4 w-80 sm:w-96 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-widest text-[#7A2238] uppercase">
                  Allievo: {activeTrack.allievo_nome} {activeTrack.allievo_cognome}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsExpandedPlayer(true)}
                    className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    title="Schermo intero / Espandi"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.pause();
                        setActiveAudioId(null);
                        setIsPlaying(false);
                        setIsExpandedPlayer(false);
                      }
                    }}
                    className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    title="Chiudi lettore"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7A2238]/10 text-[#7A2238] flex items-center justify-center shrink-0">
                  <FileAudio className="w-5 h-5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <h5 className="font-serif text-sm font-medium text-stone-900 truncate">
                    {activeTrack.titolo}
                  </h5>
                  <p className="text-[11px] text-stone-500 truncate">
                    {activeTrack.artista} {activeTrack.tonalita ? `· ${activeTrack.tonalita}` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <input
                  type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek}
                  className="w-full accent-[#7A2238] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration || 0)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleSkip(-10)} className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 cursor-pointer" title="Indietro 10s">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleSkip(10)} className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 cursor-pointer" title="Avanti 10s">
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
                        else { audioRef.current.play(); setIsPlaying(true); }
                      }
                    }}
                    className="px-4 py-1.5 bg-[#7A2238] hover:bg-[#651c2e] text-white text-xs font-medium rounded-xl flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? "Pausa" : "Play"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* EXPANDED / FULLSCREEN PLAYER MODAL */}
            {isExpandedPlayer && (
              <div className="fixed inset-0 z-50 bg-[#FCFBF9] flex flex-col justify-between p-6 sm:p-12 animate-fadeIn">
                <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7A2238]/10 text-[#7A2238] flex items-center justify-center">
                      <Music className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#7A2238]">Lettore a Schermo Intero</h4>
                      <p className="text-[11px] text-stone-500">Allievo: {activeTrack.allievo_nome} {activeTrack.allievo_cognome}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsExpandedPlayer(false)}
                    className="p-3 bg-stone-200/60 hover:bg-stone-200 rounded-full text-stone-800 cursor-pointer transition-colors"
                    title="Riduci a mini-player"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="max-w-2xl w-full mx-auto text-center space-y-8 my-auto">
                  <div className="w-32 h-32 sm:w-48 sm:h-48 mx-auto rounded-3xl bg-[#7A2238]/10 text-[#7A2238] flex items-center justify-center shadow-inner">
                    <FileAudio className="w-16 h-16 sm:w-24 sm:h-24 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 font-medium">{activeTrack.titolo}</h2>
                    <p className="text-base text-stone-500">{activeTrack.artista} {activeTrack.tonalita ? `· Tonalità: ${activeTrack.tonalita}` : ''}</p>
                    {activeTrack.commento && (
                      <div className="mt-4 max-w-md mx-auto bg-[#7A2238]/10 border border-[#7A2238]/20 rounded-2xl p-4 text-xs text-stone-800 text-left">
                        <span className="font-bold text-[#7A2238] block mb-1 uppercase tracking-wider text-[10px]">Commento Insegnante:</span>
                        {activeTrack.commento}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <input
                      type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek}
                      className="w-full accent-[#7A2238] cursor-pointer h-2"
                    />
                    <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration || 0)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-6">
                    <button onClick={() => handleSkip(-10)} className="p-3 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-800 cursor-pointer" title="Indietro 10s">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
                          else { audioRef.current.play(); setIsPlaying(true); }
                        }
                      }}
                      className="w-16 h-16 bg-[#7A2238] hover:bg-[#651c2e] text-white rounded-full flex items-center justify-center shadow-xl cursor-pointer transition-transform hover:scale-105"
                    >
                      {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                    </button>
                    <button onClick={() => handleSkip(10)} className="p-3 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-800 cursor-pointer" title="Avanti 10s">
                      <RotateCw className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Sliders className="w-4 h-4 text-stone-500 mr-1" />
                    <span className="text-xs uppercase font-bold text-stone-500">Velocità:</span>
                    {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (audioRef.current) audioRef.current.playbackRate = rate;
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                          playbackRate === rate ? 'bg-[#7A2238] text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-center text-xs text-stone-400">
                  Nuova Accademia Toscanini &middot; Canto Moderno &middot; M° Raffaela Carfora
                </div>
              </div>
            )}
          </>
        );
      })()}

      {editingLezione && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="font-serif text-xl text-stone-900 font-medium">Modifica Lezione</h3>
              <button onClick={() => setEditingLezione(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLezione} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Giorno</label>
                <select value={editGiorno} onChange={(e) => setEditGiorno(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none">
                  {GIORNI_SETTIMANA.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Orario</label>
                <input type="text" value={editOra} onChange={(e) => setEditOra(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Allievo / Corso</label>
                <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Corso (Opzionale)</label>
                <input type="text" value={editCorso} onChange={(e) => setEditCorso(e.target.value)} placeholder="es. Avanzato..." className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Tipo Modifica</label>
                <select value={editTipoModifica} onChange={(e) => setEditTipoModifica(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none">
                  <option value="normale">Normale</option>
                  <option value="recupero">Recupero (Colore Blu)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setEditingLezione(null)} className="px-5 py-3 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 cursor-pointer">Annulla</button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white text-xs font-medium shadow-sm cursor-pointer">Salva Modifiche</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl text-xs font-medium shadow-2xl transition-all ${
          toast.type === 'success' ? 'bg-stone-900 text-white' : 'bg-[#7A2238] text-white'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      <footer className="border-t border-stone-200/80 py-6 px-6 text-center text-xs text-stone-400">
        Nuova Accademia Toscanini &middot; Canto Moderno &middot; M° Raffaela Carfora
      </footer>
    </div>
  );
}