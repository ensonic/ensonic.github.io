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

