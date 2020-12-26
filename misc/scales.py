#!/usr/bin/python3
# inkscape scales_{flat|sharp}.svg
# eog scales_{flat|sharp}_notext.svg
# evince scales.pdf
#
# for some of the conversion you need to have inkscape and pdftk installed
#
# for musical symbols see:
# https://en.wikipedia.org/wiki/Musical_Symbols_(Unicode_block)
# https://de.wikipedia.org/wiki/Unicodeblock_Notenschriftzeichen
# https://de.wikipedia.org/wiki/Unicodeblock_Verschiedene_Symbole

# TODO:
# * localize

import math
import subprocess
import svgwrite
import sys

from collections import namedtuple

dwg = None

# changing 'weight' is not smooth :/, going down a bit might just switch to a different font
STYLES = """.text {
  font-family: 'Sans';
  font-weight: 500;
  font-synthesis: weight;
  fill: #000000;
  paint-order: stroke;
  stroke: #000000;
  stroke-width: 0.1px;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}
"""

# layout
page_size = {
    # A4 paper
    'size': ('210mm', '297mm'),
    'viewBox': ('0 0 210 297'),
}

frame_pad = 2.7
inner_pad = 2.7

# styles
frame_style = {
    'stroke': '#777777',
    'stroke_width': 0.3,
    'fill': 'none'
}

staff_style = {
    'stroke_width': 0.3,
    'fill': 'none'
}

w_key_style = {
    'stroke': '#000000',
    'stroke_width': 0.3,
    'fill': '#ffffff'
}
w_key_sel_style = {
  **w_key_style,
  'fill': '#ccbbaa'
}

b_key_style = {
    'stroke': '#000000',
    'stroke_width': 0.3,
    'fill': '#000000'
}
b_key_sel_style = {
  **b_key_style,
  'fill': '#776655'
}

label_height = 4
lable_text_style = {
    'font_size': label_height,
    'font-family': 'Sans',
    'class': 'text'
}

text_height = 8
note_text_style = {
    'font_size': text_height,
    'font-family': 'FreeSerif',
    'class': 'text'
}
hn_height = text_height / 10.5   # half note height: 5 lines * 2 positions

# The chart for accidentials have somehow a different size??
acc_text_style = {
    'font_size': text_height / 2,
    'font-family': 'FreeSerif',
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
  'ces': -4,
  'cis': -4,
  'des': -5,
  'dis': -5,
  'es': -6,
  'eis': -6,
  'fes': -7,
  'fis': -7,
  'ges': -1,
  'gis': -8,
  'as': -2,
  'ais': -2,
  'b': -3,
  'h': -3,
}

