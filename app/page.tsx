// app/page.tsx
"use client";

import { useState } from "react";
import { Mic, Eye, EyeOff } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"name" | "login" | "setup">("name");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [password, setPassword] = useState("");
  const [nuovaPassword, setNuovaPassword] = useState("");
  const [confermaPassword, setConfermaPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("allievi")
        .select("*")
        .ilike("nome", nome.trim())
        .ilike("cognome", cognome.trim())
        .maybeSingle();

      if (error) {
        console.error("Errore Supabase:", error.message);
        alert("Errore durante la verifica. Riprova.");
        setIsSubmitting(false);
        return;
      }

      if (!data) {
        alert("Allievo non trovato. Contatta la M° Raffaela Carfora per farti aggiungere.");
        setIsSubmitting(false);
        return;
      }

      if (data.password && data.password.trim() !== "") {
        setStep("login");
      } else {
        setStep("setup");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (step === "setup") {
        if (nuovaPassword !== confermaPassword) {
          alert("Le password non coincidono!");
          setIsSubmitting(false);
          return;
        }

        if (nuovaPassword.length < 6) {
          alert("La password deve essere di almeno 6 caratteri.");
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from("allievi")
          .update({ password: nuovaPassword })
          .ilike("nome", nome.trim())
          .ilike("cognome", cognome.trim());

        if (error) {
          alert("Errore nel salvataggio della password.");
          setIsSubmitting(false);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("allievi")
          .select("*")
          .ilike("nome", nome.trim())
          .ilike("cognome", cognome.trim())
          .eq("password", password)
          .maybeSingle();

        if (error || !data) {
          alert("Password errata. Riprova.");
          setIsSubmitting(false);
          return;
        }
      }

      localStorage.setItem("allievo_nome", nome.trim());
      localStorage.setItem("allievo_cognome", cognome.trim());

      if (nome.toLowerCase() === "raffaela" && cognome.toLowerCase() === "carfora") {
        router.push("/maestra");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#FCFBF9] text-stone-800 selection:bg-[#7A2238] selection:text-white">
      {/* Colonna Sinistra - Immagine e Testo */}
      <div className="relative flex flex-col justify-between p-8 lg:p-12 text-white bg-stone-900 overflow-hidden min-h-87.5 lg:min-h-screen">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1635520356736-90cb46f73413?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwyfHxtaWNyb3Bob25lJTIwc3R1ZGlvJTIwc3RhZ2UlMjB3YXJtfGVufDB8fHx8MTc4NzgyOTg4MXww&ixlib=rb-4.1.0&q=85')`
          }}
        >
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/50 to-black/30 z-10" />
          <div className="absolute inset-0 bg-[#3a111c]/40 mix-blend-multiply z-10" />
        </div>

        {/* Header Sinistro con Icona Microfono */}
        <div className="relative z-20 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white/95 backdrop-blur-sm bg-white/10 shadow-inner">
            <Mic className="w-4 h-4 text-rose-300" />
          </div>
          <span className="tracking-[0.2em] text-[11px] uppercase font-light text-white/90">
            Canto Moderno
          </span>
        </div>

        {/* Contenuto Centrale */}
        <div className="relative z-20 my-auto py-12 max-w-lg">
          <h1 className="text-3xl lg:text-5xl font-serif leading-[1.15] mb-6 font-normal tracking-tight text-stone-100">
            Le tue basi, <br />
            <span className="italic font-light text-stone-200">un solo respiro di distanza.</span>
          </h1>
          <p className="text-stone-300 text-sm lg:text-base font-light leading-relaxed max-w-md">
            La piattaforma privata del M° Raffaela Carfora per allievi e insegnante.
          </p>
        </div>

        {/* Footer Sinistro */}
        <div className="relative z-20 text-[10px] tracking-[0.2em] uppercase text-stone-400 font-light">
          M° Raffaela Carfora &middot; Studio di Canto
        </div>
      </div>

      {/* Colonna Destra - Form */}
      <div className="flex flex-col justify-center items-center p-8 lg:p-24 bg-[#FCFBF9]">
        <div className="w-full max-w-sm space-y-8">
          
          {/* STEP 1: Nome e Cognome */}
          {step === "name" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-[#7A2238] uppercase">
                  Accesso
                </span>
                <h2 className="text-3xl lg:text-4xl font-serif text-stone-900 tracking-tight">
                  Ciao, chi sei?
                </h2>
                <p className="text-stone-500 text-sm font-light">
                  Inserisci nome e cognome per continuare.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleCheckUser}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold tracking-widest text-stone-600 uppercase">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="es. Giovanni"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A2238]/20 transition-all text-sm shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold tracking-widest text-stone-600 uppercase">
                    Cognome
                  </label>
                  <input
                    type="text"
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    placeholder="es. Russo"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A2238]/20 transition-all text-sm shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-[0.99] disabled:opacity-70"
                >
                  <span>{isSubmitting ? "Verifica..." : "Continua"}</span>
                </button>
              </form>
            </div>
          )}

          {/* STEP 2A: Login con Password */}
          {step === "login" && (
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-[#7A2238] uppercase">
                  Password
                </span>
                <h2 className="text-3xl lg:text-4xl font-serif text-stone-900 tracking-tight">
                  Bentornato/a, {nome}.
                </h2>
                <p className="text-stone-500 text-sm font-light">
                  Digita la password che avevi impostato.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleFinalSubmit}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold tracking-widest text-stone-600 uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="La tua password"
                      required
                      autoFocus
                      className="w-full px-4 py-3.5 pr-12 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A2238]/20 transition-all text-sm shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-[0.99] disabled:opacity-70"
                >
                  <span>{isSubmitting ? "Accesso..." : "Entra"}</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setStep("name"); setPassword(""); }}
                  className="text-xs text-stone-500 hover:text-[#7A2238] underline transition-colors cursor-pointer"
                >
                  Non sei tu? Cambia nome
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: Primo Accesso / Imposta Password */}
          {step === "setup" && (
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-[#7A2238] uppercase">
                  Primo Accesso
                </span>
                <h2 className="text-3xl lg:text-4xl font-serif text-stone-900 tracking-tight">
                  Ciao, {nome}.
                </h2>
                <p className="text-stone-500 text-sm font-light">
                  È il tuo primo accesso. Scegli una password per la tua area privata.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleFinalSubmit}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold tracking-widest text-stone-600 uppercase">
                    Nuova Password
                  </label>
                  <input
                    type="password"
                    value={nuovaPassword}
                    onChange={(e) => setNuovaPassword(e.target.value)}
                    placeholder="Minimo 6 caratteri"
                    required
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A2238]/20 transition-all text-sm shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold tracking-widest text-stone-600 uppercase">
                    Conferma Password
                  </label>
                  <input
                    type="password"
                    value={confermaPassword}
                    onChange={(e) => setConfermaPassword(e.target.value)}
                    placeholder="Ripeti password"
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-stone-200 focus:border-[#7A2238] bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A2238]/20 transition-all text-sm shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#7A2238] hover:bg-[#651c2e] text-white font-medium transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-[0.99] disabled:opacity-70"
                >
                  <span>{isSubmitting ? "Salvataggio..." : "Salva e Accedi"}</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setStep("name"); setNuovaPassword(""); setConfermaPassword(""); }}
                  className="text-xs text-stone-500 hover:text-[#7A2238] underline transition-colors cursor-pointer"
                >
                  Non sei tu? Cambia nome
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}