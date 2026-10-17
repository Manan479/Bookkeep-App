"""tools/structure.py - draws the folder structure of this app as a picture.

Run it after the shape of the project changes:

    python tools/structure.py

It writes docs/STRUCTURE.png (and a plain text tree to the terminal). Nothing is hard-coded: the tree is
read from the folders themselves, so the picture cannot go stale the way a hand-drawn diagram does.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {'node_modules', 'dist', '.git', 'build', '.gradle', '.idea', '__pycache__', '.dsh'}
# What the files inside a folder are, so the picture says more than the names do.
NOTE = {
    'web/src/core': 'rules and arithmetic, no screens',
    'web/src/features': 'one file per screen',
    'web/src/ui': 'shared screen pieces',
    'web/src/app': 'routing and start-up',
    'web/src/platform': 'saving to the device',
    'web/src/data': 'the starting catalogue',
    'web/styles': 'theme, components, printed paper',
    'web': 'the app itself; Android and desktop both use it',
    'tests': 'each *.test.js is run in turn',
    'docs': 'the plan, the posting rules, this handoff',
    'android': 'WebView shell for the phone',
    'desktop': 'a placeholder, not built yet',
    'tools': 'probe, build, this script',
}


def tree(path, depth=0, max_depth=9):
    """(name, note, children, files) for one folder, deepest last, files first."""
    name = os.path.basename(path) or path
    dirs, files = [], []
    try:
        entries = sorted(os.listdir(path), key=lambda s: (os.path.isfile(os.path.join(path, s)), s.lower()))
    except OSError:
        entries = []
    for e in entries:
        if e in SKIP or e.startswith('.'):
            continue
        full = os.path.join(path, e)
        if os.path.isdir(full):
            if depth < max_depth:
                dirs.append(tree(full, depth + 1, max_depth))
            else:
                dirs.append((e, '', [], []))
        else:
            files.append(e)
    return (name, NOTE.get(os.path.relpath(path, ROOT).replace(os.sep, '/'), ''), dirs, files)


def collapse(node):
    """One row for a chain like src/main/java/com/bookkeep/app - nobody reads six identical branches."""
    name, note, dirs, files = node
    dirs = [collapse(d) for d in dirs]
    if not files and len(dirs) == 1:
        kid = dirs[0]
        return (name + '/' + kid[0], note or kid[1], kid[2], kid[3])
    return (name, note, dirs, files)


def rows(node, out):
    """Flatten to one row per box, parents before children, so the picture reads top to bottom."""
    name, note, dirs, files = node
    out.append((name, note, len(files)))
    for d in dirs:
        rows(d, out)
    return out


def main():
    t = collapse(tree(ROOT))
    flat = rows(t, [])

    # ---- text version, printed for the terminal and for the handoff ----
    def text(node, depth=0):
        name, note, dirs, files = node
        label = name + ('/' if dirs else '')
        print('  ' * depth + ('- ' if depth else '') + label + ('   ' + str(len(files)) + ' files' if files else ''))
        for f in files:
            print('  ' * (depth + 1) + '· ' + f)
        for d in dirs:
            text(d, depth + 1)
    text(t)

    # ---- picture ----
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20)
        bold = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 21)
        small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
    except OSError:
        font = bold = small = ImageFont.load_default()

    row_h, indent, left = 34, 44, 34
    max_line = max(len(name) for name, _, _ in flat)
    width = min(1800, indent * 5 + (max_line + 26) * 11 + 320)
    height = row_h * len(flat) + 150
    img = Image.new('RGB', (width, height), '#0f1a15')
    d = ImageDraw.Draw(img)

    d.text((left, 30), 'bookkeep', font=bold, fill='#7fd1a8')
    d.text((left, 58), 'the whole app: %d folders, %d files shown' % (len(flat), sum(f for _, _, f in flat)),
           font=small, fill='#7f9a8c')

    # stack each folder by its position in the flattened list, then draw children as a bracket
    index = {id(n): i for i, n in enumerate(iter_flat(t))}
    depth_of = {}

    def place(node, depth=0):
        depth_of[id(node)] = depth
        for c in node[2]:
            place(c, depth + 1)
    place(t)

    def walk(node, depth=0):
        i = index[id(node)]
        y = 96 + i * row_h
        x = left + depth * (indent * 2)
        name, note, dirs, files = node
        label = name + ('/' if dirs else '')
        w = 12 + len(label) * 11 + (len(note) * 7 + 16 if note else 0)
        d.rounded_rectangle([x, y, x + w, y + row_h - 8], 8, fill='#173428' if dirs else '#12241c',
                            outline='#2c5a45' if dirs else '#1d3a2d')
        d.text((x + 10, y + 3), label, font=bold if depth == 0 else font,
               fill='#c9f0da' if dirs else '#9fc4b1')
        if note:
            d.text((x + 12 + len(label) * 11, y + 5), note, font=small, fill='#6d8b7c')
        if files:
            d.text((x + w + 10, y + 4), '%d files' % len(files), font=small, fill='#5d7a6c')
        if dirs:
            rail = x + indent - 6
            last = 96 + index[id(dirs[-1])] * row_h + 14
            d.line([x + 16, y + row_h - 8, rail, y + row_h - 8], fill='#2e5b46', width=2)
            d.line([rail, y + row_h - 8, rail, last], fill='#2e5b46', width=2)
            for c in dirs:
                cy = 96 + index[id(c)] * row_h + 14
                d.line([rail, cy, x + indent * 2 - 10, cy], fill='#2e5b46', width=2)
        for c in dirs:
            walk(c, depth + 1)
    walk(t)

    out = os.path.join(ROOT, 'docs', 'STRUCTURE.png')
    img.save(out)
    print('\nwrote ' + out + '  (%dx%d)' % (width, height))


def iter_flat(node):
    yield node
    for c in node[2]:
        yield from iter_flat(c)


if __name__ == '__main__':
    main()
