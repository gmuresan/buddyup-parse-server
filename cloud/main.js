
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

  var chatsQuery = new Parse.Query("Chat");
  chatsQuery.equalTo("members", request.user);

  var messageQuery = new Parse.Query("ChatMessage");
  messageQuery.matchesQuery("chat", chatsQuery).addAscending("createdAt").include("chat");
  if(sinceDate) {
    messageQuery.greaterThanOrEqualTo("createdAt", sinceDate);
  }
  messageQuery.find({
    success: function(messages) {
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

      chatQuery.find({
        success: function(chatList) {
          response.success({"messages": messages, "chats": chatList});
        },

        error: function(error) {
          response.error(error);
        }
      });

    },

    error: function(error) {
      response.error(error);
    }
  })

});





