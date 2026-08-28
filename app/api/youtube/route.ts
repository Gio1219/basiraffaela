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

    const rapidApiKey = process.env.RAPIDAPI_KEY || 'dc455ebfa7mshb237d5621e51e3dp16fbb8jsna69b0b8cb898';
    const apiHost = 'youtube-mp36.p.rapidapi.com';

    const apiRes = await fetch(`https://${apiHost}/dl?id=${videoId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': apiHost
      }
    });

    const apiData = await apiRes.json();

    if (!apiRes.ok || (!apiData.link && !apiData.audio)) {
      return NextResponse.json({ error: 'Errore nella risposta di RapidAPI. Verifica l\'attivazione della sottoscrizione free sul piano.' }, { status: 500 });
    }

    const audioLink = apiData.link || apiData.audio;

    return NextResponse.json({
      success: true,
      titolo: apiData.title || `Brano YouTube (${videoId})`,
      artista: apiData.author || 'Accademia Toscanini',
      file_url: audioLink,
      download_url: url
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore interno del server' }, { status: 500 });
  }
}