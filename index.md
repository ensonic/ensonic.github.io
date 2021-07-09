## Ensonic's articles and web app experiemnts

On this page I'll host some articles and publish some web app experiments.

{:toc}

### Web app experiments

When you open any of those below in a modern browser (tested with chrome) you
should get a banner asking whether you'd like to install the app. If such a 
banner does not show up, open the 3-dots menu on the top-right and select
"Install 'App Name'" / or "Add as a desktop shortcut". When you start the app
though the newly created shortcut they will open in fullscreen and work
offline. The apps will also auto update (when online).
To force an update delete cached ontent for the app from chrome. On Android
open the page, tap the 3-dots menu, select the circled 'i', select website-
settings and there tap the trashcan to delete cached files. Then close the
dialogs and swipe the page down to reload. This will update the cache for the
pinned app.

* [app skeleton](apps/skel/index.html)
* [midi keyboard](apps/keys/index.html)
  * Based on these [webmidi-examples](https://webmidi-examples.glitch.me/) and
    this [piano keyboard](https://www.freecodecamp.org/news/javascript-piano-keyboard/)
* [midi pad matrix](apps/pads/index.html)
  * A launchpad style button matrix. So far it only has been tested in conjunction with
    [DrivenByMoss](http://www.mossgrabers.de/Software/Bitwig/Bitwig.html) and
    [Bitwig Studio](https://www.bitwig.com/en/bitwig-studio).

To serve an app for local development, run:

```bash
cd apps
python3 -m http.server 8000
```
and then open http://localhost:8000/<appname>/

### Music theory

In order to have more music theory for reference in a compact form, I am working
on some cheat sheets. Each of them comes with the code to generate them.

* scales: minor major scales with violin and bass cleff and keyboard mapping
  * single page svg (the notxt variant has fonts converted to shapes):
    * [scales flat](misc/scales_flat.svg), [scales flat (no fonts)](misc/scales_flat_notxt.svg)
    * [scales shaarp](misc/scales_shaarp.svg), [scales shaarp (no fonts)](misc/scales_shaarp_notxt.svg)
  * two page pdf:
    * [scales flat and sharp](misc/scales.pdf)

### Bitwig Studio on OpenSuse

I am using [Bitwig Studio](https://www.bitwig.com/) on [openSUSE Tumbleweed](https://get.opensuse.org/tumbleweed/).

Since the Bitwig Studio packages are made for Ubuntu, they need to be converted from deb to rpm:

```bash
V="3.3"
# converting deb to rpm (warning, its slow)
sudo alien -rv bitwig-studio-$V.deb

# installing
sudo rpm -i --test bitwig-studio-$V-2.x86_64.rpm
sudo rpm -i bitwig-studio-$V-2.x86_64.rpm

# upgrading
sudo rpm -U --test bitwig-studio-$V-2.x86_64.rpm
sudo rpm -U bitwig-studio-$V-2.x86_64.rpm
```

I am using the stock gnome desktop. I installed this [cpufreq](https://github.com/konkor/cpufreq) add-on
to switch the govenor to performance mode. This gives less jitter on the dsp graph.

