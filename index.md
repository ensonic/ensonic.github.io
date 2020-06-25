## Ensonic's articles and web app experiemnts

On this page I'll host some articles and publish some web experiemnts.

### Web app experiments

When you open any of those below in a modern browser (tested with chome) you
should get a banner asking wheter you'd like to install the app. If such a 
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
