const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;
const GithubStrategy = require('passport-github').Strategy


module.exports = function(app,myDataBase){
  // Serialization and deserialization here...
  passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {

 myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
    done(null, doc);
  });
});

//setup a new passport strategy in order to match a user with their password  
passport.use(new LocalStrategy(
  function(username,password,done){
    myDataBase.findOne({username:username},(err,user)=>{
      console.log("User"+ username +"tried to login");
      if(err){return done(null,err);};
      if(!user){return done(null,false);}
      if (!bcrypt.compareSync(password, user.password)) { 
  return done(null, false);
}
      return done(null,user);
    })
  }
))

  //passport use a strategy to auth via github
  passport.use(new GithubStrategy({
    clientID:process.env['GITHUB_CLIENT_ID'],
    clientSecret:process.env['GITHUB_CLIENT_SECRET'],
    callbackURL:'https://boilerplate-advancednode.georgiospasentsis.repl.co/auth/github/callback'
  },function(accessToken, refreshToken, profile,cb){
    //console.log(profile);
    myDataBase.findOneAndUpdate(
      { id: profile.id },
      {
        $setOnInsert: {
          id: profile.id,
          name: profile.displayName || 'John Doe',
          //photo: profile.photos[0].value || '',
          email: Array.isArray(profile.emails)
            ? profile.emails[0].value
            : 'No public email',
          created_on: new Date(),
          provider: profile.provider || ''
        },
        $set: {
          last_login: new Date()
        },
        $inc: {
          login_count: 1
        }
      },
      { upsert: true, new: true },
      (err, doc) => {
        return cb(null, doc.value);
      }
    );
  })
               )
                                 
  
}