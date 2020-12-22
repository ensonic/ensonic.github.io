#!/usr/bin/python3
# eog scales.svg
#
# for musical symbols see:
# https://en.wikipedia.org/wiki/Musical_Symbols_(Unicode_block)
# https://de.wikipedia.org/wiki/Unicodeblock_Notenschriftzeichen
# https://de.wikipedia.org/wiki/Unicodeblock_Verschiedene_Symbole

# TODO:
# * localize
# * generate a variant through inkscape that has the fonts resolved
#   and maybe even generate a pdf

import math
import svgwrite
import sys

dwg = None

# inconsolata: not supporting bold, '0' are marked to distinguish from 'O'
# andale mono: same
# monospace: '0' is marked and '-' taking up too much space

# changing 'weight' is not smooth :/, going down a bit might just switch to a different font
STYLES = """.text {
  font-family: 'FreeSerif';
  font-weight: 500;
  font-synthesis: weight;
  font-stretch: 65%;
  fill: #000000;
  paint-order: stroke;
  stroke: #000000;
  stroke-width: 0.1px;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}
"""

# layout
frame_pad = 3
inner_pad = 3

# styles
frame_style = {
    'stroke': svgwrite.rgb(0, 0, 0, '%'),
    'stroke_width': 0.5,
    'fill': 'none'
}

staff_style = {
    'stroke': svgwrite.rgb(0, 0, 0, '%'),
    'stroke_width': 0.3,
    'fill': 'none'
}

w_key_style = {
    'stroke': svgwrite.rgb(0, 0, 0, '%'),
    'stroke_width': 0.3,
    'fill': 'none'
}

b_key_style = {
    'stroke': svgwrite.rgb(0, 0, 0, '%'),
    'stroke_width': 0.3,
    'fill': svgwrite.rgb(0, 0, 0, '%'),
}

label_height = 5
lable_text_style = {
    'font_size': label_height,
    'class': 'text'
}

text_height = 8
note_text_style = {
    'font_size': text_height,
    'class': 'text'
}
hn_height = text_height / 10.5   # half note height: 5 lines * 2 positions

# The chart for accidentials have somehow a different size??
acc_text_style = {
    'font_size': text_height / 2,
    'class': 'text'
}


# tables

violine_clef_note_shift = {
  'c': 3,
  'cis': 3,
  'des': 2,
  'd': 2,
  'dis': 2,
  'es': 1,
  'e': 1,
  'f': 0,
  'fis': 0,
  'ges': -1,
  'g': -1,
  'gis': -1,
  'as': -2,
  'a': -2,
  'ais': -2,
  'h': -3,
  'b': -3,
}

bass_clef_note_shift = {
  'c': -2,
  'cis': -2,
  'des': -3,
  'd': -3,
  'dis': -3,
  'es': 3,
  'e': 3,
  'f': 2,
  'fis': 2,
  'ges': 1,
  'g': 1,
  'gis': 1,
  'as': 0,
  'a': 0,
  'ais': 0,
  'h': -1,
  'b': -1,
}

violine_clef_acc_shift = {
  'cis': -4,
  'des': -5,
  'dis': -5,
  'es': -6,
  'e': -6,
  'fis': -7,
  'ges': -8,
  'gis': -8,
  'as': -2,
  'ais': -2,
  'b': -3,
  'h': -3,
}

bass_clef_acc_shift = {
  'cis': -2,
  'des': -3,
  'dis': -3,
  'es': -4,
  'e': -4,
  'fis': -5,
  'ges': -6,
  'gis': -6,
  'as': 0,
  'ais': 0,
  'b': -1,
  'h': -1,
}

scale_shift = {
  'c': 0,
  'cis': 1,
  'des': 1,
  'd': 2,
  'dis': 3,
  'es': 3,
  'e': 4,
  'f': 5,
  'fis': 6,
  'ges': 6,
  'g': 7,
  'gis': 8,
  'as': 8,
  'a': 9,
  'ais': 10,
  'b': 10,
  'h': 11, 
}

