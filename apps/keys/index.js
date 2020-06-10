// Globals to access them later.
let midiIn = [];
let midiOut = [];
let notesOn = new Map();

function initUI() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(reg =>
          console.log('Service worker successfully registered for ${reg.scope}')
        )
        .catch(err => 
          console.log('Service worker registration failed: ${err}')
        );
  }

  document.getElementById("defaultPage").click();
  window.onclick = function(event) {
    if (!event.target.matches('.pagemenu')) {
      hideMenu();
    }
  }

  var asv = new PianoKeyboard();
  connectMidi();
  asv.draw();
}

function showMenu() {
  document.getElementById("pages").classList.toggle("show");
}

function hideMenu() {
  var items = document.getElementsByClassName("dropdown-content");
  var i;
  for (i = 0; i < items.length; i++) {
    var openItem = items[i];
    if (openItem.classList.contains('show')) {
      openItem.classList.remove('show');
    }
  }
}
  
function openPage(evt, pageName) {
  var i, tabcontent, tablinks;
  pages = document.getElementsByClassName("pagecontent");
  for (i = 0; i < pages.length; i++) {
    pages[i].style.display = "none";
  }
  links = document.getElementsByClassName("pagelink");
  for (i = 0; i < links.length; i++) {
    links[i].className = links[i].className.replace(" active", "");
  }
  document.getElementById(pageName).style.display = "block";
  evt.currentTarget.className += " active";
}

// Start up WebMidi.
function connectMidi() {
  navigator.requestMIDIAccess()
    .then(
      (midi) => midiReady(midi),
      (err) => console.log('Something went wrong', err));
}

function midiReady(midi) {
  // Also react to device changes.
  midi.addEventListener('statechange', (event) => initDevices(event.target), {passive: true});
  initDevices(midi);
}

function initDevices(midi) {
  // Reset.
  midiIn = [];
  midiOut = [];

  // MIDI devices that send you data.
  const inputs = midi.inputs.values();
  for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
    midiIn.push(input.value);
  }

  // MIDI devices that you send data to.
  const outputs = midi.outputs.values();
  for (let output = outputs.next(); output && !output.done; output = outputs.next()) {
    midiOut.push(output.value);
  }

  displayDevices();
  startListening();
}

function setSelectedValue(selectObj, valueToSet) {
    for (var i = 0; i < selectObj.options.length; i++) {
        if (selectObj.options[i].text == valueToSet) {
            selectObj.options[i].selected = true;
            return;
        }
    }
}

function displayDevices() {
  selectIn.innerHTML = midiIn.map(device => `<option>${device.name}</option>`).join('');
  const defaultInput = readCookie('defaultInput');
  //console.log("default input: " + defaultInput);
  if (defaultInput) {
	  setSelectedValue(selectIn, defaultInput);
  }
  selectOut.innerHTML = midiOut.map(device => `<option>${device.name}</option>`).join('');
  const defaultOutput = readCookie('defaultOutput');
  //console.log("default output: " + defaultOutput);
  if (defaultOutput) {
  	setSelectedValue(selectOut, defaultOutput);
  }
}

function startListening() {
  outputIn.innerHTML = '';

  // Start listening to MIDI messages.
  for (const input of midiIn) {
    input.addEventListener('midimessage', midiMessageReceived, {passive: true});
  }
}

