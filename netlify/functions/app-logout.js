const { buildClearCookie } = require("./lib/session");

exports.handler = async (event) => {
  return {
    statusCode: 302,
    headers: { Location: "/login", "Set-Cookie": buildClearCookie() },
    body: ""
  };
};
