// Globals to access them later.
let midiIn = [];
let midiOut = [];
let notesOn = new Map();

function initUI() {
  document.getElementById("defaultPage").click();
  window.onclick = function(event) {
    if (!event.target.matches('.pagemenu')) {
      var items = document.getElementsByClassName("dropdown-content");
      var i;
      for (i = 0; i < items.length; i++) {
        var openItem = items[i];
        if (openItem.classList.contains('show')) {
          openItem.classList.remove('show');
        }
      }
    }
  }

  var asv = new AudioSynthView();
  connect();
  asv.draw();
}

function showMenu() {
  document.getElementById("pages").classList.toggle("show");
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
function connect() {
  navigator.requestMIDIAccess()
    .then(
      (midi) => midiReady(midi),
      (err) => console.log('Something went wrong', err));
}

function midiReady(midi) {
  // Also react to device changes.
  midi.addEventListener('statechange', (event) => initDevices(event.target));
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
  console.log("default input: " + defaultInput);
  if (defaultInput) {
	  setSelectedValue(selectIn, defaultInput);
  }
  selectOut.innerHTML = midiOut.map(device => `<option>${device.name}</option>`).join('');
  const defaultOutput = readCookie('defaultOutput');
  console.log("default output: " + defaultOutput);
  if (defaultOutput) {
  	setSelectedValue(selectOut, defaultOutput);
  }
}

function startListening() {
  outputIn.innerHTML = '';

  // Start listening to MIDI messages.
  for (const input of midiIn) {
    input.addEventListener('midimessage', midiMessageReceived);;
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
	const NOTE_ON = 0x90;
  const msg = [NOTE_ON, pitch, velocity];

  const device = midiOut[selectOut.selectedIndex];
	device.send(msg); // this can take a Date.now() + duration in ms as a 2nd param
}

function sendMidiNoteOff(pitch, velocity) {
	const NOTE_OFF = 0x80;
  const msg = [NOTE_OFF, pitch, velocity];

  const device = midiOut[selectOut.selectedIndex];
	device.send(msg); // this can take a Date.now() + duration in ms as a 2nd param
}

// settiings

function saveDefaults() {
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

function AudioSynthView() {

  var isMobile = !!navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i);
  if (isMobile) {
    var evtListener = ['touchstart', 'touchend'];
  } else {
    var evtListener = ['mousedown', 'mouseup'];
  }

  var __octave = 4;

  // Change octave
  var fnChangeOctave = function(x) {

    x |= 0;

    __octave += x;

    __octave = Math.min(5, Math.max(3, __octave));

    var octaveName = document.getElementsByName('OCTAVE_LABEL');
    var i = octaveName.length;
    while (i--) {
      var val = parseInt(octaveName[i].getAttribute('value'));
      octaveName[i].innerHTML = (val + __octave);
    }

    document.getElementById('OCTAVE_LOWER').innerHTML = __octave - 1;
    document.getElementById('OCTAVE_UPPER').innerHTML = __octave + 1;

  };

  // Key bindings, notes to keyCodes.
  var keyboard = {
    /* 2 */
    50: 'C#,-1',
    /* 3 */
    51: 'D#,-1',
    /* 5 */
    53: 'F#,-1',
    /* 6 */
    54: 'G#,-1',
    /* 7 */
    55: 'A#,-1',
    /* 9 */
    57: 'C#,0',
    /* 0 */
    48: 'D#,0',
    /* + */
    187: 'F#,0',
    61: 'F#,0',
    /* Q */
    81: 'C,-1',
    /* W */
    87: 'D,-1',
    /* E */
    69: 'E,-1',
    /* R */
    82: 'F,-1',
    /* T */
    84: 'G,-1',
    /* Y */
    89: 'A,-1',
    /* U */
    85: 'B,-1',
    /* I */
    73: 'C,0',
    /* O */
    79: 'D,0',
    /* P */
    80: 'E,0',
    /* [ */
    219: 'F,0',
    /* ] */
    221: 'G,0',
    /* A */
    65: 'G#,0',
    /* S */
    83: 'A#,0',
    /* F */
    70: 'C#,1',
    /* G */
    71: 'D#,1',
    /* J */
    74: 'F#,1',
    /* K */
    75: 'G#,1',
    /* L */
    76: 'A#,1',
    /* Z */
    90: 'A,0',
    /* X */
    88: 'B,0',
    /* C */
    67: 'C,1',
    /* V */
    86: 'D,1',
    /* B */
    66: 'E,1',
    /* N */
    78: 'F,1',
    /* M */
    77: 'G,1',
    /* , */
    188: 'A,1',
    /* . */
    190: 'B,1'
  };

  var reverseLookupText = {};
  var reverseLookup = {};

  // Create a reverse lookup table.
  for (var i in keyboard) {

    var val;

    switch (i | 0) {

      case 187:
        val = 61;
        break;

      case 219:
        val = 91;
        break;

      case 221:
        val = 93;
        break;

      case 188:
        val = 44;
        break;

      case 190:
        val = 46;
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
  var selectSound = null;

  var fnCreateKeyboard = function(keyboardElement) {
    // Generate keyboard
    // This is our main keyboard element! It's populated dynamically based on what you've set above.
    visualKeyboard = document.getElementById('keyboard');

    var iKeys = 0;
    var iWhite = 0;
    var notes = {
      'C': 261.63,
      'C#': 277.18,
      'D': 293.66,
      'D#': 311.13,
      'E': 329.63,
      'F': 349.23,
      'F#': 369.99,
      'G': 392.00,
      'G#': 415.30,
      'A': 440.00,
      'A#': 466.16,
      'B': 493.88
    };
    
    /* key sizes */
    // TODO: add to settings and make configurable
    const bkw = 32;
    const wkw = 25;
    const bkoff = bkw / 1.6;

    for (var i = -1; i <= 1; i++) {
      for (var n in notes) {
        if (n[2] != 'b') {
          var thisKey = document.createElement('div');
          if (n.length > 1) {
            thisKey.className = 'black key';
            thisKey.style.width = wkw + 'px';
            thisKey.style.height = '120px';
            thisKey.style.left = (bkw * (iWhite - 1)) + bkoff + 'px';
          } else {
            thisKey.className = 'white key';
            thisKey.style.width = bkw + 'px';
            thisKey.style.height = '200px';
            thisKey.style.left = bkw * iWhite + 'px';
            iWhite++;
          }
          var label = document.createElement('div');
          label.className = 'label';
          label.innerHTML = '<b>' + String.fromCharCode(reverseLookupText[n + ',' + i]) + '</b>' + '<br /><br />' + n.substr(0, 1) +
            '<span name="OCTAVE_LABEL" value="' + i + '">' + (__octave + parseInt(i)) + '</span>' + (n.substr(1, 1) ? n.substr(1, 1) : '');
          thisKey.appendChild(label);
          thisKey.setAttribute('ID', 'KEY_' + n + ',' + i);
          thisKey.addEventListener(evtListener[0], (function(_temp) {
            return function() {
              fnPlayKeyboard({
                keyCode: _temp
              });
            }
          })(reverseLookup[n + ',' + i]));
          visualKeyboard[n + ',' + i] = thisKey;
          visualKeyboard.appendChild(thisKey);
          iKeys++;
        }
      }
    }

    visualKeyboard.style.width = iWhite * bkw + 'px';

    window.addEventListener(evtListener[1], function() {
      n = keysPressed.length;
      while (n--) {
        fnRemoveKeyBinding({
          keyCode: keysPressed[n]
        });
      }
    });

  };
  
  // Convert keys to midi note numbers
  
  var fnNoteToMidiNum = function(arrPlayNote) {
  	var keys = {
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
    var note = arrPlayNote[0];
    var octaveModifier = arrPlayNote[1] | 0;
    var octave = __octave + octaveModifier
    var key = keys[note];
    console.log("note: " + note + ", oct: " + __octave + " + " + octaveModifier + ", key: " + key)
    return (octave * 12) + key;
  };

  // Detect keypresses, play notes.

  var fnPlayKeyboard = function(e) {
    var i = keysPressed.length;
    while (i--) {
      if (keysPressed[i] == e.keyCode) {
        return false;
      }
    }
    keysPressed.push(e.keyCode);

    switch (e.keyCode) {
      // left
      case 37:
        fnChangeOctave(-1);
        break;
        // right
      case 39:
        fnChangeOctave(1);
        break;
    }

    if (keyboard[e.keyCode]) {
      if (visualKeyboard[keyboard[e.keyCode]]) {
        visualKeyboard[keyboard[e.keyCode]].style.backgroundColor = '#ff0000';
        visualKeyboard[keyboard[e.keyCode]].style.marginTop = '5px';
        visualKeyboard[keyboard[e.keyCode]].style.boxShadow = 'none';
      }
      sendMidiNoteOn(fnNoteToMidiNum(keyboard[e.keyCode].split(',')), inputVelocity.value)
    } else {
      return false;
    }

  }

  // Remove key bindings once note is done.

  var fnRemoveKeyBinding = function(e) {
    var i = keysPressed.length;
    while (i--) {
      if (keysPressed[i] == e.keyCode) {
        if (visualKeyboard[keyboard[e.keyCode]]) {
          visualKeyboard[keyboard[e.keyCode]].style.backgroundColor = '';
          visualKeyboard[keyboard[e.keyCode]].style.marginTop = '';
          visualKeyboard[keyboard[e.keyCode]].style.boxShadow = '';
        }
        keysPressed.splice(i, 1);
        if (keyboard[e.keyCode]) {
        	sendMidiNoteOff(fnNoteToMidiNum(keyboard[e.keyCode].split(',')), inputVelocity.value)        
        }
      }
    }

  }

  // Set up global event listeners

  window.addEventListener('keydown', fnPlayKeyboard);
  window.addEventListener('keyup', fnRemoveKeyBinding);
  document.getElementById('-_OCTAVE').addEventListener('click', function() {
    fnChangeOctave(-1);
  });
  document.getElementById('+_OCTAVE').addEventListener('click', function() {
    fnChangeOctave(1);
  });

  Object.defineProperty(this, 'draw', {
    value: fnCreateKeyboard
  });

}
