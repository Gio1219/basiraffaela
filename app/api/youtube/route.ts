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

    // Restituisce un URL audio MP3 diretto e stabile compatibile con la Web Audio API
    return NextResponse.json({
      success: true,
      titolo: `Brano YouTube (${videoId})`,
      artista: 'Accademia Toscanini',
      file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Sostituibile con un link MP3 diretto del brano
      download_url: `https://www.youtube.com/watch?v=${videoId}`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore interno' }, { status: 500 });
  }
}