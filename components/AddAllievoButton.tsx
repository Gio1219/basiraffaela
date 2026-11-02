"use client";

import { useRef, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LoaderCircle, UserPlus, X } from "lucide-react";

interface CreatedAllievo {
  id: string;
  nome: string;
  cognome: string;
  corso: string | null;
}

interface AddAllievoButtonProps {
  supabase: SupabaseClient;
  disabled?: boolean;
  onCreated: (allievo: CreatedAllievo) => void;
}

export default function AddAllievoButton({ supabase, onCreated, disabled = false }: AddAllievoButtonProps) {
  const nomeRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;

    const formData = new FormData(event.currentTarget);
    const nome = String(formData.get("nome") || "").trim();
    const cognome = String(formData.get("cognome") || "").trim();
    const corso = String(formData.get("corso") || "").trim() || null;

    if (!nome || !cognome) {
      setErrorMessage("Inserisci nome e cognome dell’allievo.");
      return;
    }

    // Il login esistente usa ILIKE: questi caratteri non identificano un nome esatto.
    if (/[%_\\]/.test(nome + cognome)) {
      setErrorMessage("Nome e cognome non possono contenere %, _ o \\.");
      return;
    }

    if (nome.toLowerCase() === "raffaela" && cognome.toLowerCase() === "carfora") {
      setErrorMessage("Questo nome è riservato al profilo dell’insegnante.");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Controlla anche gli inserimenti effettuati dopo il caricamento dell’elenco.
      const { data: existing, error: lookupError } = await supabase
        .from("allievi")
        .select("id")
        .ilike("nome", nome)
        .ilike("cognome", cognome)
        .limit(1);

      if (lookupError) throw lookupError;
      if (existing?.length) {
        setErrorMessage("Esiste già un allievo con questo nome e cognome.");
        return;
      }

      const { data, error } = await supabase
        .from("allievi")
        .insert({ nome, cognome, corso, password: null })
        .select("id, nome, cognome, corso")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Nessun allievo restituito dopo il salvataggio.");

      onCreated(data);
      dialogRef.current?.close();
    } catch (error: unknown) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
      if (code === "23505") {
        setErrorMessage("Esiste già un allievo con questo nome e cognome.");
      } else if (code === "42501") {
        setErrorMessage("Il salvataggio non è autorizzato. Verifica i permessi di inserimento degli allievi.");
      } else {
        setErrorMessage("Non è stato possibile confermare il salvataggio. Controlla la connessione e l’elenco allievi prima di riprovare.");
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          dialogRef.current?.showModal();
          nomeRef.current?.focus();
        }}
        className="inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7A2238] px-4 py-2.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#651c2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A2238] disabled:opacity-50 disabled:cursor-wait cursor-pointer"
      >
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Aggiungi allievo
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="nuovo-allievo-title"
        aria-describedby="nuovo-allievo-description"
        onCancel={(event) => { if (savingRef.current) event.preventDefault(); }}
        onClose={() => {
          formRef.current?.reset();
          setErrorMessage(null);
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-[#FCFBF9] p-6 text-stone-900 shadow-xl backdrop:bg-stone-950/40 backdrop:backdrop-blur-sm sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7A2238]">Gestione allievi</p>
            <h2 id="nuovo-allievo-title" className="font-serif text-3xl tracking-tight">Aggiungi allievo</h2>
            <p id="nuovo-allievo-description" className="mt-2 text-sm leading-relaxed text-stone-500">
              Inserisci i suoi dati. L’allievo sceglierà la password al primo accesso.
            </p>
          </div>
          <button
            type="button"
            aria-label="Chiudi modulo"
            disabled={isSaving}
            onClick={() => dialogRef.current?.close()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-[#7A2238] disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} aria-busy={isSaving} className="space-y-5">
          <fieldset disabled={isSaving} className="space-y-5 disabled:opacity-60">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="nuovo-allievo-nome" className="text-[10px] font-semibold uppercase tracking-widest text-stone-600">Nome</label>
                <input
                  ref={nomeRef} id="nuovo-allievo-nome" name="nome" type="text" autoComplete="off" required maxLength={100}
                  placeholder="es. Maria"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-[#7A2238] focus:ring-2 focus:ring-[#7A2238]/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="nuovo-allievo-cognome" className="text-[10px] font-semibold uppercase tracking-widest text-stone-600">Cognome</label>
                <input
                  id="nuovo-allievo-cognome" name="cognome" type="text" autoComplete="off" required maxLength={100}
                  placeholder="es. Rossi"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-[#7A2238] focus:ring-2 focus:ring-[#7A2238]/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="nuovo-allievo-corso" className="text-[10px] font-semibold uppercase tracking-widest text-stone-600">Corso</label>
              <select
                id="nuovo-allievo-corso" name="corso" defaultValue=""
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7A2238] focus:ring-2 focus:ring-[#7A2238]/20"
              >
                <option value="">Da assegnare</option>
                <option value="Base">Base</option>
                <option value="Avanzato">Avanzato</option>
                <option value="Professional">Professional</option>
              </select>
              <p className="text-xs leading-relaxed text-stone-500">Puoi assegnare o cambiare il corso anche in seguito.</p>
            </div>
          </fieldset>

          {errorMessage && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-[#7A2238]">{errorMessage}</p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
            <button type="button" disabled={isSaving} onClick={() => dialogRef.current?.close()} className="rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 cursor-pointer">Annulla</button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A2238] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#651c2e] disabled:opacity-60 disabled:cursor-wait cursor-pointer">
              {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSaving ? "Salvataggio..." : "Salva allievo"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
