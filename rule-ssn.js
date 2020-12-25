function (user, context, callback) {
  var userApiUrl = 'https://finkontoret.eu.auth0.com/api/v2/users';
  
  // Check if SSN exists on user logging in, only merge if SSN is there.
  if (!user.ssn) {
		console.log('===> SSN not found on this user');
    return callback(null, user, context);
  }
  
  // Save SSN to a searchable field on this user object
 	user.user_metadata = user.user_metadata || {};
  user.user_metadata.ssn = user.ssn;
  
  auth0.users.updateUserMetadata(user.user_id, user.user_metadata)
  	.then(() => {
    	console.log('===> User metadata updated with SSN');
      callback(null, user, context);
    })
    .catch((err) => {
      callback(err);
    });
  
  // Get existing user with the same SSN
	var request = require("request");
	var options = {
  	method: 'GET',
  	url: userApiUrl,
  	qs: {
      q: 'user_metadata.ssn:"' +user.user_metadata.ssn +'"', 
      search_engine: 'v3'
    },
  	headers: {authorization: 'Bearer ' +configuration.AUTH0_API_TOKEN}
	};

	request(options, function (error, response, body) {
  	if (error) throw new Error(error);
        
    var data = JSON.parse(body);
		if (data.length > 0) {
    	console.log(">> Got response(s)");

      async.each(data, function(targetUser, cb) {
        if (targetUser.user_metadata.ssn) {
          console.log(">> Target user has SSN: " +targetUser.user_metadata.ssn);
          var aryTmp = user.user_id.split('|');
          var provider = aryTmp[0];
          console.log(">> This user has provider: " +provider);
          console.log("Updating user: " +targetUser.user_id);
          request.post({
            url: userApiUrl + '/' + targetUser.user_id + '/identities',
            headers: {
              Authorization: 'Bearer ' + configuration.AUTH0_API_TOKEN
            },
            json: { provider: provider, user_id: user.user_id }
          }, function(err, response, body) {
             	if (error) throw new Error(error);
							console.log("Updated ok!");
        			callback(err, user, context);
          	}
          );
        } else {
        	callback(null, user, context);
        }
      }, function(err) {
				console.log('>> Error updating user');
        console.log(err);
        callback(err, user, context);
      });
      
    }

    
	});
  
  return callback(null, user, context);
}
