/*
 * server.js : public domain
 */

var debug = false;
function log(text){
  if (debug) opera.postError(text);
}

/* utils */
var dir = opera.io.filesystem.mountSystemDirectory('storage');
function readFile(filename) {
  var data = null;
  try {
    var stream = dir.open(dir.resolve('/' + filename), opera.io.filemode.READ);
    data = stream.read(100000000);
    stream.close();
  } catch(e) {
    log(e);
  }
  return data;
};

function saveFile(filename, text) {
  try {
    var stream = dir.open(dir.resolve('/' + filename), opera.io.filemode.WRITE);
    stream.write(text);
    stream.close();
  } catch(e) {
    log(e);
  }
}

/* server */
window.onload = function () {
  var webserver = opera.io.webserver;
  if (webserver){
    webserver.addEventListener('_index', index, false);
    webserver.addEventListener('get', get,false);
  }
}

var siteinfo = null;
var siteinfo_wildcard = [];
//var cache = {};

function get(e) {
  var req = e.connection.request;

  var url = req.getItem('url');
  if (!url) return not_found(e);
  url = url[0];
  if (!url) return not_found(e);
  var info = search_siteinfo(url).concat(siteinfo_wildcard);
  log(info.map(function(e){return e.url.toString()}).join('\n'));

  var res = e.connection.response;
  res.setResponseHeader('Content-type', 'application/json');
  res.write('window.AutoPagerizeCallbackSiteinfo(' + JSON.stringify(info) + ');');
  res.close();
}

function not_found(e) {
  var res = e.connection.response;
  res.setStatus('404', 'Not Found');
  res.close();
}

function search_siteinfo(url) {
  if (!siteinfo) {
    // first try readinf file, then try xhr
    var text = readFile('wedataAutoPagerizeSITEINFO.js');
    if (!text) {
      var xhr = new XMLHttpRequest;
      xhr.open('GET','http://ss-o.net/json/wedataAutoPagerizeSITEINFO.js',false);
      xhr.onload = function(){text = xhr.responseText; saveFile('wedataAutoPagerizeSITEINFO.js',text);};
      xhr.send(null);
    }
    if (!text) return [];
    function AutoPagerizeCallbackSiteinfo(ary) {siteinfo = ary};
    eval(text); // loads jsonp like : AutoPagerizeCallbackSiteinfo([ /* blah blah */ ]);
  }

  var results = [];
  var n = siteinfo.length;
  //var shortestmatch = '';
  while(--n) {
    var info = siteinfo[n].data || siteinfo[n];
    var re = new RegExp(info.url);
    var match = url.match(re)
    if (match) {
      if (re.test('http://a')) {
        // isolate siteinfo that matches any url
        siteinfo_wildcard.push(info);
        siteinfo.splice(n,1);
      } else {
        results.push(info);

        /*
        // find the part of the url that matches all regexp's
        if (shortestmatch !== null) {
          if (shortestmatch === '' || match.indexOf(shortestmatch) >= 0) {
            shortestmatch = match;
          } else if (shortestmatch.indexOf(match) >= 0) {
            // do nothing
          } else {
            // this case might be something like (a[bc)d], but it's not handled yet
            shortestmatch = null;
          }
        }
        */
      }
    }
  }
  /*
  if (shortestmatch) {
    cache[shortestmatch] = results;
  }
  */
  return results;
}

function index(e) {
  var req = e.connection.request;
  var res = e.connection.response;
  res.write('<!DOCTYPE html>'+
    '<title>AutoPagerize SITEINFO Server</title>'+
    '<p><a href="javascript:location.href=\''+webserver.currentServicePath+'\';">You must enable accessing the service from the local machine.</a></p>');
  res.close();
}
