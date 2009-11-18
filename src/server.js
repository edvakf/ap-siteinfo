/*
 * server.js : public domain
 */

var debug = false;
function log(text){
  if (debug) opera.postError(text);
}

/* utils */
function httpGet(url) {
  var result = null;
  var xhr = new XMLHttpRequest;
  xhr.open('GET', url, false);
  xhr.onload = function(){result = xhr.responseText};
  xhr.send(null);
  return result;
}

/* server */
// dispatcher
window.onload = function () {
  var webserver = opera.io.webserver;
  if (webserver){
    webserver.addEventListener('_index', index, false);
    webserver.addEventListener('get', get,false);
    update_siteinfo();
  }
}

var siteinfo = [];  // Array of [compiled url-regexp, info]
var microformats = [];
var cache = {};
var last_updated = null;

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
  info = info.concat(microformats);

  var res = e.connection.response;
  res.setResponseHeader('Content-type', 'application/javascript; charset=utf-8');
  if (last_updated) res.setResponseHeader('Last-Modified', last_updated.toUTCString());
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
function search_siteinfo(url, force_update) {
  if (force_update || !siteinfo) update_siteinfo();
  if (cache[url]) return cache[url];
  var results = [];
  var n = siteinfo.length;
  var info;
  while(info = siteinfo[--n]) {
    var re = info[0];
    if (re.test(url)) results.push(info[1]);
  }
  if (url.indexOf('?') < 0) cache[url] = results;
  return results;
}

function update_siteinfo() {
  // reset cache
  siteinfo = [];
  microformats = [];
  cache = {};

  log('updating siteinfo');
  // first try readinf file, then try xhr
  json = httpGet('http://ss-o.net/json/wedataAutoPagerizeSITEINFO.json');
  if (!json) return;
  var startTime = last_updated = new Date;
  var _siteinfo = JSON.parse(json);
  var n = _siteinfo.length;
  while(--n) {
    var info = _siteinfo[n].data || _siteinfo[n];
    var re = new RegExp(info.url);
    if (re.test('http://a')) {
      // isolate siteinfo that matches any url
      microformats.push(info);
    } else {
      siteinfo.push([re, info]);
    }
  }
  log('SITEINFO initial scan done : ' + (new Date - startTime) + 'ms');
}
