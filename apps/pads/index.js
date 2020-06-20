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
  window.addEventListener('resize', createMatirx, {passive: true});

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
  navigator.requestMIDIAccess({ sysex: true })
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

function arrayToHexStr(data) {
  return Array.prototype.map.call(new Uint8Array(data), x => ('x00' + x.toString(16)).slice(-2)).join(' ');
}

function midiMessageReceived(event) {
  // MIDI commands we care about. See
  // http://webaudio.github.io/web-midi-api/#a-simple-monophonic-sine-wave-midi-synthesizer.
  const NOTE_ON = 0x9;
  const NOTE_OFF = 0x8;
  const CC = 0xB;
  const SYSEX = 0xF;
  const LP_MINI_MK3_SYSEX_HDR = 'f0 00 20 29 02 0d';

  const data = event.data;

  const cmd = data[0] >> 4;
  const channel = data[0] & 0x0f;
  const pitch = data[1];
  const velocity = (data.length > 2) ? data[2] : 0;

  // You can use the timestamp to figure out the duration of each note.
  const timestamp = Date.now();

  // Note that not all MIDI controllers send a separate NOTE_OFF command for every NOTE_ON.
  if (cmd === NOTE_OFF || (cmd === NOTE_ON && velocity === 0)) {
    outputIn.innerHTML += `🎧 from ${event.srcElement.name} @ch ${channel}: note off: pitch:<b>${pitch}</b>, velocity: <b>${velocity}</b> <br/>`;

    // Complete the note!
    const note = notesOn.get(pitch);
    if (note) {
      // outputIn.innerHTML += `🎵 pitch:<b>${pitch}</b>, duration:<b>${timestamp - note}</b> ms. <br>`;
      notesOn.delete(pitch);
    }
    setPadColor(channel, pitch, indexColor(velocity));

  } else if (cmd === NOTE_ON) {
    outputIn.innerHTML += `🎧 from ${event.srcElement.name} @ch ${channel}: note on: pitch:<b>${pitch}</b>, velocity: <b>${velocity}</b> <br/>`;

    // One note can only be on at once.
    notesOn.set(pitch, timestamp);

    setPadColor(channel, pitch, indexColor(velocity));
  } else if (cmd === CC) {
    console.log("Got control change: " + data[1]);
    // ctrl 91 - 98 top row
    // ctrl 99 top right
    // ctrl 19/29/39.../89) right side

    // NOTE: also the top/right buttons could send notes, as well as the pads could send cc messages
  } else if (cmd === SYSEX) {
    // console.log("Got sysex command, len: " + data.length + ' hdr? ' + arrayToHexStr(data.slice(0,6)) + ' end? ' + arrayToHexStr(data.slice(-1)));
    if ((data.length === 6) && (arrayToHexStr(data) === 'f0 7e 7f 06 01 f7')) {
      console.log("Got 'device inquiry' on ch: " + channel);
      const app_data = [
        0xf0, 0x7e, 0x00, 0x06, 0x02, 0x00, 0x20, 0x29, 0x13, 0x01, 0x00, 0x00, 
        0x00, 0x01, 0x00, 0x00, // app-version - no idea if this will be interpretes as eg. '01.00'
        0xf7
      ];
      midiOut[selectOut.selectedIndex].send(app_data);
      const boot_data = [
        0xf0, 0x7e, 0x00, 0x06, 0x02, 0x00, 0x20, 0x29, 0x13, 0x11, 0x00, 0x00, 
        0x00, 0x01, 0x00, 0x00, // bootloader-version - no idea if this will be interpretes as eg. '01.00'
        0xf7
      ];
      midiOut[selectOut.selectedIndex].send(boot_data);
      console.log("Replied to 'device inquiry' on " + midiOut[selectOut.selectedIndex].name);
    } else if ((data.length > 6) && (arrayToHexStr(data.slice(0,6)) === LP_MINI_MK3_SYSEX_HDR) && (data.slice(-1)[0] === 0xF7)) {
      // console.log("Got sysex command for 'launchpad mini mk3' on ch: " + channel);
      subdata = data.slice(6,-1)
      switch (subdata.length) {
        case 1:
          switch (subdata[0]) {
            case 0x00:
              console.log("Got 'read layout'");
              break;
            default:
              console.log("Unhandled sysex command for 'launchpad mini mk3' sublen: 1, data: " + arrayToHexStr(subdata));
              outputIn.innerHTML += "⚙ unhandled sysex midi message: len: " + data.length + ", data: " + arrayToHexStr(data) + " <br/>";
              break;
          }
          break;
        case 2:
          switch (subdata[0]) {
            case 0x00: // Select Layout
              console.log("Got 'select layout' " + arrayToHexStr([subdata[1]]));
              break;
            case 0x0E: // Live/Programmer mode
              // 0x00 live mode, *0x01* programmer mode
              console.log("Got 'select prog/live mode' " + arrayToHexStr([subdata[1]]));
              break;
            case 0x10: // Standalone/DAW mode
              // *0x00* standalone, 0x01 daw mode
              console.log("Got 'enable/disable daw mode' " + arrayToHexStr([subdata[1]]));
              break;
            default:
              console.log("Unhandled sysex command for 'launchpad mini mk3' sublen: 2, data: " + arrayToHexStr(subdata));
              outputIn.innerHTML += "⚙ unhandled sysex midi message: len: " + data.length + ", data: " + arrayToHexStr(data) + " <br/>";
              break;
          }
          break;
        default:
          if (subdata.length > 1) {
            switch (subdata[0]) {
              case 0x03:  // LED lightin
                // var lts = [0,0,0,0];
                // up to 81 (9x9) pad colors
                var ix = 1;
                while ((ix + 2) <= subdata.length) {
                  var lt = subdata[ix++];
                  var led_ix = subdata[ix++];
                  //
                  // lts[lt]++;
                  //
                  switch (lt) {
                    case 0: // static
                      if ((ix + 1) <= subdata.length) {
                        setPadColor(0, led_ix, indexColor(subdata[ix++]));
                      }
                      break;
                    case 1: // flashing
                      if ((ix + 2) <= subdata.length) {
                        setPadColor(1, led_ix, indexColor(subdata[ix++]));
                        ix++; // TODO: use 2nd color
                      }
                      break;
                    case 2: // pulsing
                      if ((ix + 1) <= subdata.length) {
                        setPadColor(2, led_ix, indexColor(subdata[ix++]));
                      }
                      break;
                    case 3: // rgb
                      if ((ix + 3) <= subdata.length) {
                        var rgb = [2 * subdata[ix++], 2 * subdata[ix++], 2 * subdata[ix++]].join(',');
                        setPadColor(0, led_ix, 'rgb('+ rgb + ')');
                      }
                      break;
                    default:
                      console.log("Bad colorspec: ix=" + ix);
                      break;
                  }
                }
                // we seem to get just static colors
                // console.log("lts: " + lts.join(','));
                break;
              default:
                console.log("Unhandled sysex command for 'launchpad mini mk3' sublen: " + subdata.length);
                outputIn.innerHTML += "⚙ unhandled sysex midi message: len: " + data.length + ", data: " + arrayToHexStr(data) + " <br/>";
                break;
            }
          } else {
            console.log("Unhandled sysex command for 'launchpad mini mk3' sublen: " + subdata.length);
            outputIn.innerHTML += "⚙ unhandled sysex midi message: len: " + data.length + ", data: " + arrayToHexStr(data) + " <br/>";
          }
          break;
      }
    } else {
      outputIn.innerHTML += "⚙ unhandled sysex midi message: len: " + data.length + ", data: " + arrayToHexStr(data) + " <br/>";
    }
  } else {
    outputIn.innerHTML += "? unhandled midi message: len: " + data.length + ", data: " + arrayToHexStr(data) + " <br/>";
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

const isMobile = !!navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i);
const evtListener = isMobile ? ['touchstart', 'touchend'] :['mousedown', 'mouseup'];

function handlePadDown(e) {
  // TODO: pads can send note events or control-changes, figure how this is configured
  sendMidiNoteOn(parseInt(this.id.substring(4), 10), 127);
  this.style.borderStyle = 'inset';
}

function handlePadUp(e) {
  // TODO: pads can send note events or control-changes, figure how this is configured
  sendMidiNoteOn(parseInt(this.id.substring(4), 10), 0);
  this.style.borderStyle = 'outset';
}

function createMatirx() {
  var container = document.getElementById('tab-pads');
  container.innerHTML = '';

  /* consider layouts with rectangullar pads to make things better fit the screen */ 

  /* 9 times pad marging + 2 time pagecontent margin + 1 unknown top marging */
  const margin = 9 * (2+2) + 2 * 12 + 20;

  console.log("window.w/h: " + window.innerWidth + ", " + window.innerHeight);

  var xs = Math.floor((window.innerWidth - margin)/9);
  var ys = Math.floor((window.innerHeight - margin)/9);
  var ms = Math.min(xs,ys);
  console.log("xs: " + xs + ", ys: " + ys + ", ms: " + ms);

  for(var y = 0; y < 9; y++){
    for(var x = 0; x < 9; x++){
  	  var pad = document.createElement('div');
      pad.className = 'pad';
      pad.style.width = ms + 'px';
      pad.style.height = ms + 'px';
      pad.style.backgroundColor = '#000';
      pad.style.border = '3px outset #333';
      pad.style.boxSizing = 'border-box';
      // ids as used in 'Programmer mode layout', there are also other layouts
      pad.setAttribute('id', 'pad-' + ((9-y) * 10 + (x+1)));
      // send midi events
      pad.addEventListener(evtListener[0], handlePadDown, {passive: true});
      pad.addEventListener(evtListener[1], handlePadUp, {passive: true});
      container.appendChild(pad);
      // TODO: add a dict with labels for the pads
      // TODO: when setting colors: set color for pads with labels an background otherwise
    }
    container.appendChild(document.createElement('br'));
  }
}

function indexColor(color_ix) {
   const padColors = [
      /* 000 */ 'black',
      /* 001 */ 'darkgray',
      /* 002 */ 'lightgray',
      /* 003 */ 'white',
      /* 004 */ 'black', //
      /* 005 */ 'black', //
      /* 006 */ 'black', //
      /* 007 */ 'rgb(39, 4, 1)',
      /* 008 */ 'rgb(45, 34, 21)',
      /* 009 */ 'rgb(217,157,16)',
      /* 010 */ 'black', //
      /* 011 */ 'black', //
      /* 012 */ 'black', //
      /* 013 */ 'rgb(253, 250, 1)',
      /* 014 */ 'rgb(107, 105, 1)',
      /* 015 */ 'rgb(37, 36, 1)',
      /* 016 */ 'rgb(141, 248, 57)',
      /* 017 */ 'rgb(70, 247, 1)',
      /* 018 */ 'rgb(29, 104, 1)',
      /* 019 */ 'black', //
      /* 020 */ 'rgb(53, 248, 58)',
      /* 021 */ 'rgb(1, 247, 1)',
      /* 022 */ 'rgb(1, 104, 1)',
      /* 023 */ 'rgb(1, 36, 1)',
      /* 024 */ 'rgb(52, 248, 88)',
      /* 025 */ 'black', //
      /* 026 */ 'black', //
      /* 027 */ 'black', //
      /* 028 */ 'black', //
      /* 029 */ 'black', //
      /* 030 */ 'black', //
      /* 031 */ 'black', //
      /* 032 */ 'black', //
      /* 033 */ 'black', //
      /* 034 */ 'black', //
      /* 035 */ 'black', //
      /* 036 */ 'black', //
      /* 037 */ 'black', //
      /* 038 */ 'black', //
      /* 039 */ 'black', //
      /* 040 */ 'black', //
      /* 041 */ 'rgb(0, 153, 217)',
      /* 042 */ 'black', //
      /* 043 */ 'black', //
      /* 044 */ 'black', //
      /* 045 */ 'black', //
      /* 046 */ 'black', //
      /* 047 */ 'black', //
      /* 048 */ 'black', //
      /* 049 */ 'black', //
      /* 050 */ 'black', //
      /* 051 */ 'black', //
      /* 052 */ 'black', //
      /* 053 */ 'black', //
      /* 054 */ 'black', //
      /* 055 */ 'black', //
      /* 056 */ 'black', //
      /* 057 */ 'black', //
      /* 058 */ 'black', //
      /* 059 */ 'black', //
      /* 060 */ 'rgb(255, 87, 6)',
      /* 061 */ 'black', //
      /* 062 */ 'black', //
      /* 063 */ 'black', //
      /* 064 */ 'black', //
      /* 065 */ 'black', //
      /* 066 */ 'black', //
      /* 067 */ 'black', //
      /* 068 */ 'black', //
      /* 069 */ 'black', //
    ];
  return (color_ix < padColors.length) ? padColors[color_ix]: '#fff';
}

function setPadColor(lighting_type, led_ix, color) {
    // TODO: lighting_type:
    // 0: static color
    // 1: flashing color (b/a)
    // 2: pulsing color (2nd color is black)
    var pad = document.getElementById('pad-' + led_ix);
    if (pad !== null) {
      pad.style.backgroundColor = color
    } else {
      // also the top + right pads can send/receive notes (e.g. to set the color)
      console.log('Unhandled note "' + note + '"')
    }
}