## apps

* extract midi code into a apps/common for reuse?

## apps/keys

* rememeber settings for octave and numkeys shown?
  * maybe expose them as selects in the settings?
* add setting for midi channel (we use 0 right now)
* add scale guides
  * select guide-mode = {off, highlight, filter}
    * off: no scale guides
    * highlight: shade keys in scale
    * filter: highlight + only send notes for keys in scale
  * scale selection is key + {major, minor, ... }
* add pitch-bend and mod wheel
  * should we show both all the time?
    * maybe add check-boxes to show/hide them (store via settings)
    * or add a button above to cycle though the configured controllers {pb,mod,...}, when cycling we should store/restore the previous value
  * for mod-wheel(s) we could also offer to add 0,1,2, ... sliders with any controller number (mod-wheel is 1)
  * https://www.midi.org/specifications-old/item/table-1-summary-of-midi-message
  * https://www.midi.org/specifications-old/item/table-3-control-change-messages-data-bytes-2
* add "Polyphonic Key Pressure" support by sliding up/down on the key?
* add "MIDI Polyphonic Expression" support
  * need to deactivate the channel selector
* add 'hold' button
  * this will cause the keys to stick also when releasing
  * turning 'hold' off will release the keys
* turn the keyboard into a webcomponent for better code style (and learning how to do it)


## apps/pads

* make a launchpad clone: 8x8 matrix + 16 control buttons
