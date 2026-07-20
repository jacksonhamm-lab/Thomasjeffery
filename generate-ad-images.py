"""Crop existing site imagery to Google Ads asset dimensions.
Output: ad-images/ad-{slot}-{ratio}.jpg — square (1:1) + landscape (1.91:1) per slot."""

from PIL import Image
import os

SOURCES = {
    'model-hero':   ('office-hero.webp',                 'top'),
    'model-env':    ('about-fitting.webp',               'center'),
    'fabric':       ('office-swatches.webp',             'center'),
    'storefront':   ('about-storefront.webp',            'center'),
    'consultation': ('office-consultation-tight.webp',   'center'),
    'coppley':      ('brands-coppley.webp',              'center'),
}

OUT_DIR = 'ad-images'


def crop_to_ratio(img, target_ratio, anchor='center'):
    w, h = img.size
    current_ratio = w / h
    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target_ratio)
        if anchor == 'top':
            top = int((h - new_h) * 0.08)
        else:
            top = (h - new_h) // 2
        return img.crop((0, top, w, top + new_h))


def crop_square(img, anchor='center'):
    w, h = img.size
    size = min(w, h)
    left = (w - size) // 2
    if anchor == 'top':
        top = int((h - size) * 0.15)
    else:
        top = (h - size) // 2
    return img.crop((left, top, left + size, top + size))


os.makedirs(OUT_DIR, exist_ok=True)

for slot, (src, anchor) in SOURCES.items():
    img = Image.open(src).convert('RGB')

    landscape = crop_to_ratio(img, 1.91, anchor=anchor)
    landscape.save(f'{OUT_DIR}/ad-{slot}-landscape.jpg', 'JPEG', quality=90, optimize=True)

    square = crop_square(img, anchor=anchor)
    square.save(f'{OUT_DIR}/ad-{slot}-square.jpg', 'JPEG', quality=90, optimize=True)

    print(f'{slot}: landscape {landscape.size}, square {square.size} (anchor={anchor})')

print(f'\nDone. {len(SOURCES) * 2} files written to {OUT_DIR}/')