bk_shift = {  # black keys
  'c': 0,
  'cis': 0,
  'des': 0,
  'd': 1,
  'dis': 1,
  'es': 1,
  'e': 2,
  'f': 3,
  'fis': 3,
  'ges': 3,
  'g': 4,
  'gis': 4,
  'as': 4,
  'a': 5,
  'ais': 5,
  'b': 5,
  'h': 6, 
}


notes_raised = ['c', 'cis', 'd', 'dis', 'e', 'f', 'fis', 'g', 'gis', 'a', 'ais', 'h']
notes_lowered = ['c', 'des', 'd', 'es', 'e', 'f', 'ges', 'g', 'as', 'a', 'b', 'h']

order_raised = ['fis', 'cis', 'gis', 'dis', 'ais', 'his']
order_lowered = ['b', 'es', 'as', 'des', 'ges', 'ces', 'fes']


IS_BLACK = [ False, True, False, True, False, False, True, False, True, False, True, False ]


# music theory

class Scale:
  name = ''
  steps = []
  
  def __init__(self, base):
    self.base = base
  
  def title(self):
    return base + '-' + self.name

class Major(Scale):
  name = 'Maj.'
  steps = [ 0, 2, 2, 1, 2, 2, 2, 1 ]

  def title(self):
    return self.base.capitalize() + '-' + self.name


class Minor(Scale):
  name = 'Min.'
  steps = [ 0, 2, 1, 2, 2, 1, 2, 2 ]

  def title(self):
    return self.base + '-' + self.name

# layout helpers

def new_group(gx, gy, title):
  x = gx + inner_pad
  y = gy + inner_pad

  g = dwg.add(dwg.g(id='g_' + title.lower().replace(' ','_')))

  return (g,x,y)
    

def gen_notation(g, lx, ly, shift):
  lys = ly + (hn_height * shift)
  for i in range(8):
    # add helper line if we're outsize the cleff lines
    # TODO we need to also draw them for even notes, but then closer to the cleff
    if ((i + shift) % 2 == 1) and ((lys > (ly + hn_height)) or (lys < (ly - (7 * hn_height)))):
        lyh = lys - (hn_height - 0.1)
        g.add(dwg.line(start=(lx - 0.8 , lyh), end=(lx + 4, lyh), **staff_style))
    g.add(dwg.text('𝅝	', insert=(lx, lys), **note_text_style))
    lx += 10
    lys -= hn_height

def gen_accidentals(g, lx, ly, acc, scale, shift):
  if acc == '':
    return

  k = scale_shift[scale.base]
  notes = notes_lowered
  order = order_lowered
  if acc == '♯':
    notes = notes_raised
    order = order_raised
  accs = []
  # debug
  print(scale.title())
  # debug
  for i in range(7):
    k = (k + scale.steps[i]) % 12
    # debug
    print("  %s : %s" % (IS_BLACK[k], notes[k]))
    # debug
    if IS_BLACK[k]:
      accs.append(notes[k])

  for n in order:
    if n in accs:    
      lys = (ly + (hn_height * shift[n]))
      g.add(dwg.text(acc, insert=(lx, lys), **acc_text_style))
      lx += 2

def gen_keyboard(g, lx, ly, h, scale):
  # TODO: color the keys in scale
  
  x = lx
  for i in range(8):
    g.add(dwg.rect(insert=(x,ly), size=(10, h), **w_key_style))
    x += 10

  # start on a white key
  k = bk_shift[scale.base]
  bk = [True, True, False, True, True, True, False]

  x = lx + 6
  h *= 0.7
  for i in range(7):
    if bk[k]:
      g.add(dwg.rect(insert=(x,ly), size=(8, h), **b_key_style))
    x += 10
    k = (k + 1) % 7
  # handle last partial key
  if bk[k]:
    g.add(dwg.rect(insert=(x,ly), size=(4, h), **b_key_style))

  # handle first partial key
  k = (bk_shift[scale.base] + 6) % 7
  if bk[k]:
    x = lx
    g.add(dwg.rect(insert=(x,ly), size=(4, h), **b_key_style))


