
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.afterSave("FriendRelation", function(request) {
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

          request.object.save({silent:true});
        }
      })
      
    },

    error: function(error) {
      console.error("Got an error " + error.code + " : " + error.message);
    }
  });

});

