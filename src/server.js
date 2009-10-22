/*
 * server.js : public domain
 */

var debug = true;
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
  } catch(e) {
    log(e);
  } finally {
    stream.close();
  }
  return data;
};

function saveFile(filename, text) {
  try {
    var stream = dir.open(dir.resolve('/' + filename), opera.io.filemode.WRITE);
    stream.write(text);
  } catch(e) {
    log(e);
  } finally {
    stream.close();
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
// dispatcher
var webserver = opera.io.webserver;
window.onload = function () {
  if (webserver){
    webserver.addEventListener('_index', index, false);
    webserver.addEventListener('get', get,false);
  }
}

var siteinfo = null;  // Array of [compiled url-regexp, info]
var siteinfo_wildcard = [];
var cache = {};

// request handler (view)
function get(e) {
  var req = e.connection.request;

  var url = req.getItem('url');
  if (!url) return not_found(e);
  url = url[0];
  if (!url) return not_found(e);
  var startTime = new Date;
  var info = search_siteinfo(url);
  log('SITEINFO searching done : ' + (new Date - startTime) + 'ms');
  log(info.map(function(e){return [e.url.toString(), e.nextLink, e.pageElement].join(' , ')}).join('\n'));
  info = info.concat(siteinfo_wildcard);

  var res = e.connection.response;
  res.setResponseHeader('Content-type', 'application/javascript; charset=utf-8');
  res.write('window.AutoPagerizeCallbackSiteinfo(' + JSON.stringify(info) + ');');
  res.close();
}

function not_found(e) {
  var res = e.connection.response;
  res.setStatus('404', 'Not Found');
  res.close();
}

function index(e) {
  var res = e.connection.response;
  res.write('<!DOCTYPE html>'+
    '<title>AutoPagerize SITEINFO Server</title>'+
    '<p>Welcome to AutoPagerize SITEINFO Server</p>');
  res.close();
}

// controller
function search_siteinfo(url) {
  update_siteinfo();
  if (cache[url]) return cache[url];
  var results = [];
  var n = siteinfo.length;
  while(--n) {
    var re = siteinfo[n][0];
    if (re.test(url)) results.push(siteinfo[n][1]);
  }
  cache[url] = results;
  return results;
}

function update_siteinfo() {
  var filename = 'wedataAutoPagerizeSITEINFO.js';
  var fileOld = fileOlderThan(filename, 24);
  if (!siteinfo || fileOld) {
    log('updating siteinfo');
    // first try readinf file, then try xhr
    var text = readFile(filename);
    if (!text || fileOld) {
      httpGet('http://ss-o.net/json/wedataAutoPagerizeSITEINFO.js', 
        function(t){if(t.length > 1000){text = t; saveFile(filename, t)}}); // if text length is less than 1000 bytes, it maybe an error message
    }
    if (!text) retrun;
    window.AutoPagerizeCallbackSiteinfo = function(ary) {
      // reset cache
      siteinfo = [];
      siteinfo_wildcard = [];
      cache = {};

      var n = ary.length;
      while(--n) {
        var info = ary[n].data || ary[n];
        var re = new RegExp(info.url);
        if (re.test('http://a')) {
          // isolate siteinfo that matches any url
          siteinfo_wildcard.push(info);
        } else {
          siteinfo.push([re, info]);
        }
      }
    };
    var startTime = new Date;
    eval(text); // loads jsonp like : AutoPagerizeCallbackSiteinfo([ /* blah blah */ ]);
    log('SITEINFO initial scan done : ' + (new Date - startTime) + 'ms');
  }
}
