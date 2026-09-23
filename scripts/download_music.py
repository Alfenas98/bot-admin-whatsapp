#!/usr/bin/env python3
import sys
import os
import subprocess

def main():
    if len(sys.argv) < 3:
        print("Uso: download_music.py <query> <output_file>")
        sys.exit(1)
    
    query = sys.argv[1]
    output = sys.argv[2]
    
    # Baixar com yt-dlp
    cmd = [
        '/tmp/yt-dlp',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--max-filesize', '15M',
        '--no-playlist',
        '--no-warnings',
        '-o', output,
        f'ytsearch1:{query}'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0 and os.path.exists(output) and os.path.getsize(output) > 1000:
            print(f"OK: {output}")
            sys.exit(0)
        else:
            print(f"Erro: {result.stderr}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Erro: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
