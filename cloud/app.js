
// These two lines are required to initialize Express in Cloud Code.
var express = require('express');
var app = express();

var parseExpressHttpsRedirect = require('parse-express-https-redirect');

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(express.bodyParser());    // Middleware for reading request body
app.use(parseExpressHttpsRedirect());

// This is an example of hooking up a request handler with a specific request
// path and HTTP verb using the Express routing API.
app.get('/hello', function(req, res) {
  res.render('hello', { creatorName: 'Congrats, you just set up your app!' });
});

app.get('/current_activity', function(req, res) {
	var statusId = req.param('id');
	var query = new Parse.Query("Status");
	query.include('user');
	query.include('location');
	query.get(statusId, {
		success: function(status) {
			var timeIntervalText = getTimeIntervalText(status.get("dateStarts"), status.get("dateExpires"), status.get("timeZoneOffset"));
			var user = status.get('user');
			var location = status.get('location');
			res.render('current_activity' , {creatorName: user.get("firstName") + " " + user.get("lastName"),
											 facebookProfPic: "http://graph.facebook.com/" + user.get("facebookid") + "/picture?type=square&width=100&height=100",
											 statusText: status.get("text"),
											 timeIntervalText: status.get("timeIntervalText"),
											 locationVenue: location.get("venue")});

		},
		error: function(error) {

		}
	});

});

function getTimeIntervalText(dateStartsStr, dateExpiresStr, timeZoneOffset) {

	var startString;
	var endString;

	var dateStartsTZ = getDateTZ(dateStartsStr, timeZoneOffset);
	var dateExpiresTZ = getDateTZ(dateExpiresStr, timeZoneOffset);
	var copyDateStarts = new Date(dateStartsTZ);
	var copyDateExpires = new Date(dateExpiresTZ);
	var startIsToday = dateIsToday(copyDateStarts);
	var startIsTomorrow = dateIsTomorrow(copyDateStarts);
	var endIsToday = dateIsToday(copyDateExpires);
	var endIsTomorrow = dateIsTomorrow(copyDateExpires);

	if(startIsToday || startIsTomorrow) {
			console.log("dateStarts" + dateStartsTZ)
		startString = formatAMPM(dateStartsTZ);
		if(startIsTomorrow) {
			startString = "Tomorrow at " + startString;
		}
		console.log(startString);
	} else if( dateIsBetweenTwoAndSixDaysInFuture(copyDateStarts)) { //copy date already has time 0 out becaues of dateIsToday function
		startString = getWeekTimeFormat(dateStartsTZ);
		console.log(startString);
	} else {
		startString = getWeekMonthDayFormat(dateStartsTZ);
		console.log(startString);
	}
	console.log("today " + startIsToday);
	console.log("tomorrow " + startIsTomorrow);

	//var startIsToday = 
	//console.log("Teeeeest");
}

function getDateTZ(dateStr, timeZoneOffset){
	var dateStarts = new Date(dateStr);
	var startSeconds = dateStarts.getTime()/1000;
	var startSeconds = startSeconds + parseFloat(timeZoneOffset);
	var dateStartsTZ = new Date(0);
	dateStartsTZ.setTime(startSeconds*1000);
	return dateStartsTZ;
}

function dateIsToday(date) {
	var todaysDate = new Date();
	if(date.setHours(0,0,0,0) == todaysDate.setHours(0,0,0,0)) {
		return true;
	}
	return false;

}

function dateIsTomorrow(date) {
	var tomorrowsDate = new Date();
	tomorrowsDate.setDate(tomorrowsDate.getDate() + 1);
	if(date.setHours(0,0,0,0) == tomorrowsDate.setHours(0,0,0,0)) {
		return true;
	}
	return false;
}

function dateIsBetweenTwoAndSixDaysInFuture(date) {
	var twoDays = new Date();
	twoDays.setDate(twoDays.getDate() + 2);
	var sixDays = new Date();
	twoDays.setDate(twoDays.getDate() + 6);
	if(twoDays >= date && sixDays <= date) {
		return true;
	}
	return false;
}

function formatAMPM(date) {
 	console.log("date" + date);
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}

(function() {
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    var daysAbr = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    var monthsAbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    Date.prototype.getMonthName = function() {
        return months[ this.getMonth() ];
    };
    Date.prototype.getDayName = function() {
        return days[ this.getDay() ];
    };
    Date.prototype.getMonthAbrName = function() {
    	return monthsAbr[ this.getMonth() ];
    };
    Date.prototype.getDayAbrName = function() {
        return daysAbr[ this.getDay() ];
    };
})();

function getWeekTimeFormat(date) {
	var result = date.getDayName();
	result = result + " at " + formatAMPM(date);
	return result;
}

function getWeekMonthDayFormat(date) {
	var result = date.getDayAbrName();
	result = result + " " + date.getMonthAbrName() + " " + date.getDate();
	result = result + " at " + formatAMPM(date);
	return result;
}

// // Example reading from the request query string of an HTTP get request.
// app.get('/test', function(req, res) {
//   // GET http://example.parseapp.com/test?message=hello
//   res.send(req.query.message);
// });

// // Example reading from the request body of an HTTP post request.
// app.post('/test', function(req, res) {
//   // POST http://example.parseapp.com/test (with request body "message=hello")
//   res.send(req.body.message);
// });

// Attach the Express app to Cloud Code.
app.listen();
