import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
      return NextResponse.json({ error: 'URL YouTube non valido' }, { status: 400 });
    }

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    if (!videoId) {
      return NextResponse.json({ error: 'Impossibile estrarre l\'ID del video YouTube' }, { status: 400 });
    }

    // CONSIGLIO: Sposta questa chiave in .env.local come RAPIDAPI_KEY
    const rapidApiKey = process.env.RAPIDAPI_KEY || 'dc455ebfa7mshb237d5621e51e3dp16fbb8jsna69b0b8cb898';
    const apiHost = 'youtube-mp36.p.rapidapi.com';

    const apiRes = await fetch(`https://${apiHost}/dl?id=${videoId}`, {
      method: 'GET', // Rimossa l'intestazione 'Content-Type' superflua per le chiamate GET
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': apiHost
      }
    });

    let apiData;
    try {
      apiData = await apiRes.json();
    } catch (parseError) {
      const rawText = await apiRes.text();
      console.error("Errore di parse o API offline. Risposta grezza:", rawText);
      return NextResponse.json({ error: 'Il server RapidAPI ha restituito una risposta non valida (forse offline)' }, { status: 502 });
    }

    // LOG FONDAMENTALE: Controlla il terminale di VS Code per vedere il vero errore di RapidAPI
    console.log("Risposta RapidAPI:", apiData);

    if (!apiRes.ok || (!apiData.link && !apiData.audio)) {
      return NextResponse.json({ 
        error: apiData.message || apiData.msg || 'Errore nella risposta di RapidAPI. Verifica chiave, piano o disponibilità API.',
        details: apiData 
      }, { status: 500 });
    }

    const audioLink = apiData.link || apiData.audio;

    return NextResponse.json({
      success: true,
      titolo: apiData.title || `Brano YouTube (${videoId})`,
      artista: apiData.author || 'M° Raffaela Carfora',
      file_url: audioLink,
      download_url: url
    });

  } catch (error: any) {
    console.error("Errore interno rotta YouTube:", error);
    return NextResponse.json({ error: error.message || 'Errore interno del server' }, { status: 500 });
  }
}
