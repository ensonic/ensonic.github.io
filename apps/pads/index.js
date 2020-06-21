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

// for midi clock analysis
var cur_ts = 0, prev_ts = 0;
var bpm_counter = 0;
var bpm = 10000000.0;

function midiMessageReceived(event) {
  // MIDI commands we care about.
  const NOTE_ON = 0x90;
  const NOTE_OFF = 0x80;
  const CC = 0xB0;
  const SYSEX = 0xF0;
  const CLOCK = 0xF8;
  const START = 0xFA;
  const CONT = 0xFB;
  const STOP = 0xFC;
  const LP_MINI_MK3_SYSEX_HDR = 'f0 00 20 29 02 0d';

  const data = event.data;

  // commands >= 0xF0 are channel independent and use the lower 4 bit for message types too
  const cmd = (data[0]<0xF0) ? (data[0] & 0xf0) : data[0];
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
                        setPadColor(1, led_ix, indexColor(subdata[ix++]), indexColor(subdata[ix++]));
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
  } else if (cmd === CLOCK) {
    // Sent 24 times per quarter note
    if (bpm_counter == 23) {
      prev_ts = cur_ts;
      cur_ts = timestamp;
      bpm = (60.0 * 1000.0) / (cur_ts - prev_ts);
      // Only use if value < 1000
      console.log("bpm : " + bpm);
      bpm_counter = 0;
    } else {
      bpm_counter++;    
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
// https://www.fileformat.info/info/unicode/block/geometric_shapes/list.htm
const padLabels = {
  '19': '■|m|s',
  '29': '▷',
  '39': '▷',
  '49': '▷',
  '59': '▷',
  '69': '▷',
  '79': '▷',
  '89': '▷',
  '91': '▲',
  '92': '▼',
  '93': '◀',
  '94': '▶',
  '95': 'session',
  '96': 'drums',
  '97': 'keys',
  '98': 'user',
  '99': '🚀',
};

function handlePadDown(e) {
  var led_ix = parseInt(this.id.substring(4), 10);
  // TODO: pads can send note events or control-changes, figure how this is configured
  if (padLabels[led_ix]) {
    sendMidiControlChange(led_ix, 127);
  } else {
    sendMidiNoteOn(led_ix, 127);
  }
  this.style.borderStyle = 'inset';
}

function handlePadUp(e) {
  // TODO: pads can send note events or control-changes, figure how this is configured
  var led_ix = parseInt(this.id.substring(4), 10);
  if (padLabels[led_ix]) {
    sendMidiControlChange(led_ix, 0);
  } else {
    sendMidiNoteOn(led_ix, 0);
  }
  this.style.borderStyle = 'outset';
}

function createMatirx() {
  var container = document.getElementById('pad-matrix');
  container.innerHTML = '';

  /* consider layouts with rectangullar pads to make things better fit the screen */ 

  /* 8 times grid spacing + 9 times border + 2 times pagecontent margin + 1 unknown top marging */
  const margin = (8 * 2) + (9 * 6) + (2 * 12) + 20;
  /* fon-scaling factors, determined by experiments */
  const yfs = 0.75;
  const xfs = 0.25;

  console.log("window.w/h: " + window.innerWidth + ", " + window.innerHeight);

  var xs = Math.floor((window.innerWidth - margin)/9);
  var ys = Math.floor((window.innerHeight - margin)/9);
  //var ms = Math.min(xs,ys);
  console.log("xs: " + xs + ", ys: " + ys);

  for(var y = 0; y < 9; y++){
    for(var x = 0; x < 9; x++){
  	  var pad = document.createElement('div');
      // as used in 'Programmer mode layout', there are also other layouts
  	  var led_ix = (9-y) * 10 + (x+1);
      pad.className = 'pad';
      pad.setAttribute('id', 'pad-' + led_ix);
      // handlers to send midi events
      pad.addEventListener(evtListener[0], handlePadDown, {passive: true});
      pad.addEventListener(evtListener[1], handlePadUp, {passive: true});

      if (padLabels[led_ix]) {
        var text = padLabels[led_ix];
        var fs = (text.length === 1) ? (ys * yfs) : (xs * xfs);
        pad.style.fontSize = Math.trunc(fs) + 'px';
        pad.innerHTML = text;
        // set inverted colors
        pad.style.color = '#000';
        pad.style.backgroundColor = '#777';
      } else {
        pad.style.fontSize = Math.trunc(ys * yfs) + 'px';
        pad.innerHTML = '&nbsp';
        // set normal colors
        pad.style.color = '#777';
        pad.style.backgroundColor = '#000';
      }
      container.appendChild(pad);
    }
  }
}

function indexColor(color_ix) {
   /* extracted from
      src/main/java/de/mossgrabers/framework/controller/color/ColorManager.java:registerColor()
      by
      int [] c = color.toIntRGB255();         
      System.out.printf("    |* %03d *| 'rgb(%d,%d,%d)',\n", colorIndex, c[0], c[1], c[2]);
   */
   
   const padColors = [
     /* 000 */ 'rgb(0,0,0)',
     /* 001 */ 'rgb(201,201,201)',
     /* 002 */ 'rgb(128,128,128)',
     /* 003 */ 'rgb(255,255,255)',
     /* 004 */ 'rgb(236,97,87)',
     /* 005 */ 'rgb(217,46,36)',
     /* 006 */ 'rgb(255,131,62)',
     /* 007 */ 'rgb(39,4,1)',
     /* 008 */ 'rgb(45,34,21)',
     /* 009 */ 'rgb(217,157,16)',
     /* 010 */ 'rgb(255,131,62)',
     /* 011 */ 'rgb(163,121,67)',
     /* 012 */ 'rgb(228,183,78)',
     /* 013 */ 'rgb(253,250,1)',
     /* 014 */ 'rgb(107,105,1)',
     /* 015 */ 'rgb(37,36,1)',
     /* 016 */ 'rgb(141,248,57)',
     /* 017 */ 'rgb(70,247,1)',
     /* 018 */ 'rgb(29,104,1)',
     /* 019 */ 'rgb(67,210,185)',
     /* 020 */ 'rgb(53,248,58)',
     /* 021 */ 'rgb(1,247,1)',
     /* 022 */ 'rgb(1,104,1)',
     /* 023 */ 'rgb(1,36,1)',
     /* 024 */ 'rgb(52,248,88)',
     /* 025 */ 'rgb(0,166,148)',
     /* 026 */ 'rgb(115,152,20)',
     /* 027 */ 'rgb(1,36,1)',
     /* 028 */ 'rgb(51,249,143)',
     /* 029 */ 'rgb(1,248,75)',
     /* 030 */ 'rgb(0,157,71)',
     /* 031 */ 'rgb(1,41,25)',
     /* 032 */ 'rgb(62,187,98)',
     /* 033 */ 'rgb(1,248,161)',
     /* 034 */ 'rgb(1,105,66)',
     /* 035 */ 'rgb(1,36,25)',
     /* 036 */ 'rgb(68,202,255)',
     /* 037 */ 'rgb(1,182,255)',
     /* 038 */ 'rgb(1,82,100)',
     /* 039 */ 'rgb(1,26,37)',
     /* 040 */ 'rgb(134,137,172)',
     /* 041 */ 'rgb(0,153,217)',
     /* 042 */ 'rgb(87,97,198)',
     /* 043 */ 'rgb(1,15,38)',
     /* 044 */ 'rgb(132,138,224)',
     /* 045 */ 'rgb(14,54,255)',
     /* 046 */ 'rgb(4,23,110)',
     /* 047 */ 'rgb(1,8,38)',
     /* 048 */ 'rgb(188,118,240)',
     /* 049 */ 'rgb(149,73,203)',
     /* 050 */ 'rgb(35,26,122)',
     /* 051 */ 'rgb(20,14,67)',
     /* 052 */ 'rgb(255,108,255)',
     /* 053 */ 'rgb(255,67,255)',
     /* 054 */ 'rgb(110,28,109)',
     /* 055 */ 'rgb(39,9,38)',
     /* 056 */ 'rgb(225,102,145)',
     /* 057 */ 'rgb(217,56,113)',
     /* 058 */ 'rgb(110,20,40)',
     /* 059 */ 'rgb(48,9,26)',
     /* 060 */ 'rgb(255,87,6)',
  ];
  return (color_ix < padColors.length) ? padColors[color_ix]: '#000';
}

function setPadColor(lighting_type, led_ix, color1, color2) {
    // TODO: lighting_type:
    // 0: static color
    // 1: flashing color (color2/color1, modulated with rectangle)
    // 2: pulsing color (color2 is black, modulated with triangle)
    // DEBUG
    if (lighting_type != 0) {
      console.log('Unhandled lighting_type ' + lighting_type + ' for note ' + led_ix);
    }

    var pad = document.getElementById('pad-' + led_ix);
    if (pad !== null) {
      if (padLabels[led_ix]) {
        pad.style.color = color1;
      } else {
        pad.style.backgroundColor = color1;
      }
    } else {
      console.log('Unhandled note "' + led_ix + '"')
    }
}
