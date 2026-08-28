"use client";

import { useState, useEffect, useRef } from "react";
import { Music, Upload, LogOut, FileAudio, Camera, MessageSquare, Download, Trash2, Play, Pause, Activity, Sliders } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Image from "next/image";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface BaseMusicale {
  id: string;
  titolo: string;
  artista: string;
  tonalita?: string | null;
  file_url: string;
  commento?: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [titolo, setTitolo] = useState("");
  const [artista, setArtista] = useState("");
  const [tonalita, setTonalita] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [basi, setBasi] = useState<BaseMusicale[]>([]);
  const [loadingBasi, setLoadingBasi] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Stati per il Metronomo
  const [bpm, setBpm] = useState(100);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const metronomeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stati per il Mini-Player attivo
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const storedNome = localStorage.getItem("allievo_nome") || "Maria";
    const storedCognome = localStorage.getItem("allievo_cognome") || "Rossi";
    
    setNome(storedNome);
    setCognome(storedCognome);
    fetchUserData(storedNome, storedCognome);
    fetchBasi(storedNome, storedCognome);
  }, [router]);

  // Gestione del Metronomo con Web Audio API
  useEffect(() => {
    if (!isMetronomeActive) {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
      return;
    }

    const interval = (60 / bpm) * 1000;
    metronomeTimerRef.current = setInterval(() => {
      playClickSound();
    }, interval);

    return () => {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
    };
  }, [isMetronomeActive, bpm]);

  const playClickSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Tono acuto
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserData = async (n: string, c: string) => {
    const { data } = await supabase
      .from("allievi")
      .select("avatar_url")
      .ilike("nome", n)
      .ilike("cognome", c)
      .maybeSingle();

    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const fetchBasi = async (n: string, c: string) => {
    try {
      const { data, error } = await supabase
        .from("basi")
        .select("*")
        .ilike("allievo_nome", n)
        .ilike("allievo_cognome", c)
        .order("created_at", { ascending: false });

      if (!error) {
        setBasi(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBasi(false);
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
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${nome}_${cognome}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        showToast("Errore caricamento foto: " + uploadError.message, "error");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = publicUrlData.publicUrl;

      await supabase
        .from("allievi")
        .update({ avatar_url: newAvatarUrl })
        .ilike("nome", nome)
        .ilike("cognome", cognome);

      setAvatarUrl(newAvatarUrl);
      showToast("Foto profilo aggiornata!");
    } catch (err) {
      console.error(err);
      showToast("Errore imprevisto.", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const compressAudioIfNeeded = async (audioFile: File): Promise<File> => {
    if (audioFile.size <= 45 * 1024 * 1024 || !audioFile.type.startsWith("audio/")) {
      return audioFile;
    }

    showToast("File pesante rilevato: compressione automatica in corso...");
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const sampleRate = 22050;
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * sampleRate, sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = bufferToWav(renderedBuffer);

      return new File([wavBlob], audioFile.name.replace(/\.[^/.]+$/, "") + "_ottimizzato.wav", {
        type: "audio/wav",
      });
    } catch (err) {
      console.error("Errore durante la compressione:", err);
      return audioFile;
    }
  };

  const bufferToWav = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let channels = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    writeString('RIFF'); pos += 4;
    out.setUint32(pos, length - 8, true); pos += 4;
    writeString('WAVE'); pos += 4;
    writeString('fmt '); pos += 4;
    out.setUint32(pos, 16, true); pos += 4;
    out.setUint16(pos, 1, true); pos += 2;
    out.setUint16(pos, numOfChan, true); pos += 2;
    out.setUint32(pos, sampleRate, true); pos += 4;
    out.setUint32(pos, sampleRate * 2 * numOfChan, true); pos += 4;
    out.setUint16(pos, numOfChan * 2, true); pos += 2;
    out.setUint16(pos, 16, true); pos += 2;
    writeString('data'); pos += 4;
    out.setUint32(pos, length - pos - 4, true); pos += 4;

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: 'audio/wav' });

    function writeString(str: string) {
      for (let i = 0; i < str.length; i++) {
        out.setUint8(pos++, str.charCodeAt(i));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !titolo.trim() || !artista.trim()) {
      showToast("Compila titolo, artista e seleziona un file.", "error");
      return;
    }

    setIsUploading(true);

    try {
      const fileToUpload = await compressAudioIfNeeded(file);

      if (fileToUpload.size > 50 * 1024 * 1024) {
        showToast("Il file è ancora troppo grande dopo la compressione (max 50MB).", "error");
        setIsUploading(false);
        return;
      }

      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${nome}_${cognome}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("basi")
        .upload(filePath, fileToUpload);

      if (uploadError) {
        showToast("Errore caricamento file: " + uploadError.message, "error");
        setIsUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("basi")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("basi").insert([
        {
          allievo_nome: nome,
          allievo_cognome: cognome,
          titolo: titolo.trim(),
          artista: artista.trim(),
          tonalita: tonalita.trim(),
          file_url: publicUrlData.publicUrl,
        },
      ]);

      if (dbError) {
        showToast("Errore salvataggio dati: " + dbError.message, "error");
      } else {
        showToast("Base caricata con successo!");
        setTitolo("");
        setArtista("");
        setTonalita("");
        setFile(null);
        fetchBasi(nome, cognome);
      }
    } catch (err) {
      console.error(err);
      showToast("Errore imprevisto durante l'elaborazione.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBase = async (id: string) => {
    if (!confirm("Vuoi davvero eliminare questa base musicale?")) return;
    const { error } = await supabase.from("basi").delete().eq("id", id);
    if (error) {
      showToast("Errore durante l'eliminazione: " + error.message, "error");
      return;
    }
    setBasi(basi.filter((b) => b.id !== id));
    showToast("Base eliminata con successo.");
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

  const handlePlayToggle = (id: string, url: string) => {
    if (activeAudioId === id) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
          setActiveAudioId(null);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.playbackRate = playbackRate;
      audio.play();
      audioRef.current = audio;
      setActiveAudioId(id);

      audio.onended = () => {
        setActiveAudioId(null);
      };
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  const iniziali = nome && cognome ? `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase() : "MR";

  return (
    <div className="min-h-screen bg-[#FCFBF9] text-stone-900 flex flex-col selection:bg-[#7A2238] selection:text-white relative">
      <header className="border-b border-stone-200/80 bg-[#FCFBF9]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-16 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm border border-stone-200/80 shrink-0">
            <Image 
              src="/logo-2.png" 
              alt="Logo" 
              fill 
              className="object-contain p-1" 
            />
          </div>
          <div>
            <h1 className="text-[10px] sm:text-xs font-semibold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900">
              Accademia Musicale
            </h1>
            <p className="text-[9px] sm:text-[10px] tracking-widest sm:tracking-[0.15em] text-[#7A2238] uppercase font-medium">
              Area Studenti
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-white border border-stone-200/80 rounded-full py-1 pl-2.5 pr-3.5 sm:py-1.5 sm:pl-3 sm:pr-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <label className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-stone-300 text-stone-800 font-semibold text-xs flex items-center justify-center cursor-pointer group shadow-inner shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profilo" fill className="object-cover" />
              ) : (
                <span>{iniziali}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                <Camera className="w-4 h-4" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>

            <div className="text-left hidden xs:block">
              <p className="text-xs font-medium text-stone-900 leading-none">
                {nome} {cognome}
              </p>
              <p className="text-[10px] text-stone-400 tracking-wider uppercase mt-0.5">
                {isUploadingAvatar ? "Aggiornamento..." : "Allievo/a"}
              </p>
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

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-12 space-y-10 sm:space-y-12">
        
        {/* WIDGET METRONOMO DIGITALE */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isMetronomeActive ? 'bg-[#7A2238] text-white animate-pulse' : 'bg-stone-100 text-stone-600'}`}>
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-stone-900 font-medium">Metronomo di Studio</h3>
              <p className="text-xs text-stone-500">Imposta il tempo in BPM per la tua sessione</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-center">
              <span className="text-2xl font-serif font-bold text-[#7A2238]">{bpm}</span>
              <span className="text-[10px] text-stone-400 uppercase tracking-widest block">BPM</span>
            </div>

            <input 
              type="range" 
              min="40" 
              max="220" 
              value={bpm} 
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-32 sm:w-40 accent-[#7A2238] cursor-pointer"
            />

            <button
              onClick={() => setIsMetronomeActive(!isMetronomeActive)}
              className={`px-5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-sm ${
                isMetronomeActive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-[#7A2238] text-white hover:bg-[#651c2e]'
              }`}
            >
              {isMetronomeActive ? "Stop" : "Avvia"}
            </button>
          </div>
        </div>

        {/* SEZIONE UPLOAD */}
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-semibold tracking-[0.25em] text-[#7A2238] uppercase">
              Le tue basi
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-stone-900 tracking-tight mt-1">
              Carica una nuova <span className="italic font-light">base musicale</span>
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm font-light mt-1">
              I file audio pesanti verranno ottimizzati automaticamente dal browser prima dell'invio.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <form onSubmit={handleUpload} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5">
                <label className="relative flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-stone-300 rounded-2xl bg-stone-50/50 hover:bg-stone-50 transition-all cursor-pointer group min-h-48 sm:min-h-55">
                  <div className="w-12 h-12 rounded-full bg-[#7A2238]/10 text-[#7A2238] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-stone-800 text-center">
                    {file ? file.name : "Trascina qui il tuo file"}
                  </span>
                  <span className="text-[11px] text-stone-400 text-center mt-1">
                    {file ? "File pronto per il caricamento" : "o clicca per selezionarlo · MP3 · WAV"}
                  </span>
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a,audio/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required
                  />
                </label>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-600 uppercase">
                    Titolo
                  </label>
                  <input
                    type="text"
                    value={titolo}
                    onChange={(e) => setTitolo(e.target.value)}
                    placeholder="es. Someone Like You"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A2238]/10 text-sm transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-600 uppercase">
                    Artista
                  </label>
                  <input
                    type="text"
                    value={artista}
                    onChange={(e) => setArtista(e.target.value)}
                    placeholder="es. Adele"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A2238]/10 text-sm transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest text-stone-600 uppercase">
                    Tonalità (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={tonalita}
                    onChange={(e) => setTonalita(e.target.value)}
                    placeholder="es. A major, -1"
                    className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A2238]/10 text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium transition-all shadow-md text-sm cursor-pointer active:scale-[0.99] disabled:opacity-70 mt-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? "Elaborazione e caricamento..." : "Carica base"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ARCHIVIO E MINI PLAYER */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-[10px] font-semibold tracking-[0.25em] text-[#7A2238] uppercase">
                Archivio
              </span>
              <h3 className="text-xl sm:text-2xl font-serif text-stone-900 tracking-tight mt-0.5">
                Le tue basi caricate
              </h3>
            </div>

            {/* SELETTORE VELOCITÀ AUDIO GLOBALE */}
            <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-xs">
              <Sliders className="w-4 h-4 text-[#7A2238]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Velocità:</span>
              {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    playbackRate === rate ? 'bg-[#7A2238] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {loadingBasi ? (
            <div className="py-12 text-center text-stone-400 text-sm">
              Caricamento archivio...
            </div>
          ) : basi.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Music className="w-5 h-5" />
              </div>
              <p className="text-stone-800 font-medium text-sm">Nessuna base caricata</p>
              <p className="text-stone-400 text-xs">Inizia caricando il tuo primo brano qui sopra.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {basi.map((item) => {
                const isPlaying = activeAudioId === item.id;

                return (
                  <div 
                    key={item.id}
                    className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-[#7A2238]/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#7A2238]/10 text-[#7A2238] flex items-center justify-center shrink-0">
                        <FileAudio className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-serif text-base sm:text-lg text-stone-900 font-medium leading-tight">
                          {item.titolo}
                        </h4>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {item.artista} {item.tonalita ? `· Tonalità: ${item.tonalita}` : ""}
                        </p>
                        {item.commento && (
                          <div className="mt-2.5 flex items-start gap-2 bg-[#7A2238]/10 border border-[#7A2238]/20 rounded-xl p-3 text-xs text-stone-800">
                            <span className="bg-[#7A2238] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 mt-0.5">
                              Feedback Insegnante
                            </span>
                            <span>{item.commento}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handlePlayToggle(item.id, item.file_url)}
                        className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer shadow-xs ${
                          isPlaying ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-[#7A2238] text-white hover:bg-[#651c2e]'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? "Pausa" : `Ascolta (${playbackRate}x)`}</span>
                      </button>

                      <button
                        onClick={() => handleDownload(item.file_url, `${item.titolo}_${item.artista}`)}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#7A2238]" />
                        <span>Scarica</span>
                      </button>

                      <button
                        onClick={() => handleDeleteBase(item.id)}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Elimina</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-medium shadow-2xl transition-all flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-stone-900 text-white' : 'bg-[#7A2238] text-white'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      <footer className="border-t border-stone-200/80 py-6 px-6 text-center text-xs text-stone-400">
        Piattaforma Accademia Musicale &middot; Area Riservata Studenti
      </footer>
    </div>
  );
}