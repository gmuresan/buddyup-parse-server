
// These two lines are required to initialize Express in Cloud Code.
var LOGIN_USER = "buddyupadmin";
var LOGIN_PASSWORD = "ezpassword123";
var express = require('express');
var app = express();
//var buddyupadmin = require('cloud/buddyupadmin');
var parseExpressHttpsRedirect = require('parse-express-https-redirect');

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(express.bodyParser());    // Middleware for reading request body
app.use(parseExpressHttpsRedirect());
  app.use(express.cookieParser("asdf"));

/******* ADMIN LOGIN ********************/
app.get('/buddyupadmin', function(req, res) {
	res.render('buddyupadmin', {});

});

app.post('/buddyuplogin', function(req, res) {
	var user = req.body.user;
	var password = req.body.password;
	if(user == LOGIN_USER && password == LOGIN_PASSWORD) {
		res.cookie('validLogin', 'yes', {signed: true, maxAge: 3600000});
		res.redirect('analytics');
	} else {
		res.redirect('buddyupadmin');
	}

})

app.get('/analytics', function(req, res) {
	var session = req.signedCookies['validLogin'];
	if(session != null && session == 'yes')
	{
		var query = new Parse.Query("User");
	 	query.find().then(function(users) {
	 		var dateArray = new Array();
	 		for(var i = 0; i < users.length; i++) {
	 			var unFormattedDate = users[i].createdAt;
	 			var tzDate = getDateTZ(unFormattedDate, -25200);

	 			dateArray.push(getWeekMonthDayFormat(tzDate));
	 		}
			res.render('analytics', {users: users,
									 numUsers: users.length.toString(),
									 tzDates: dateArray});

	 	});
	 }

});

app.post('/logout', function(req,res) {
	res.cookie('validLogin', 'no', {signed: true, maxAge: 10000});
	res.redirect('buddyupadmin');

})
/****************************************/

// This is an example of hooking up a request handler with a specific request
// path and HTTP verb using the Express routing API.
app.get('/hello', function(req, res) {
  	res.render('hello', { creatorName: 'Congrats, you just set up your app!' });
});

var activityIconPath = {eat: "img/eat_icon_selected_new.png", drink: "img/drink_icon_selected_new.png",
					    chill: "img/chill_icon_selected_new.png", sports:"img/sports_icon_selected_new.png",
					    event : "img/event_icon_selected_new.png" };

var GOOGLE_API_KEY = "AIzaSyDxi_YVwUKHLl5ePxDVDCoU7h_48mboXB8"



app.get('/current_activity', function(req, res) {
	var statusId = req.param('id');
	var query = new Parse.Query("Status");
	query.include('user');
	query.include('location');
	query.include("usersAttending");
	query.include("usersInvited");
	query.include("phoneContactsInvited");
	query.get(statusId, {
		success: function(status) {
			var timeIntervalText = getTimeIntervalText(status.get("dateStarts"), status.get("dateExpires"), status.get("timeZoneOffset"));
			var user = status.get('user');
			var location = status.get('location');
			var activityType = status.get('statusType');
			if(activityType == "go out") {
				activityTypeVal = "img/go_out_icon_selected_new.png";
			} else {
				var activityTypeVal = activityIconPath[activityType];
			}
			var usersAttendingArr = status.get("usersAttending");
			var usersInvitedArr = status.get("usersInvited");
			var phoneContactsInvited = status.get("phoneContactsInvited");
			var invitedArray ;
			var isExpired = checkIfExpired(status.get("dateExpires"), status.get("timeZoneOffset")) || status.get("deleted") == true;
			console.log("asdasd"  +  usersInvitedArr);
			if(usersInvitedArr != null && phoneContactsInvited != null) {
				invitedArray = usersInvitedArr.concat(phoneContactsInvited);
			} else if(usersInvitedArr == null && phoneContactsInvited != null) {
				invitedArray = phoneContactsInvited;
			} else {
				invitedArray = usersInvitedArr;
			}
			console.log(invitedArray);
			res.render('current_activity' , {creatorName: user.get("firstName") + " " + user.get("lastName"),
											 facebookProfPic: "http://graph.facebook.com/" + user.get("facebookid") + "/picture?type=square&width=100&height=100",
											 statusText: status.get("text"),
											 timeIntervalText: timeIntervalText,
											 locationVenue: location.get("venue"),
											 address: location.get("address"),
											 activityTypeUrl: activityTypeVal,
											 usersAttending: usersAttendingArr,
											 mapKey: GOOGLE_API_KEY,
											 geoPoint: location.get("geopoint"),
											 usersInvited: invitedArray,
											 isExpired: isExpired});

		},
		error: function(error) {

		}
	});

});

