
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.afterSave("FriendRelation", function(request) {

  updateMutualFriends = false;

  previousStatus = request.object.previous("status");
  if(previousStatus == "friends" || previousStatus == "unfriended") {
    currentStatus = request.object.get("status");

    if(currentStatus == "friends" || currentStatus == "unfriended") {
      updateMutualFriends = true;
    }
  }

  if(!updateMutualFriends) {
    //response.success();
    return;
  }

  request.object.save({silent: true});

  user = request.object.get("fromUser");
  friend = request.object.get("toUser");

  mutualQuery = new Parse.Query("FriendRelation");
  mutualQuery.equalTo("toUser", user);

  query = new Parse.Query("FriendRelation");
  query.equalTo("fromUser", friend).notEqualTo("toUser", user).containedIn("status", ["friends", "blocked"]).matchesKeyInQuery("toUser", "fromUser", mutualQuery);
  query.find({
    success: function(friendRelations) {
      console.log(friendRelations);
      mutualFriendsRelation = request.object.relation("mutualFriends");
      mutualFriendsRelation.query().find({
        success: function(friends) {
          mutualFriendsRelation.remove(friends);

          console.log(friendRelations)
          for(i=0; i<friendRelations.length; i++) {
            friendRelation = friendRelations[i];
            mutualFriendsRelation.add(friendRelation.get("toUser"))
          }

          //response.success();
        },

        error: function(error) {
          console.error("Got an error " + error.code + " : " + error.message);
          //response.error();
        }

      })
      
    },

    error: function(error) {
      console.error("Got an error " + error.code + " : " + error.message);
      //response.error();
    }
  });

});


Parse.Cloud.define("getNewData", function(request, response) {
  
  var sinceDate = request.since;
  var newSince = new Date();

  var promises = []

  // Get notifications
  var nullStatusQuery = new Parse.Query("Notification");
  nullStatusQuery.doesNotExist("status");

  var notDeletedStatusQuery = new Parse.Query("Notification");
  notDeletedStatusQuery.equalTo("status.deleted", false);

  var statusDeletedNotificationQuery = new Parse.Query("Notification");
  statusDeletedNotificationQuery.equalTo("type", "deletedStatus");

  var notificationQuery = Parse.Query.or(nullStatusQuery, notDeletedStatusQuery, statusDeletedNotificationQuery);
  notificationQuery.equalTo("users", request.user);

  if(sinceDate) {
    notificationQuery.greaterThanOrEqualTo("createdAt", sinceDate);
  } else {
    var fiveDaysAgo = new Date((new Date()).getTime() - 60 * 60 * 24 * 5 * 1000);
    var fiveDaysAgoQuery = new Parse.Query("Notification");
    fiveDaysAgo.greaterThanOrEqualTo("createdAt", fiveDaysAgo);
    var notificationTypesNotAffectedByDate = ['requestAccepted', 'requestCanceled', 'requestSent', 'unfriended'];
    var notificationTypesQuery = new Parse.Query("Notification");
    notificationTypesQuery.containedIn("type", notificationTypesNotAffectedByDate);

    var fiveDaysAgoOrSpecialTypeQuery = Parse.Query.or(notificationTypesQuery, fiveDaysAgoQuery);

    notificationQuery.matchesKeyInQuery("objectId", "objectId", fiveDaysAgoOrSpecialTypeQuery);

    var statusNotExpiredQuery = new Parse.Query("Notification");
    statusNotExpiredQuery.greaterThanOrEqualTo("dateExpires", new Date());

    var notExpiredOrNull = Parse.Query.or(statusNotExpiredQuery, nullStatusQuery);
    notificationQuery.matchesKeyInQuery("objectId", "objectId", notExpiredOrNull);
  }

  notificationPromise = notificationQuery.find({
    success: function(notifications) {
      console.log(notifications);
    }
  })

  // Get chats and messages
  var chatsQuery = new Parse.Query("Chat");
  chatsQuery.equalTo("members", request.user);

  var messageQuery = new Parse.Query("ChatMessage");
  messageQuery.matchesQuery("chat", chatsQuery).addAscending("createdAt").include("chat");
  if(sinceDate) {
    messageQuery.greaterThanOrEqualTo("createdAt", sinceDate);
  }
  messagePromise = messageQuery.find();
  promises.push(messagePromise);
  messagePromise.then(function(messages) {
      console.log(messages);
      chats = {}
      for(i=0; i<messages.length; i++) {
        chat = messages[i].get("chat");
        chats[chat.id] = chat;
      }

      chatList = []
      for(var key in chats) {
        chatList.push(key);
      }

      var chatQuery = new Parse.Query("Chat");
      chatQuery.containedIn("objectId", chatList).include("members");

      return chatQuery.find();

    },

    function(error) {
      console.log(error);
    }
  ).then(function(chats) {
    console.log(chats);
  });

  console.log(chats);
  console.log(messages);
  console.log(notifications);

  promises = Parse.Promise.when(promises).then(function() {
    response.success({"chats": chats, "messages": messages, "notifications": notifications})
  })

});



var twilio = require("twilio");
twilio.initialize("AC817361952ac118a49a3ff58e1d54fbca","2a8e0b3f9fcd19598ed3814bd7db5dc9");

Parse.Cloud.define("inviteWithTwilio", function(request, response) {
  // Use the Twilio Cloud Module to send an SMS
  var phoneNumberArray = request.params.phoneNumbers;
  console.log(request.params.phoneNumbers);
  for(var i = 0; i < phoneNumberArray.length; i++)
  {
    console.log(phoneNumberArray[i]);
    twilio.sendSMS({
      From: "+1-832-463-2623",
      To: phoneNumberArray[i],
      Body: "Start using Parse and Twilio!"
    }, {
      success: function(httpResponse) { response.success("SMS sent!"); },
      error: function(httpResponse) { response.error(httpResponse); }
    });
  }

});
