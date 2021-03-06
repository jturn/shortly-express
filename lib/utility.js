var request = require('request');
var db = require('../app/config');
var Users = require('../app/collections/users');
var User = require('../app/models/user');
var bcrypt = require('bcrypt-nodejs');

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

exports.restricted = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Please login first';
    next();
  }
};

exports.checkUser = function(req, res, next) {

  var username = req.body.username;
  var password = req.body.password;

  db.knex('users')
    .where('username', '=', username)
    .then(function(model) {
      // console.log(model[0]);
      if (model[0] && model[0]['username']) {
        var user = model[0]['username'];
        bcrypt.compare(password, user.password, function(result) {
          if (result) {
            req.session.regenerate(function() {
              req.session.user = req.body.username;
              next();
            });
          } else {
            console.log('Incorrect password');
            res.redirect('login');
          }
        });
      } else {
        console.log('user not found, create an account');
        res.redirect('signup');
      }
    });
};

exports.createUser = function(req, res, next) {

  var user = new User({username: req.body.username});

  bcrypt.genSalt(10, function(err, salt){
    if (err) console.log(err);
    bcrypt.hash(req.body.password, salt, null, function(err, hash) {
      if (err) console.log(err);
      user.set('password', hash);
      Users.add(user);
      console.log(Users.models);
      req.session.regenerate(function() {
        req.session.user = req.body.username;
        next();
      });
    });
  });
};