function midiMessageReceived(event) {
  // MIDI commands we care about. See
  // http://webaudio.github.io/web-midi-api/#a-simple-monophonic-sine-wave-midi-synthesizer.
  const NOTE_ON = 9;
  const NOTE_OFF = 8;

  const cmd = event.data[0] >> 4;
  const pitch = event.data[1];
  const velocity = (event.data.length > 2) ? event.data[2] : 1;

  // You can use the timestamp to figure out the duration of each note.
  const timestamp = Date.now();

  // Note that not all MIDI controllers send a separate NOTE_OFF command for every NOTE_ON.
  if (cmd === NOTE_OFF || (cmd === NOTE_ON && velocity === 0)) {
    outputIn.innerHTML += `🎧 from ${event.srcElement.name} note off: pitch:<b>${pitch}</b>, velocity: <b>${velocity}</b> <br/>`;

    // Complete the note!
    const note = notesOn.get(pitch);
    if (note) {
      outputIn.innerHTML += `🎵 pitch:<b>${pitch}</b>, duration:<b>${timestamp - note}</b> ms. <br>`;
      notesOn.delete(pitch);
    }
  } else if (cmd === NOTE_ON) {
    outputIn.innerHTML += `🎧 from ${event.srcElement.name} note off: pitch:<b>${pitch}</b>, velocity: <b>${velocity}</b> <br/>`;

    // One note can only be on at once.
    notesOn.set(pitch, timestamp);
  }

  // Scroll to the bottom of this div.
  outputIn.scrollTop = outputIn.scrollHeight;
}

function sendMidiNoteOn(pitch, velocity) {
  const NOTE_ON = 0x90;  // last four bits is channel
  const msg = [NOTE_ON, pitch, velocity];

  midiOut[selectOut.selectedIndex].send(msg);
}

function sendMidiNoteOff(pitch, velocity) {
  const NOTE_OFF = 0x80;  // last four bits is channel
  const msg = [NOTE_OFF, pitch, velocity];

  midiOut[selectOut.selectedIndex].send(msg);
}

function sendMidiPitchBend(value) {
  var pitchbend = Math.trunc(4096 + (value * 4096));
  var msb = pitchbend >> 7;
  var lsb = pitchbend & 0x7F;

  const PITCH_BEND = 0xE0;  // last four bits is channel
  const msg = [PITCH_BEND, lsb, msb];

  midiOut[selectOut.selectedIndex].send(msg);
}

function sendMidiControlChange(controller, value) {
  const CONTROL_CHANGE = 0xB0;  // last four bits is channel
  const msg = [CONTROL_CHANGE, controller, value];

  midiOut[selectOut.selectedIndex].send(msg);
}

// settiings

function saveDefaults() {
  // one cookie can take up to 4096 bytes

  const input = selectIn.options[selectIn.selectedIndex].text;
  saveCookie('defaultInput', input)
  const output = selectOut.options[selectOut.selectedIndex].text;
  saveCookie('defaultOutput', output)
}

function saveCookie(name, value) {
    var cookie = name + '=' + JSON.stringify(value) + "; secure; samesite=none";
    document.cookie = cookie;
}

function readCookie(name) {
    var result = document.cookie.match(new RegExp(name + '=([^;]+)'));
    result && (result = JSON.parse(result[1]));
    return result;
}

