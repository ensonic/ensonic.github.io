## apps

* extract cookie/midi code into a apps/common for reuse?

## apps/skel

* rethink the menu button
  * mabe have the hamburger icon on the first (actual app) page, then only add
    the settings/help/etc to the menu and when on a menu page change the
    hamburger icon to a 'return' icon that gets you straight back to the main page

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
  * what about scale-detection? 
    * press a bunch of keys and show possible scales
    * or listen to midi in?
    * might need a reset button to flush the keys in the current filter
* pitch-bend and mod wheel visibility, should we show both all the time?
  * maybe add check-boxes to show/hide them (store via settings)
  * or add a button above to cycle though the configured controllers {pb,mod,...}, when cycling we should store/restore the previous value
  * for mod-wheel(s) we could also offer to add 0,1,2, ... sliders with any controller number (mod-wheel is 1) and cycle them trough
* add "Polyphonic Key Pressure" support by sliding up/down on the key?
* add "MIDI Polyphonic Expression" support
  * need to deactivate the channel selector
* add 'hold' button
  * this will cause the keys to stick also when releasing
  * turning 'hold' off will release the keys
* turn the keyboard into a webcomponent for better code style (and learning how to do it)

Links:
  * https://www.midi.org/specifications-old/item/table-1-summary-of-midi-message
  * https://www.midi.org/specifications-old/item/table-3-control-change-messages-data-bytes-2


## apps/pads

* add settings to customize labels to better fit with driven-by-moss
  * this would also mean that we label the 8x8 pads when pressing shift
  * for that we can probably use a layer and just change the visibility
* use Navigator.vibrate() as a metronome?
  https://developer.mozilla.org/de/docs/Web/API/Navigator/vibrate
* color the borders too?
  * if we'd use hsl() instead rgb(), we could better deal with extreme colors like black and white
* can be use the WebAnimation API to sync the color animations?
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API

## apps/lens

* extract midi monitor code to a separate app and remove the tab from the other apps
