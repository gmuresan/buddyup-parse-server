require('cloud/app.js');

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
// Parse.Cloud.define("hello", function(request, response) {
//   response.success("Hello world!");
// });

Parse.Cloud.beforeSave("FriendRelation", function(request, response) {
  if (!request.object.existed()) {
    var query = new Parse.Query("FriendRelation");
    query.equalTo("fromUser", request.object.get("fromUser"));
    query.equalTo("toUser", request.object.get("toUser"));

    query.first().then(function(friendRelation) {
      if(friendRelation) {
        response.error("");
      } else {
        response.success();
      }
    }, function(error) {
      response.success();
    });

  } else {
    response.success();
  }
});


// Parse.Cloud.afterSave("FriendRelation", function(request) {

//   updateMutualFriends = false;

//   previousStatus = request.object.previous("status");
//   if(previousStatus == "friends" || previousStatus == "unfriended") {
//     currentStatus = request.object.get("status");

//     if(currentStatus == "friends" || currentStatus == "unfriended") {
//       updateMutualFriends = true;
//     }
//   }

//   if(!updateMutualFriends) {
//     //response.success();
//     return;
//   }

//   request.object.save({silent: true});

//   user = request.object.get("fromUser");
//   friend = request.object.get("toUser");

//   mutualQuery = new Parse.Query("FriendRelation");
//   mutualQuery.equalTo("toUser", user);

//   query = new Parse.Query("FriendRelation");
//   query.equalTo("fromUser", friend).notEqualTo("toUser", user).containedIn("status", ["friends", "blocked"]).matchesKeyInQuery("toUser", "fromUser", mutualQuery);
//   query.find({
//     success: function(friendRelations) {
//       //console.log(friendRelations);
//       mutualFriendsRelation = request.object.relation("mutualFriends");
//       mutualFriendsRelation.query().find({
//         success: function(friends) {
//           mutualFriendsRelation.remove(friends);

//           //console.log(friendRelations)
//           for(i=0; i<friendRelations.length; i++) {
//             friendRelation = friendRelations[i];
//             mutualFriendsRelation.add(friendRelation.get("toUser"))
//           }

//           //response.success();
//         },

//         error: function(error) {
//           console.error("Got an error " + error.code + " : " + error.message);
//           //response.error();
//         }

//       })
      
//     },

//     error: function(error) {
//       console.error("Got an error " + error.code + " : " + error.message);
//       //response.error();
//     }
//   });

// });

Parse.Cloud.job("testNotificationsJob", function(request, status) {

  var nullStatusQuery = new Parse.Query("Notification");
  nullStatusQuery.doesNotExist("status");
  var statusDeletedNotificationQuery = new Parse.Query("Notification");
  statusDeletedNotificationQuery.equalTo("type", "deletedStatus");
  var statusNotDeletedQuery = new Parse.Query("Status");
  statusNotDeletedQuery.equalTo("deleted", false);
  var notificationsWithStatusNotDeletedQuery = new Parse.Query("Notification");
  notificationsWithStatusNotDeletedQuery.matchesKeyInQuery("status", "objectId", statusNotDeletedQuery);
  var notificationQuery = Parse.Query.or(nullStatusQuery, statusDeletedNotificationQuery, notificationsWithStatusNotDeletedQuery);
  notificationQuery.equalTo("users", request.user);
  notificationQuery.include("status").include("status.location");
  notificationQuery.include("user");
  notificationQuery.include("usersViewed");
  var fiveDaysAgo = new Date((new Date()).getTime() - 60 * 60 * 24 * 5 * 1000);
  var fiveDaysAgoQuery = new Parse.Query("Notification");
  fiveDaysAgoQuery.greaterThanOrEqualTo("createdAt", fiveDaysAgo);

  var notificationTypesNotAffectedByDate = ['requestAccepted', 'requestCanceled', 'requestSent', 'unfriended'];
  var notificationTypesQuery = new Parse.Query("Notification");
  notificationTypesQuery.containedIn("type", notificationTypesNotAffectedByDate);

  var fiveDaysAgoOrSpecialTypeQuery = Parse.Query.or(notificationTypesQuery, fiveDaysAgoQuery);

  notificationQuery.matchesKeyInQuery("objectId", "objectId", fiveDaysAgoOrSpecialTypeQuery);

  notificationQuery.find().then(function(result) {
    console.log("@@@@#EWD1");
    console.log("result: "  + result);
  });

  var statusNotExpiredQuery = new Parse.Query("Notification");
  statusNotExpiredQuery.greaterThanOrEqualTo("dateExpires", new Date());

  var notExpiredOrNull = Parse.Query.or(statusNotExpiredQuery, nullStatusQuery);
  notificationQuery.matchesKeyInQuery("objectId", "objectId", notExpiredOrNull);


});