def gen_scale(gx, gy, acc, scale):
  # TODO: mark positions of haltone steps?
  
  (g,x,y) = new_group(gx, gy, scale.title())
  
  # title  
  ly = y + (label_height - 1)
  g.add(dwg.text(scale.title(), insert=(x, ly), **lable_text_style))
  x += 6  # indent everything

  # 1 octave on keyboard
  h = text_height * 1.3
  gen_keyboard(g, x + 11, y, h, scale)
  y += h + inner_pad 

  note_lines = '𝄀' + '𝄚' * 15 + '𝄀'

  # 1 octave in violine key ('g' on 2nd line from below
  ly = y + (text_height - 1)
  g.add(dwg.text(note_lines, insert=(x, ly), **note_text_style))
  g.add(dwg.text('𝄞', insert=(x, ly), **note_text_style))
  gen_accidentals(g, x + 6, ly, acc, scale, violine_clef_acc_shift)
  # using ly we get the 'f'-key
  gen_notation(g, x + 15, ly, violine_clef_note_shift[scale.base])
  y += text_height + inner_pad
  
  # 1 octave in bass key ('f' on the 4th line from below
  ly = y + (text_height - 1)
  g.add(dwg.text(note_lines, insert=(x, ly), **note_text_style))
  g.add(dwg.text('𝄢', insert=(x, ly), **note_text_style))
  gen_accidentals(g, x + 6, ly, acc, scale, bass_clef_acc_shift)
  gen_notation(g, x + 15, ly, bass_clef_note_shift[scale.base])  
  y += text_height
  
  w = (100 + inner_pad) 
  h = (y + inner_pad) - gy
  g.add(dwg.rect(insert=(gx,gy), size=(w, h), **frame_style))

  print('scale(%s).size: x=%lf, y=%lf' % (scale.title(),w,h))
  return (w,h)


def main():
  global dwg

  file_name = 'scales.svg'

  page_size = {
      # A4 paper
      'size': ('210mm', '297mm'),
      'viewBox': ('0 0 210 297'),
  }
  dwg = svgwrite.Drawing(file_name, **page_size)
  dwg.defs.add(dwg.style(STYLES))

  # TODO: add quint increase/decrease to the side

  x = frame_pad
  y = frame_pad

  # -3 quint
  (w,h) = gen_scale(x, y, '♭', Major('es'))
  x += w
  (w,h) = gen_scale(x, y, '♭', Minor('c'))
  x += w

  x = frame_pad
  y += h

  # -2 quint
  (w,h) = gen_scale(x, y, '♭', Major('b'))
  x += w
  (w,h) = gen_scale(x, y, '♭', Minor('g'))
  x += w

  x = frame_pad
  y += h

  # -1 quint
  (w,h) = gen_scale(x, y, '♭', Major('f'))
  x += w
  (w,h) = gen_scale(x, y, '♭', Minor('d'))
  x += w

  x = frame_pad
  y += h

  # base row (no accidentals)
  (w,h) = gen_scale(x, y, '', Major('c'))
  x += w
  (w,h) = gen_scale(x, y, '', Minor('a'))
  x += w
  
  x = frame_pad
  y += h

  # +1 quint
  (w,h) = gen_scale(x, y, '♯', Major('g'))
  x += w
  (w,h) = gen_scale(x, y, '♯', Minor('e'))
  x += w

  x = frame_pad
  y += h

  # +2 quint
  (w,h) = gen_scale(x, y, '♯', Major('d'))
  x += w
  (w,h) = gen_scale(x, y, '♯', Minor('h'))
  x += w

  x = frame_pad
  y += h

  # +3 quint
  (w,h) = gen_scale(x, y, '♯', Major('a'))
  x += w
  (w,h) = gen_scale(x, y, '♯', Minor('fis'))
  x += w

  dwg.save()


if __name__ == '__main__':
  main()