function PianoKeyboard() {

  const isMobile = !!navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i);
  const evtListener = isMobile ? ['touchstart', 'touchend'] :['mousedown', 'mouseup'];

  var __octave = 3;
  var __keys = 3;
  const nKeysChoices = [7,10,14,17,21];

  // Note key names
  const keys = {
    'C': 0,
    'C#': 1,
    'D': 2,
    'D#': 3,
    'E': 4,
    'F': 5,
    'F#': 6,
    'G': 7,
    'G#': 8,
    'A': 9,
    'A#': 10,
    'B': 11
  };

  // Key bindings, notes to keyCodes.
  // TODO: this is for a US keyboard
  const keyboard = {
    50: 'C#,0',  /* 2 */
    51: 'D#,0',  /* 3 */
    53: 'F#,0',  /* 5 */
    54: 'G#,0',  /* 6 */
    55: 'A#,0',  /* 7 */
    57: 'C#,1',   /* 9 */
    48: 'D#,1',   /* 0 */
    187: 'F#,1',  /* + */
    61: 'F#,1',  /* = */
    81: 'C,0',  /* Q */
    87: 'D,0',  /* W */
    69: 'E,0',  /* E */
    82: 'F,0',  /* R */
    84: 'G,0',  /* T */
    89: 'A,0',  /* Y */
    85: 'B,0',  /* U */
    73: 'C,1',   /* I */
    79: 'D,1',   /* O */
    80: 'E,1',   /* P */
    219: 'F,1',  /* [ */
    221: 'G,1',  /* ] */
    65: 'G#,1',  /* A */
    83: 'A#,1',  /* S */
    70: 'C#,2',  /* F */
    71: 'D#,2',  /* G */
    74: 'F#,2',  /* J */
    75: 'G#,2',  /* K */
    76: 'A#,2',  /* L */
    90: 'A,1',   /* Z */
    88: 'B,1',   /* X */
    67: 'C,2',   /* C */
    86: 'D,2',   /* V */
    66: 'E,2',   /* B */
    78: 'F,2',   /* N */
    77: 'G,2',   /* M */
    188: 'A,2',  /* , */
    190: 'B,2'   /* . */
  };

  // Create a reverse lookup table.
  var reverseLookupText = {};
  var reverseLookup = {};
  for (var i in keyboard) {
    var val;
    // Alternate mappings for international keyboard layouts
    switch (i | 0) {
      case 187:   // »
        val = 61; // +
        break;
      case 219:
        val = 91; // [
        break;
      case 221:
        val = 93; // ]
        break;
      case 188:
        val = 44; // ,
        break;
      case 190:
        val = 46; // ,
        break;
      default:
        val = i;
        break;
    }
    reverseLookupText[keyboard[i]] = val;
    reverseLookup[keyboard[i]] = i;
  }

  // Keys you have pressed down.
  var keysPressed = [];
  var visualKeyboard = null;

  // Change octave
  var changeOctave = function(x) {
    __octave += x | 0;
    // TODO: if we only show one or two octaves, bump upper limmit
    __octave = Math.min(5, Math.max(1, __octave));

    var octaveName = document.getElementsByName('oct-label');
    var i = octaveName.length;
    while (i--) {
      var val = parseInt(octaveName[i].getAttribute('value'));
      octaveName[i].innerHTML = (val + __octave);
    }
    updateKeyRange();
  };

  // Change keys shown
  var changeNumKeysShown = function(x) {
    __keys += x | 0;
    __keys = Math.min(nKeysChoices.length - 1, Math.max(0, __keys));
    // TODO: if we increase this, check if we need to adjust __octave

    document.getElementById('keyboard').innerHTML = '';    
    create();
    updateKeyRange();
  };

  var updateKeyRange = function() {
    var nOctavesFlt = (nKeysChoices[__keys] / 7) - 1;
    var nOctaves = Math.trunc(nOctavesFlt);

    document.getElementById('oct-lower').innerHTML = __octave;
    document.getElementById('oct-upper').innerHTML = __octave + nOctaves;
    document.getElementById('key-upper').innerHTML = (nOctaves === nOctavesFlt) ? 'B' : 'E';
  }

  
  // Generate keyboard
  // This is our main keyboard element! It's populated dynamically based on what you've set above.
  var create = function() {
    visualKeyboard = document.getElementById('keyboard');

    var iWhite = 0;
    const nWhite = nKeysChoices[__keys];
    // key sizes
    const wkw = 100 / nWhite;
    const bkw = wkw * 0.8;
    const bkoff = wkw / 1.8;

    while (iWhite < nWhite) {
      for (var n in keys) {
        if (iWhite >= nWhite) {
          break;
        }

        var oct = Math.trunc(iWhite / 7);
        var thisKey = document.createElement('div');
        if (n.length > 1) {
          thisKey.className = 'black key';
          thisKey.style.width = bkw + '%';
          thisKey.style.height = '120px';
          thisKey.style.left = (wkw * (iWhite - 1)) + bkoff + '%';
        } else {
          thisKey.className = 'white key';
          thisKey.style.width = wkw + '%';
          thisKey.style.height = '200px';
          thisKey.style.left = wkw * iWhite + '%';
          iWhite++;
        }
        var label = document.createElement('div');
        var keyid = n + ',' + oct;
        label.className = 'label';
        var pcKeyLabel = isMobile ? '' : '<b>' + String.fromCharCode(reverseLookupText[keyid]) + '</b>';
        label.innerHTML = pcKeyLabel + '<br /><br />' + n[0] + '<span name="oct-label" value="' + oct + '">' + (__octave + oct) + '</span>' + (n.length>1 ? n[1] : '');
        thisKey.appendChild(label);
        thisKey.setAttribute('id', 'KEY_' + keyid);
        thisKey.addEventListener(evtListener[0], (function(keycode) {
          return function(e) {
            // console.log("press: " + keycode);
            // e.changedTouches is a TouchList object tl with  tl.length and
            // tl.item(i) is a Touch object t with t.identifier
            playNote({
              keyCode: keycode
            });
          }
        })(reverseLookup[keyid]), {passive: true});
        thisKey.addEventListener(evtListener[1], (function(keycode) {
          return function(e) {
            // console.log("release: " + keycode);
            // e.changedTouches is a TouchList object tl with  tl.length and
            // tl.item(i) is a Touch object t with t.identifier
            stopNote({
              keyCode: keycode
            });
          }
        })(reverseLookup[keyid]), {passive: true});
        visualKeyboard[keyid] = thisKey;
        visualKeyboard.appendChild(thisKey);
      }
    }
  };
  
  // Convert keys to midi note numbers
  var noteToMidiNum = function(arrPlayNote) {
    var note = arrPlayNote[0];
    var octaveModifier = arrPlayNote[1] | 0;
    var octave = __octave + octaveModifier + 1;
    var key = keys[note];

    //console.log("note: " + note + ", oct: " + __octave + " + " + octaveModifier + ", key: " + key)
    /*
     * 36 - C2 - 65.41 Hz - https://www.inspiredacoustics.com/en/MIDI_note_numbers_and_center_frequencies
     *                    - https://newt.phys.unsw.edu.au/jw/notes.html
     */
    return (octave * 12) + key;
  };

  // Detect keypresses, play notes.
  var playNote = function(e) {
    if (keysPressed.includes(e.keyCode)) {
      return false;
    }
    // console.log("play: " + e.keyCode);
    keysPressed.push(e.keyCode);

    switch (e.keyCode) {
      case 37: // left
        changeOctave(-1);
        break;
      case 39: // right
        changeOctave(1);
        break;
    }

    if (keyboard[e.keyCode]) {
      if (visualKeyboard[keyboard[e.keyCode]]) {
        var thisKey = visualKeyboard[keyboard[e.keyCode]];
        thisKey.style.backgroundColor = thisKey.className.includes('black') ? '#333' : '#ddd';
        thisKey.style.marginTop = '5px';
        thisKey.style.boxShadow = 'none';
      }
      sendMidiNoteOn(noteToMidiNum(keyboard[e.keyCode].split(',')), inputVelocity.value)
    } else {
      return false;
    }
  }

  // Remove key bindings once note is done.
  var stopNote = function(e) {
    var ix = keysPressed.indexOf(e.keyCode);

    if (ix !== -1 ) {
      if (visualKeyboard[keyboard[e.keyCode]]) {
        var thisKey = visualKeyboard[keyboard[e.keyCode]];
        thisKey.style.backgroundColor = '';
        thisKey.style.marginTop = '';
        thisKey.style.boxShadow = '';
      }
      keysPressed.splice(i, 1);
      if (keyboard[e.keyCode]) {
          sendMidiNoteOff(noteToMidiNum(keyboard[e.keyCode].split(',')), inputVelocity.value)        
      }
    }
  }

  // Set up global event listeners
  window.addEventListener('keydown', playNote, {passive: true});
  window.addEventListener('keyup', stopNote, {passive: true});
  document.getElementById('oct-down').addEventListener('click', function() {
    changeOctave(-1);
  }, {passive: true});
  document.getElementById('oct-up').addEventListener('click', function() {
    changeOctave(1);
  }, {passive: true});

  document.getElementById('num-down').addEventListener('click', function() {
    changeNumKeysShown(-1);
  }, {passive: true});
  document.getElementById('num-up').addEventListener('click', function() {
    changeNumKeysShown(1);
  }, {passive: true});

  Object.defineProperty(this, 'draw', {
    value: create
  });

}