Parse.Cloud.define("getNewData", function(request, response) {
  
  var sinceDate = request.params.since;
  console.log( " SINCE: " + sinceDate);
  var newSince = new Date();

  var promises = []
  var newChats = [];
  var newNotifications = [];
  var newMessages = []

  // Get notifications
  var nullStatusQuery = new Parse.Query("Notification");
  nullStatusQuery.doesNotExist("status");

  var statusDeletedNotificationQuery = new Parse.Query("Notification");
  statusDeletedNotificationQuery.equalTo("type", "deletedStatus");

  var statusNotDeletedQuery = new Parse.Query("Status");
  statusNotDeletedQuery.equalTo("deleted", false);
  var notificationsWithStatusNotDeletedQuery = new Parse.Query("Notification");
  notificationsWithStatusNotDeletedQuery.matchesKeyInQuery("status", "objectId", statusNotDeletedQuery);

  var notificationQuery = Parse.Query.or(nullStatusQuery, statusDeletedNotificationQuery, notificationsWithStatusNotDeletedQuery);
  notificationQuery.equalTo("users", request.user);
  notificationQuery.include("status").include("status.location");
  notificationQuery.include("user");
  notificationQuery.include("usersViewed");

  if(sinceDate) {
    notificationQuery.greaterThanOrEqualTo("createdAt", sinceDate);
  } else {
     var fiveDaysAgo = new Date((new Date()).getTime() - 60 * 60 * 24 * 5 * 1000);
     var fiveDaysAgoQuery = new Parse.Query("Notification");
     fiveDaysAgoQuery.greaterThanOrEqualTo("createdAt", fiveDaysAgo);
     //fiveDaysAgoQuery.limit("1000");

     var notificationTypesNotAffectedByDate = ['requestAccepted', 'requestCanceled', 'requestSent', 'unfriended'];
     var notificationTypesQuery = new Parse.Query("Notification");
     notificationTypesQuery.containedIn("type", notificationTypesNotAffectedByDate); //this query could break notifications when loggin in since there is no limit on how many friend request statuses we get
     //notificationTypesQuery.limit("1000");

     var fiveDaysAgoOrSpecialTypeQuery = Parse.Query.or(notificationTypesQuery, fiveDaysAgoQuery);
     fiveDaysAgoOrSpecialTypeQuery.equalTo("users", request.user);
     fiveDaysAgoOrSpecialTypeQuery.limit("1000");

     notificationQuery.matchesKeyInQuery("objectId", "objectId", fiveDaysAgoOrSpecialTypeQuery);

  }

  promises.push(notificationQuery.find().then(function(notifications) {
      //console.log(notifications);
      //users = [];
      //console.log("NOTIF: " + notifications);
      for(i=0; i<notifications.length; i++) {
        notif = notifications[i];
        status = notif.get("status");
        console.log("STATUSTYPE: " + notif.get("type"));
        if(status != null)
          console.log("status " + status.get("objectId"));
        var dateExpires;
        var todaysDate;
        if(status) {
          dateExpires = new Date(status.get("dateExpires"));
          todaysDate = new Date();
          console.log("EX: " + dateExpires);
         // console.log("TODAYS: " + todaysDate);
        }
        if(!status || (status.get("deleted") != true && dateExpires.getTime() > todaysDate.getTime() ) || notif.get("type") == "deletedStatus") {
          newNotifications.push(notif);
          //users.push(notif.get("user"));
        }
      }
      
      return newNotifications;
      // var friendsQuery = new Parse.Query("FriendRelation");
      // friendsQuery.equalTo("fromUser", request.user);
      // friendsQuery.containedIn("objectId", users);
      // friendsQuery.containedIn("status", ["friends", "blocked"]);

      // return friendsQuery.find();

    },
    function(error) {
      console.log("notif");
      console.log(error);
    }
  ));

  // Get chats and messages
  var chatsQuery = new Parse.Query("Chat");
  chatsQuery.equalTo("members", request.user);

  var messageQuery = new Parse.Query("ChatMessage");
  messageQuery.matchesQuery("chat", chatsQuery).addAscending("createdAt").include("chat");
  if(sinceDate) {
    messageQuery.greaterThanOrEqualTo("createdAt", sinceDate);
  }
  messagePromise = messageQuery.find();
  promises.push(messagePromise.then(function(messages) {
      newMessages = messages;

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
      chatQuery.containedIn("objectId", chatList);//.include("members").include("exMembers").include("viewedMembers");
      var chatQueryNeedUpdate = new Parse.Query("Chat");
      chatQueryNeedUpdate.greaterThanOrEqualTo("needsUpdate", sinceDate);
      var finalChatQuery =  new Parse.Query.or(chatQuery, chatQueryNeedUpdate);
      finalChatQuery.include("members").include("exMembers").include("viewedMembers");

      chatPromise = finalChatQuery.find();
      return chatPromise;

    },

    function(error) {

      console.log(error);
    }
  ).then(
    function(chats) {
      newChats = chats;
      console.log("new chats" + newChats.length);
      return chats;
    },
    function(error) {
      console.log(error);
    }
  ));

  promises2 = Parse.Promise.when(promises).then(function(a, b) {
    response.success({"chats": newChats, "messages": newMessages, "notifications": newNotifications, "newSince": newSince})
  });

});



