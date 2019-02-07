const AWS = require('aws-sdk');

exports.handler = (data, context) => {

  const commitParams = {
    'commitId': 'a7105106de2ac4214268ff12dbeabdf58c4b14e0',
    'repositoryName': 'njal',
  };

  const commit = new AWS.CodeCommit();

  commit.getCommit (commitParams, (err, data) => {
    if (err) {
      console.log(err, err.stack);
    }else {
      console.log(`Commit name ${data.commit.author.name}`);
    }
  });


};
