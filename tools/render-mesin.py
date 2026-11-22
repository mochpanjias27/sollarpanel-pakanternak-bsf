"""Render ulang gambar mesin dari model 3D → assets/img/render/<id>.webp & <id>-sm.webp.
Butuh: Google Chrome, `pip install playwright pillow`.
Jalankan dari akar proyek:
    python3 -m http.server 8765 &      # server statis
    python3 tools/render-mesin.py      # semua mesin, atau: ... peletizer pencacah
"""
import asyncio, sys, os
from PIL import Image
from playwright.async_api import async_playwright
IDS = ['pencacah','komposter','ayak-kompos','penepung-kompos','mixer-granul','pan-granulator',
       'pencuci-maggot','pengering-maggot','penepung-maggot','mixer-pakan','peletizer']
ids = sys.argv[1:] or IDS
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':900,'height':700}, device_scale_factor=1)
        logs=[]
        pg.on('console', lambda m: logs.append(m.text))
        pg.on('pageerror', lambda e: logs.append('ERR '+str(e)))
        for i in ids:
            await pg.goto(f'http://localhost:8765/tools/render.html?mesin={i}&w=800&h=600')
            await pg.wait_for_function('window.siap === true', timeout=30000)
            await pg.locator('#v').screenshot(path=f'assets/img/render/{i}.png', omit_background=True)
            im = Image.open(f'assets/img/render/{i}.png').convert('RGBA')
            bb = im.getbbox(); im = im.crop((max(0, bb[0]-20), max(0, bb[1]-20), min(im.width, bb[2]+20), min(im.height, bb[3]+20)))
            im.save(f'assets/img/render/{i}.webp', 'WEBP', quality=85)
            t = im.copy(); t.thumbnail((480, 480)); t.save(f'assets/img/render/{i}-sm.webp', 'WEBP', quality=82)
            os.remove(f'assets/img/render/{i}.png')
            print('ok', i)
        print('\n'.join(logs[:20]))
        await b.close()
asyncio.run(main())
