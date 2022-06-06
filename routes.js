const bcrypt = require('bcrypt');
const passport = require('passport'); 

module.exports = function(app,myDataBase){
    // Be sure to change the title
  app.route('/').get((req, res) => {
    //Change the response to render the Pug template
    res.render('pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin:true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  //add login route using passport.authenticate. if successful then redirect to profile else redirect to '/'
  app.route("/login").post(passport.authenticate('local',{failureRedirect:'/'}),(req,res)=>{
    res.redirect('/profile');
  })


  //get the profile route after ensuring that the user is authenticated and logged in
  app.route('/profile').get(ensureAuthenticated,(req,res)=>{
    res.render(process.cwd()+'/views/pug/profile',{username:req.user.username});
  })

  //logout and unauthenticate the user
  app.route('/logout').get((req,res)=>{
    req.logout();
    res.redirect('/');
  })

  //register new user route
  app.route('/register').post((req,res,next)=>{
    const hash = bcrypt.hashSync(req.body.password,12);
    myDataBase.findOne({username:req.body.username},(err,user)=>{
      if (err){
        next(err);
      }else if (user){
        res.redirect('/');
      }else{
        myDataBase.insertOne({
          username:req.body.username,
          password:hash
        },(err,document)=>{
          if (err) {
              res.redirect('/');
            } else {
              // The inserted document is held within
              // the ops property of the doc
              next(null, document.ops[0]);
            }
        })
      }
    })
  },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
);
//authenticate via github and redirect to profile via callback
  app.route("/auth/github").get(passport.authenticate("github"))
  app.route("/auth/github/callback").get(passport.authenticate("github",{failureRedirect:"/"}),(req,res)=>{

    req.session.user_id=req.user.id
    res.redirect("/chat");
})
  //route for chat
  app.route("/chat").get(ensureAuthenticated,(req,res)=>{
    res.render(process.cwd()+"/views/pug/chat",{user:req.user})
  })

  //middleware for handling 404s.needs to be after all the other routes else every page shows 404
  app.use((req,res,next)=>{
  res.status(404)
  .type('text')
  .send('Not found')
});

  function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};

                   
}