var twilio = require("twilio");
twilio.initialize("AC817361952ac118a49a3ff58e1d54fbca","2a8e0b3f9fcd19598ed3814bd7db5dc9");

Parse.Cloud.define("inviteWithTwilio", function(request, response) {
  // Use the Twilio Cloud Module to send an SMS
  var phoneNumberArray = request.params.phoneNumbers;
  var sendingUser = request.params.sendingUser;
  var statusUrl = request.params.statusUrl;
  var successfullySent = 0;
  for(var i = 0; i < phoneNumberArray.length; i++)
  {
    console.log(phoneNumberArray[i]);
    twilio.sendSMS({
      From: "+1-832-463-2623",
      To: phoneNumberArray[i],
      Body: sendingUser + " has invited you to an activity on BuddyUp. Click here to find out more: " + statusUrl
    }, {
      success: function(httpResponse) { 
        successfullySent++;
        if(successfullySent == phoneNumberArray.length) {
          response.success("SMS sent!"); 
        } 
    },
      error: function(httpResponse) { response.error(httpResponse); }
    });
  }

});

var _ = require('underscore.js');

var DAILY_COMPOUND_RATE = 0.99;

var ATTENDING_WEIGHT = 20;
var INVITED_WEIGHT = 8;
var COMMENT_WEIGHT = 2;
var ACTIVE_CHAT_MESSAGE_WEIGHT = 2;
var PASSIVE_CHAT_MESSAGE_WEIGHT = 1;