bass_clef_acc_shift = {
  'ces': -2,
  'cis': -2,
  'des': -3,
  'dis': -3,
  'es': -4,
  'eis': -4,
  'fes': -5,
  'fis': -5,
  'ges': 1,
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

# the accidentials appear in the oder on the 'circle of fifths'
order_raised = ['fis', 'cis', 'gis', 'dis', 'ais', 'eis', 'his']
order_lowered = ['b', 'es', 'as', 'des', 'ges', 'ces', 'fes']

# music theory

class Scale:
  kind = ''
  steps = []
  
  def __init__(self, base):
    self.base = base
    bn =  scale_shift[self.base]
    self.key_nums = []
    for s in self.steps:
      bn = (bn + s) % 12
      self.key_nums.append(bn)
  
  def title(self):
    return self.base + '-' + self.kind
   

class Major(Scale):
  kind = 'Major'
  steps = [ 0, 2, 2, 1, 2, 2, 2, 1 ]

  def title(self):
    return self.base.capitalize() + '-' + self.kind


class Minor(Scale):
  kind = 'Minor'
  steps = [ 0, 2, 1, 2, 2, 1, 2, 2 ]

  def title(self):
    return self.base + '-' + self.kind

# layout helpers

def new_group(gx, gy, title):
  g = dwg.add(dwg.g(id='g_' + title.lower().replace(' ','_')))
  return (g, gx + inner_pad, gy + inner_pad)
    

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

def gen_accidentals(g, lx, ly, accs, scale, shift):
  if accs == '':
    return
    
  acc = accs[0]

  notes = notes_lowered
  order = order_lowered
  if acc == '♯':
    notes = notes_raised
    order = order_raised
    
  for n in order[:len(accs)]:
    lys = (ly + (hn_height * shift[n]))
    g.add(dwg.text(acc, insert=(lx, lys), **acc_text_style))
    lx += 1.7

def gen_keyboard(g, lx, ly, h, scale):
  # get note numbers for current scale
  k_num = scale.key_nums
  
  k = bk_shift[scale.base]
  wk_num = [0,2,4,5,7,9,11]
  
  x = lx
  s = (10, h)
  for i in range(8):
    if wk_num[k] in k_num:
      g.add(dwg.rect(insert=(x,ly), size=s, **w_key_sel_style))
    else:
      g.add(dwg.rect(insert=(x,ly), size=s, **w_key_style))
    x += 10
    k = (k + 1) % 7

  k = bk_shift[scale.base]
  bk_num = [1,3,-1,6,8,10,-1]

  x = lx + 6
  h *= 0.7
  s = (8, h)
  for i in range(7):
    if bk_num[k] != -1:
      if bk_num[k] in k_num:
        g.add(dwg.rect(insert=(x,ly), size=s, **b_key_sel_style))
      else:
        g.add(dwg.rect(insert=(x,ly), size=s, **b_key_style))
    x += 10
    k = (k + 1) % 7
    
  s = (4, h)
  # handle last partial key
  if bk_num[k] != -1:
    if bk_num[k] in k_num:
      g.add(dwg.rect(insert=(x,ly), size=s, **b_key_sel_style))
    else:
      g.add(dwg.rect(insert=(x,ly), size=s, **b_key_style))

  # handle first partial key
  k = (bk_shift[scale.base] + 6) % 7
  if bk_num[k] != -1:
    x = lx
    if bk_num[k] in k_num:
      g.add(dwg.rect(insert=(x,ly), size=s, **b_key_sel_style))
    else:
      g.add(dwg.rect(insert=(x,ly), size=s, **b_key_style))


def gen_scale(gx, gy, accs, scale):
  # TODO: mark positions of haltone steps?
  
  (g,x,y) = new_group(gx, gy, scale.title())
  
  # scale name
  ly = y + (label_height - 1)
  g.add(dwg.text(scale.base, insert=(x, ly), **lable_text_style))
  g.add(dwg.text(scale.kind, insert=(x, ly + 1 + label_height), **lable_text_style))
  x += 6  # indent everything

  # 1 octave on keyboard
  h = text_height * 1.25
  gen_keyboard(g, x + 11, y, h, scale)
  y += h + inner_pad 
  
  # TODO: maybe add note names?  

  note_lines = '𝄀' + '𝄚' * 14 + '𝄀'

  # 1 octave in violine key ('g' on 2nd line from below)
  ly = y + (text_height - 1)
  g.add(dwg.text(note_lines, insert=(x, ly), **note_text_style))
  g.add(dwg.text('𝄞', insert=(x, ly), **note_text_style))
  gen_accidentals(g, x + 3.75, ly, accs, scale, violine_clef_acc_shift)
  # using ly we get the 'f'-key
  gen_notation(g, x + 15, ly, violine_clef_note_shift[scale.base])
  y += text_height + inner_pad
  
  # 1 octave in bass key ('f' on the 4th line from below)
  ly = y + (text_height - 1)
  g.add(dwg.text(note_lines, insert=(x, ly), **note_text_style))
  g.add(dwg.text('𝄢', insert=(x, ly), **note_text_style))
  gen_accidentals(g, x + 3.75, ly, accs, scale, bass_clef_acc_shift)
  gen_notation(g, x + 15, ly, bass_clef_note_shift[scale.base])  
  y += text_height
  
  w = (100 + inner_pad) 
  h = (y + inner_pad) - gy
  g.add(dwg.rect(insert=(gx,gy), size=(w, h), **frame_style))

  print('scale(%s).size: x=%lf, y=%lf' % (scale.title(),w,h))
  return (w,h)


def render_page(base_file_name, scale_groups):
  global dwg
  
  dwg = svgwrite.Drawing(base_file_name + '.svg', **page_size)
  dwg.defs.add(dwg.style(STYLES))
  

  x = frame_pad
  y = frame_pad
  # TODO: add a page title?

  for sg in scale_groups:
    # TODO: add quint increase/decrease to the side

    (w,h) = gen_scale(x, y, sg.acc, sg.major)
    x += w
    (w,h) = gen_scale(x, y, sg.acc, sg.minor)
    x += w

    x = frame_pad
    y += h

  dwg.save()
  try:
    subprocess.run([
      'inkscape','--vacuum-defs', '-T', base_file_name + '.svg', 
      '-l', '-o', base_file_name + '_notxt.svg'
      ])
    subprocess.run([
      'inkscape', base_file_name + '.svg', '--export-pdf=' + base_file_name + '.pdf'
      ])
  except:
    pass

def main():
  ScaleGroup = namedtuple('ScaleGroup', ['acc','major','minor'])
  
  render_page('scales_flat', [
    ScaleGroup('', Major('c'), Minor('a')),        # +/- 0 (no accidentals)
    ScaleGroup('♭'*1, Major('f'), Minor('d')),     # -1 quint
    ScaleGroup('♭'*2, Major('b'), Minor('g')),     # -2 quints
    ScaleGroup('♭'*3, Major('es'), Minor('c')),    # -3 quints
    ScaleGroup('♭'*4, Major('as'), Minor('f')),    # -4 quints
    ScaleGroup('♭'*5, Major('des'), Minor('b')),   # -5 quints
    ScaleGroup('♭'*6, Major('ges'), Minor('es'))   # -6 quints
    ])
  render_page('scales_sharp', [
    ScaleGroup('', Major('c'), Minor('a')),        # +/- 0 (no accidentals)
    ScaleGroup('♯'*1, Major('g'), Minor('e')),     # +1 quint
    ScaleGroup('♯'*2, Major('d'), Minor('h')),     # +2 quints
    ScaleGroup('♯'*3, Major('a'), Minor('fis')),   # +3 quints
    ScaleGroup('♯'*4, Major('e'), Minor('cis')),   # +4 quints
    ScaleGroup('♯'*5, Major('h'), Minor('gis')),   # +5 quints
    ScaleGroup('♯'*6, Major('fis'), Minor('dis'))  # +6 quints
    ])
  try:
    subprocess.run([
      'pdftk', 'scales_flat.pdf', 'scales_sharp.pdf', 'cat', 'output', 'scales.pdf'
      ])
  except:
    pass


if __name__ == '__main__':
  main()
