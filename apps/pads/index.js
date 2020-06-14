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

  createMatirx();

  connectMidi();
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

    // Channel 0: static color
    // Channel 1: flashing color
    // Channel 2: pulsing color
    // pitch -> pad
    // velocity -> color
    var pad = document.getElementById('pad-' + pitch);
    if (pad !== undefined) {
      // TODO: map velocity to color
      pad.style.backgroundColor = '#fff';
    }

    
  } else {
    var hexstr = Array.prototype.map.call(new Uint8Array(event.data), x => ('x00' + x.toString(16)).slice(-2)).join(' ');
  
    console.log("Unhandled midi message: len: " + event.data.length + ", data: " + hexstr);
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

// pad-matrix

function createMatirx() {
  var container = document.getElementById('tab-pads');
  container.innerHTML = '';

  /* 8 times pad marging + 2 time pagecontent margin + 1 unknown top marging */
  const margin = 8 * (2+2) + 2 * 12 + 30;

  console.log("window.w/h: " + window.innerWidth + ", " + window.innerHeight);

  var xs = Math.floor((window.innerWidth - margin)/8);
  var ys = Math.floor((window.innerHeight - margin)/8);
  var ms = Math.min(xs,ys);
  console.log("xs: " + xs + ", ys: " + ys + ", ms: " + ms);

  for(var y = 0; y < 8; y++){
    for(var x = 0; x < 8; x++){
  	  var pad = document.createElement('div');
      pad.className = 'pad';
      pad.style.width = ms + 'px';
      pad.style.height = ms + 'px';
      pad.style.backgroundColor = '#000';
      pad.style.border = '3px outset #333';
      pad.style.boxSizing = 'border-box';
      pad.setAttribute('id', 'pad-' + ((8-y) * 10 + (x+1)));
      container.appendChild(pad);
    }
    container.appendChild(document.createElement('br'));
  }
}
