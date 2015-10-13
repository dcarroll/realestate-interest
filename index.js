var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/AppRead/Home/', function(request, response) {
  response.render('pages/AppRead/Home/home');
});

app.get('/AppRead/oauthcallback/', function(request, response) {
  response.render('pages/oauthcallback');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});