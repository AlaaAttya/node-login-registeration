var express = require('express'),
        passport = require('passport'),
        //for local startegy authentication (using username and password)
        LocalStrategy = require('passport-local').Strategy,
        //working with mongodb
        mongoose = require('mongoose'),
        //for exchanging flash messages
        flash = require('connect-flash'),
        //as express is no longer supporting http
        http = require('http');

//configure the node app
var app = express()
        .use(express.bodyParser())
        .use(express.static('public'))
        .use(express.cookieParser())
        .use(express.session({secret: 'ilovescotchscotchyscotchscotch'})) // session secret
        .use(passport.initialize())
        .use(passport.session())
        .use(flash())
        //set the default template engine
        .engine('.html', require('ejs').renderFile)
        //set the view directory
        .set('views', __dirname + '/public/views');


//connecting to the db
mongoose.connect('localhost', 'loginsys');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log('Connected to DB');
});

// User Schema
var userSchema = mongoose.Schema({
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
});


var User = mongoose.model('User', userSchema);

//configuring passport local strategy 
passport.use(new LocalStrategy({
    //changing default authentication params
    usernameField: 'email',
    passwordField: 'password'
},
function(email, password, done) {
    User.findOne({email: email , password:password}, function(err, user) {
        if (err) {
            console.log("success");
            return done(err);
        }
        if (!user) {
            console.log("user not found");
            return done(null, false, {message: 'User is not found!'});
        }
        
        return done(null, user);
    });
}
));

//serializing user for the auth process
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


//  Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
//  just got it from: https://github.com/jaredhanson/passport-local/blob/master/examples/express3-mongoose/app.js#L173
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

// default route
app.get('/' , function(req , res){
    if(req.user)
        res.redirect('/profile');
    else
        res.redirect('/login');
});

//login route
app.get('/login', function(req, res)
{
    res.render('login.html', {message: req.flash('registerMessage'),
        loginError: req.flash('loginMessage')
    });

});

//handeling login
app.post('/login', passport.authenticate('local', {successRedirect: '/profile',
    failureRedirect: '/login'}));

//handeling registeration form submissions
app.post('/register', function(req, res) {
    //console.log(req.params);
    console.log("post received: username: %s , email: %s and password: %s ", req.body.username, req.body.email, req.body.password);
    var user = new User({username: req.body.username, email: req.body.email, password: req.body.password});
    //save a user
    user.save(function(err) {
        if (err) {
            //just handeling mongo error codes
            switch (err.code) {
                case 11000:
                    console.log('here');
                    req.flash('registerMessage', "user already exists!");
                    break;
                default :
                    req.flash('registerMessage', "error in the registeration proccess!");
                    break;
            }
            console.log(err.code);
            res.redirect('/register');
        } else {
            req.flash('registerMessage', "Successfully registered!");
            res.redirect('/login');
        }
    });
});

app.get('/register', function(req, res) {
    res.render('register.html', {message: req.flash('registerMessage')});
});

//first check if the user logged in using 'ensureAuthenticated'
app.get('/profile' ,ensureAuthenticated ,function(req, res){
    res.render('profile.html', { username: req.user.username });
});

//logging user out
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

//let's run the server
http.createServer(app).listen(3000, function() {
    console.log("Server ready at http://localhost:3000");
});
