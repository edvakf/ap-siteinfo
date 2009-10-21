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

function fileOlderThan(filename, hours) {
  var file = dir.resolve('/' + filename);
  if (!file.exists) return false;
  if (new Date - file.created > hours*60*60*1000) return true;
  return false;
}

function httpGet(url, onload, onerror) {
  var xhr = new XMLHttpRequest;
  xhr.open('GET', url, false);
  if (onload) xhr.onload = function(){onload(xhr.responseText)}
  if (onerror) xhr.onerror = function(){onerror()}
  xhr.send(null);
}

/* server */
var webserver = opera.io.webserver;
window.onload = function () {
  if (webserver){
    webserver.addEventListener('_index', index, false);
    webserver.addEventListener('get', get,false);
  }
}

var siteinfo = null;
var siteinfo_wildcard = [];
var cache = {};

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
  update_siteinfo();
  if (cache[url]) return cache[url];
  var results = [];
  var n = siteinfo.length;
  while(--n) {
    var info = siteinfo[n].data || siteinfo[n];
    if ((new RegExp(info.url)).test(url)) results.push(info);
  }
  cache[url] = results;
  return results;
}

function index(e) {
  var res = e.connection.response;
  res.write('<!DOCTYPE html>'+
    '<title>AutoPagerize SITEINFO Server</title>'+
    '<p>Welcome to AutoPagerize SITEINFO Server</p>');
  res.close();
}

function update_siteinfo() {
  var filename = 'wedataAutoPagerizeSITEINFO.js';
  var fileOld = fileOlderThan(filename, 24);
  if (!siteinfo || fileOld) {
    // first try readinf file, then try xhr
    var text = readFile(filename);
    if (!text || fileOld) {
      httpGet('http://ss-o.net/json/wedataAutoPagerizeSITEINFO.js', 
        function(t){if(t.length > 1000){text = t; saveFile(filename, t)}}); // if text length is less than 1000 bytes, it maybe an error message
    }
    if (!text) retrun;
    window.AutoPagerizeCallbackSiteinfo = function(ary) {
      // reset cache
      siteinfo = ary;
      siteinfo_wildcard = [];
      cache = {};

      var n = siteinfo.length;
      while(--n) {
        var info = siteinfo[n].data || siteinfo[n];
        if (new RegExp(info.url).test('http://a')) {
          // isolate siteinfo that matches any url
          siteinfo_wildcard.push(info);
          siteinfo.splice(n,1);
        }
      }
    };
    eval(text); // loads jsonp like : AutoPagerizeCallbackSiteinfo([ /* blah blah */ ]);
  }
}