Parse.Cloud.job("updateSuggestedFriends", function(request, status) {
  Parse.Cloud.useMasterKey();

  var oldSuggestedFriendsQuery = new Parse.Query("FriendRelation");
  //oldSuggestedFriendsQuery.limit(1000);
  console.log("test");
  var toSave = new Array();
  oldSuggestedFriendsQuery.each(function(suggestedFriend) {
    var score = suggestedFriend.get("suggestedFriendScore");
    var newScore = score*DAILY_COMPOUND_RATE;
    suggestedFriend.set("suggestedFriendScore", newScore);
    toSave.push(suggestedFriend);
    console.log("Suggested " + suggestedFriend);
    return toSave;
  }).then(function() {
    console.log("Tosave" + toSave);
    console.log("Size " + toSave.length);
    return Parse.Object.saveAll(toSave);
  }).then(function() {
    var query = new Parse.Query("SuggestedFriendsRunDate");
    var dateSinceUpdate;
    return query.first();
  }).then(function(lastUpdatedDate) {
    dateSinceUpdate = lastUpdatedDate;
    var query = new Parse.Query("Status");
    query.limit(1000);
    query.include("usersAttending");
    query.include("usersInvited");
    if(dateSinceUpdate != null)
    {
      query.greaterThanOrEqualTo("dateExpires", dateSinceUpdate.get("lastUpdate"));
    }
    return query.find();


  }).then(function(statuses){

    var promise = Parse.Promise.as();

    _.each(statuses, function(status) {

      promise = promise.then(function() {

        var attendingFriendQuery1 = new Parse.Query("FriendRelation");
        attendingFriendQuery1.equalTo("toUser", status.get("user"));
        attendingFriendQuery1.containedIn("fromUser", status.get("usersAttending"));
        attendingFriendQuery1.limit(1000);
        var attendingFriendQuery2 = new Parse.Query("FriendRelation");
        attendingFriendQuery2.equalTo("fromUser", status.get("user"));
        attendingFriendQuery2.containedIn("toUser", status.get("usersAttending"));
        attendingFriendQuery2.limit(1000);
        var attendingFriendQuery = new Parse.Query.or(attendingFriendQuery1, attendingFriendQuery2);
        attendingFriendQuery.limit(1000);
        return attendingFriendQuery.find();

      }).then(function(attendingFriendRelation) {
        console.log(attendingFriendRelation.length);
        for(var i = 0; i < attendingFriendRelation.length; i++) {
          //console.log(i);
          attendingFriendRelation[i].increment("suggestedFriendScore", ATTENDING_WEIGHT);

        }
        return Parse.Object.saveAll(attendingFriendRelation);
      }).then(function(){
        //console.log(invitedUsers.length);
        var invitedFriendQuery1 = new Parse.Query("FriendRelation");
        invitedFriendQuery1.equalTo("toUser", status.get("user"));
        invitedFriendQuery1.containedIn("fromUser", status.get("usersInvited"));
        invitedFriendQuery1.limit(1000);

        var invitedFriendQuery2 = new Parse.Query("FriendRelation");
        invitedFriendQuery2.equalTo("fromUser", status.get("user"));
        invitedFriendQuery2.containedIn("toUser", status.get("usersInvited"));
        invitedFriendQuery2.limit(1000);

        var invitedFriendQuery = new Parse.Query.or(invitedFriendQuery1, invitedFriendQuery2);
        invitedFriendQuery.limit(1000);
        return invitedFriendQuery.find();

      }).then(function(invitedFriendRelation) {
        //console.log(invitedFriendRelation.length);
        for(var i = 0; i < invitedFriendRelation.length; i++) {
          invitedFriendRelation[i].increment("suggestedFriendScore", INVITED_WEIGHT);
        }
        return Parse.Object.saveAll(invitedFriendRelation);

      }).then(function() {
        var statusMessageQuery = new Parse.Query("StatusMessage");
        statusMessageQuery.equalTo("status", status);
        statusMessageQuery.limit(1000);
        return statusMessageQuery.find();
      }).then(function(statusMessages) {

        var messagePromise = new Parse.Promise.as();
        _.each(statusMessages, function(statusMessage) {
          messagePromise = messagePromise.then(function() {
            var messageUserQuery1 = new Parse.Query("FriendRelation");
            messageUserQuery1.equalTo("toUser", statusMessage.get("user"));
            messageUserQuery1.equalTo("fromUser", status.get("user"));
            messageUserQuery1.limit(1000);

            var messageUserQuery2 = new Parse.Query("FriendRelation");
            messageUserQuery2.equalTo("fromUser", statusMessage.get("user"));
            messageUserQuery2.equalTo("toUser", status.get("user"));
            messageUserQuery2.limit(1000);
            var messageUserQuery = new Parse.Query.or(messageUserQuery1, messageUserQuery2);
            messageUserQuery.limit(1000);
            return messageUserQuery.find();
          }).then(function(statusMessageUsers) {
            //console.log(statusMessageUsers.length);
            for(var i = 0; i < statusMessageUsers.length; i++) {
              statusMessageUsers[i].increment("suggestedFriendScore", COMMENT_WEIGHT);
            }
            return Parse.Object.saveAll(statusMessageUsers);
          });
        });
        return messagePromise;

      });

    });
    return promise;
  }).then(function() {
    var chatQuery = new Parse.Query("Chat"); //add date limit
    chatQuery.include("members");
    chatQuery.limit(1000);
    return chatQuery.find();
  }).then(function(chats){
    //console.log(chats);
    var chatPromise = Parse.Promise.as();

    _.each(chats, function(chat) {
      chatPromise = chatPromise.then(function() {
        //console.log(chat.get("members"));
        var chatMessageQuery = new Parse.Query("ChatMessage");
        chatMessageQuery.equalTo("chat", chat);
        chatMessageQuery.limit(1000);
        if(dateSinceUpdate != null)
        {
          chatMessageQuery.greaterThanOrEqualTo("createdAt", dateSinceUpdate.get("lastUpdate"));
        }
        return chatMessageQuery.find();
      }).then(function(chatMessages) {
        var chatMessagePromise = Parse.Promise.as();
        _.each(chatMessages, function(chatMessage) {
          chatMessagePromise = chatMessagePromise.then(function() {
            var creator = chatMessage.get("user");
            var members = chat.get("members");
            var chatFriendRelationQuery1 = new Parse.Query("FriendRelation");
            chatFriendRelationQuery1.equalTo("toUser", creator);
            chatFriendRelationQuery1.containedIn("fromUser", members);
            chatFriendRelationQuery1.limit(1000);
            var chatFriendRelationQuery2 = new Parse.Query("FriendRelation");
            chatFriendRelationQuery2.equalTo("fromUser", creator);
            chatFriendRelationQuery2.containedIn("toUser", members);
            chatFriendRelationQuery2.limit(1000);
            var chatFriendRelationQuery = new Parse.Query.or(chatFriendRelationQuery1, chatFriendRelationQuery2);
            chatFriendRelationQuery.limit(1000);
            return chatFriendRelationQuery.find();
          }).then(function(chatFriends) {
            //console.log(chatFriends.length);
            for(var i = 0; i < chatFriends.length; i++) {
              chatFriends[i].increment("suggestedFriendScore", ACTIVE_CHAT_MESSAGE_WEIGHT);
            }
            return Parse.Object.saveAll(chatFriends);
          }).then(function() {           
            var creator = chatMessage.get("user");
            var members = chat.get("members");
            var passiveMemberQuery = new Parse.Query("FriendRelation");
            passiveMemberQuery.limit(1000);
            passiveMemberQuery.containedIn("toUser", members);
            passiveMemberQuery.notEqualTo("toUser", creator);
            passiveMemberQuery.containedIn("fromUser", members);
            passiveMemberQuery.notEqualTo("fromUser", creator);
            return passiveMemberQuery.find();
          }).then(function(passiveFriends){
            for(var i = 0; i < passiveFriends.length; i++) {
              passiveFriends[i].increment("suggestedFriendScore", PASSIVE_CHAT_MESSAGE_WEIGHT);
            }
            return Parse.Object.saveAll(passiveFriends);
          });
        });
        return chatMessagePromise;
      });
    });
    return chatPromise;
  }).then(function() {
    console.log(dateSinceUpdate);
    if(dateSinceUpdate == null) {
      console.log("It worrrkes");
      var LastUpdate = Parse.Object.extend({
        className: "SuggestedFriendsRunDate"
      });
      var lastUpdate = new LastUpdate();
      lastUpdate.set("lastUpdate", new Date());
      return lastUpdate.save(); 
    } else {
      console.log("lastupdate");
      dateSinceUpdate.set("lastUpdate", new Date());
      return dateSinceUpdate.save();
    }
  }).then(function(){
    console.log("wtf");
    status.success("friends suggested score is updated");
  });   

});

