const https = require('https');
const {URL} = require('url');
const AWS = require('aws-sdk');

const {slackURL, slackChannel} = process.env;

const slack = new URL(slackURL);

const slackOptions = {
  hostname: slack.hostname,
  path: slack.pathname,
  port: slack.port,
  method: 'POST',
};


const getCommitInfo = (id, name) => {
  let message = '';
  const commitParams = {
    'commitId': id,
    'repositoryName': name,
  };

  const commit = new AWS.CodeCommit();

  commit.getCommit (commitParams, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      message = 'Error getting commit data';
    }else {
      message = `${data.commit.author.name}: ${data.message}`;
    }
  });

  return message;
};

const sendSlackPost = (slackPost) => {
  // Send the message.
  const req = https.request(slackOptions, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`Response:  ${chunk}`);
    });
  });

  // Stuff for post method type.
  req.write(JSON.stringify(slackPost));
  req.end();
};

const assembleSlackPost = (err, data) => {
  slackPost = {
    channel: slackChannel,
    text: `*${data.message}*`,
    attachments: [{
      text: data.status,
      color: color,
    }]
  };

  // Add the details link, if we have it.
  if (typeof data.details !== 'undefined') {
    slackPost.attachments[0].fallback = `Details: ${data.details}`;
    slackPost.attachments[0].actions = [{
      text: "Details",
      type: "button",
      url: data.details,
    }];
  }
  sendSlackPost(slackPost);
};

/**
 *
 *
 * @param data
 * @param context
 */
exports.handler = (data, context) => {
  let slackPost;

  // The data object should be passed in a standardized format from the event
  // rule in CloudWatch, but it may be a lot of things.
  // If it's sent in from a rule, it should be in JSON format, but the object
  // will still be string. So, we try to convert it here with a try,
  // because a parse that goes wrong will bring our script to a halt.

  try {
    data = JSON.parse(data);
  }
  catch (e) {
    console.error(e);
  }


  // First, check to see if data was actually successfully converted.
  // For the intents of this script, this is the most common scenario.
  if (typeof data === 'object') {
    //A message directly underneath the data object means it has -supposedly-
    // been formatted by the event rule, so we assume some structure if the first
    // test passes.
    if (typeof data.message !== "undefined") {

      // Set the color if it's available in the data.
      // Or, determine color based on status message.
      // Otherwise, set the color to a notification color hex.
      let color = '';
      if (typeof data.color !== 'undefined') {
        color = data.color;
      }else {
        if (data.status.indexOf('SUCCEEDED') > -1 || data.status.indexOf('SUCCESS') > -1) {
          color = 'good';
        }else if (data.status.indexOf('FAILED') > -1  || data.status.indexOf('FAILURE') > -1) {
          color = 'danger';
        }else {
          color = '#439FE0';
        }
      }

      if (typeof data.commitId !== 'undefined') {
        data.status += getCommitInfo(data.commitId, data.name);
      }else {
        assembleSlackPost(data);
      }

    }
    else {
      //Just pretty print the content if no message is found.
      slackPost = {
        channel: slackChannel,
        text: JSON.stringify(data, null, 2),
      };
      sendSlackPost(slackPost)
    }
  }
  else {
    // If data is just a string, just pass it along.
    slackPost = {
      channel: slackChannel,
      text: data,
    };
  }

};