function checkIfExpired( dateExpiresStr, timeZoneOffset ) {
	var dateExpiresTZ = getDateTZ(dateExpiresStr);
	var todaysDate = new Date();
	if(dateExpiresTZ < todaysDate) {
		console.log("date is expired");
		return true;
	}
	return false;
}

function getTimeIntervalText(dateStartsStr, dateExpiresStr, timeZoneOffset) {

	var startString;
	var endString;

	var dateStartsTZ = getDateTZ(dateStartsStr, timeZoneOffset);
	var dateExpiresTZ = getDateTZ(dateExpiresStr, timeZoneOffset);
	var copyDateStarts = new Date(dateStartsStr);
	var copyDateExpires = new Date(dateExpiresStr);
	var startIsToday = dateIsToday(copyDateStarts);
	var startIsTomorrow = dateIsTomorrow(copyDateStarts);
	var endIsToday = dateIsToday(copyDateExpires);
	var endIsTomorrow = dateIsTomorrow(copyDateExpires);
	console.log( "start " + dateStartsTZ);
	console.log( "expire " + dateExpiresTZ);

	if(startIsToday || startIsTomorrow) {
			//console.log("dateStarts" + dateStartsTZ)
		startString = formatAMPM(dateStartsTZ);
		if(startIsTomorrow) {
			startString = "Tomorrow at " + startString;
		}
		//console.log(startString);
	} else if( dateIsBetweenTwoAndSixDaysInFuture(copyDateStarts)) { //copy date already has time 0 out becaues of dateIsToday function
		startString = getWeekTimeFormat(dateStartsTZ);
		//console.log(startString);
	} else {
		startString = getWeekMonthDayFormat(dateStartsTZ);
		//console.log(startString);
	}

	if(endIsToday || endIsTomorrow) {
		endString = formatAMPM(dateExpiresTZ);
		if(endIsTomorrow && !startIsTomorrow) {
			endString = "Tomorrow at " + endString;
		}
		//console.log(endString);
	} else if(dateIsBetweenTwoAndSixDaysInFuture(copyDateExpires)) {
		if(dateIsSameDay(copyDateStarts, copyDateExpires)) {
			endString = formatAMPM(dateExpiresTZ);
		} else {
			endString = getWeekTimeFormat(dateExpiresTZ);
		}
	} else {
		if(dateIsSameDay(copyDateStarts, copyDateExpires)) {
			endString = formatAMPM(dateExpiresTZ);
		} else {
			endString = getWeekMonthDayFormat(dateExpiresTZ);
		}
	}

	return startString + " until " + endString;
	//console.log("today " + startIsToday);
	//console.log("tomorrow " + startIsTomorrow);

	//var startIsToday = 
	//console.log("Teeeeest");
}

function getDateTZ(dateStr, timeZoneOffset){
	if(timeZoneOffset == null) {
		timeZoneOffset = 0;
	}
	var dateStarts = new Date(dateStr);
	var startSeconds = dateStarts.getTime()/1000;
	var startSeconds = startSeconds + parseFloat(timeZoneOffset);
	var dateStartsTZ = new Date(0);
	dateStartsTZ.setTime(startSeconds*1000);
	return dateStartsTZ;
}

function dateIsToday(date) {
	var todaysDate = new Date();
	console.log("DATE: "+date);
	console.log("todays date " + todaysDate);
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
 //	console.log("date" + date);
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

function dateIsSameDay(date1, date2) {  //only will work if time is 0 for both dates

	return date1.getTime() == date2.getTime();
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