Parse.Cloud.job("resetSuggestedScore", function(request, status) {
  var query = new Parse.Query("FriendRelation");
  query.find().then(function(friendRelations) {

    for(var i = 0; i < friendRelations.length; i++) {
      friendRelations[i].set("suggestedFriendScore", 0);
    }
    return Parse.Object.saveAll(friendRelations);
  }).then(function(){
    var lastUpdateQuery = new Parse.Query("SuggestedFriendsRunDate");
    return lastUpdateQuery.first();
  }).then(function(lastUpdate) {
   // lastUpdate.unset("lastUpdate");
    return lastUpdate.destroy();
  }).then(function() {
    status.success("scores are reset");
  });
});


Parse.Cloud.job("updateInstallationUserName", function(request, status) {

  Parse.Cloud.useMasterKey();
  var query = new Parse.Query(Parse.Installation);
  query.limit(1000);
  query.doesNotExist("userName");
  query.exists("user");
  query.include("user");
  query.find().then(function(installations) {

    var toSave = [];

    for(var i=0; i<installations.length; i++) {
      var installation = installations[i];
      var user = installation.get("user");
      if(!user) {
        continue;
      }

      installation.set("userName", user.get("searchName"));
      toSave.push(installation);
    }

    Parse.Object.saveAll(toSave).then(function(success) {
      if(success) {
        status.success("Installations updated with userNames");
      } else {
        status.error("Installations userNames update FAILED");
      }
    });

  });

});

Parse.Cloud.job("CountFriends", function(request, status) {
  Parse.Cloud.useMasterKey();

  var query = new Parse.Query(Parse.User);
  query.limit(1000);
  query.find().then(function(users) {
    
  });
});
