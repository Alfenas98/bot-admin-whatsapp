#!/usr/bin/env python3
"""
Script para baixar música do YouTube via yt-dlp
Uso: python3 download_music.py <query> <output_file>
"""

import sys
import os
import subprocess
import re

def baixar_ytdlp():
    """Baixar yt-dlp se não existir"""
    ytdlp_path = '/tmp/yt-dlp'
    
    if os.path.exists(ytdlp_path):
        return ytdlp_path
    
    print('[yt-dlp] Baixando...')
    try:
        from urllib.request import urlretrieve
        url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'
        urlretrieve(url, ytdlp_path)
        os.chmod(ytdlp_path, 0o755)
        print('[yt-dlp] Baixado com sucesso')
        return ytdlp_path
    except Exception as e:
        print(f'[yt-dlp] Erro ao baixar: {e}')
        return None

def buscar_video_id(query):
    """Buscar videoId do YouTube"""
    try:
        from urllib.request import Request, urlopen
        from urllib.parse import quote
        
        url = f'https://www.youtube.com/results?search_query={quote(query)}'
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        req = Request(url, headers=headers)
        
        with urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
        
        match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        if match:
            return match.group(1)
    except Exception as e:
        print(f'[busca] Erro: {e}')
    return None

def baixar(query, output):
    """Baixar áudio do YouTube"""
    ytdlp_path = baixar_ytdlp()
    if not ytdlp_path:
        return False
    
    video_id = buscar_video_id(query)
    if not video_id:
        print('[erro] Vídeo não encontrado')
        return False
    
    video_url = f'https://youtube.com/watch?v={video_id}'
    print(f'[download] Baixando: {video_url}')
    
    cmd = [
        ytdlp_path,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '3',
        '--max-filesize', '15M',
        '--no-playlist',
        '--no-warnings',
        '--quiet',
        '-o', output,
        video_url
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180, cwd='/tmp')
        if result.returncode == 0 and os.path.exists(output) and os.path.getsize(output) > 10000:
            print(f'[sucesso] Download OK! Tamanho: {os.path.getsize(output)} bytes')
            return True
        else:
            print(f'[erro] yt-dlp falhou: {result.stderr}')
            return False
    except Exception as e:
        print(f'[erro] Exceção: {e}')
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Uso: python3 download_music.py <query> <output_file>')
        sys.exit(1)
    
    query = sys.argv[1]
    output = sys.argv[2]
    
    success = baixar(query, output)
    sys.exit(0 if success else 1)
