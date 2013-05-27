//
// connect-replace
//
// middleware to replace occurences of '@@<string>' in URL's matching a regexp,
// with something else. I use it to inject configuration parameters into
// Javascript files served through connect.
//
// Author: Emil Stenqvist <emsten@gmail.com>
//

var staticSend = require('connect').static.send,
    mime = require('mime'),
    fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    stream = require('stream'),
    parse = require('url').parse;

exports = module.exports = function replace(root, options) {

  var options = options || {},
      match = options.match,
      prefix = options.prefix || '@@',
      replacements = options.replacements || {},
      rootLength;

  if (!root) throw new Error('root must be set');
  if (!match) throw new Error('option match is required');

  if(!match.test) match = new RegExp(match, 'i');

  options.root = root;
  rootLength = root.length;

  return function(req, res, next) {
    var url, filename, type;

    var transformer = new stream.Transform();
    transformer._transform = function(chunk, encoding, done) {
      // FIXME: this is pretty inefficient - we could at least cache the RegExp's.
      chunk = chunk.toString();
      _.each(replacements, function(_with, what) {
        var re = new RegExp(prefix + what, 'gm');
        chunk = chunk.replace(re, _with);
      });
      done(null, chunk);
    };

    url = parse(req.url);
    filename = path.join(root, url.pathname);
    if (!match.test(filename)) {
      return passToStatic(filename);
    }

    // FIXME: check if file exists, malicious paths, etc. Look in
    // connect.static and node module send, for inspiration and possible
    // extensibility.

    res.setHeader('Content-Type', mime.lookup(filename));
    readStream = fs.createReadStream(filename);
    readStream
      .pipe(transformer)
      .pipe(res);

    function passToStatic(name) {
      var o = Object.create(options);
      o.path = name.substr(rootLength);
      staticSend(req, res, next, o);
    }
  };
};

