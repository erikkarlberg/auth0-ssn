function (user, context, callback) {
  var userApiUrl = 'https://finkontoret.eu.auth0.com/api/v2/users';

  // Check if SSN exists on user logging in, only merge if SSN is there.
  if (!user.ssn) {
		console.log('===> SSN not found on this user');
    return callback(null, user, context);
  }

  console.log("===> Checking age");
  var birth = user.ssn.slice(0,8);
  var byear = parseInt(birth.slice(0,4));
  var bmonth = parseInt(birth.slice(4,6)-1);
  var bday = parseInt(birth.slice(6,8));

  var birthdate = new Date(byear, bmonth, bday);
  var turns18 = new Date(byear+18, bmonth, bday);

  if(turns18 <= new Date()) {
    console.log("===> Person is 18");
  } else {
    console.log("===> Come back " +turns18.toDateString());
    return callback(new UnauthorizedError('Du måste vara över 18 för att använda Finkontoret.'));
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
   	console.log('===> Get existing user with SSN: ', user.user_metadata.ssn);

  	if (error) {
      console.log('===> Error getting user');
      throw new Error(error);
    }

    var data = JSON.parse(body);
    console.log('===> Data: ', data);

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
