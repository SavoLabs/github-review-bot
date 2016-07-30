# github-review-bot
This is a node.js bot that checks repositories for Pull Requests to see if they
the appropriate number of reviews. It will automatically label, and merge the PRs.

The bot responds to Github WebHooks and labels PRs as 'needs-review' or as
'peer-reviewed', depending on how many people had commented with a 'LGTM' or ':+1:'.

If anyone replies with 'needs work', or ':-1:' it will not 'move ahead' with
the merge until that person follows up with 'LGTM' or ':+1:'.

---

## Configuration

- `env[botUsername]` : The username of the user that is authenticating  
- `env[accessToken]` : A personal access token that is used to authenticate the user


## Endpoints

- `/` : Default information page
- `/repos` : configure the repositories that should be monitored
- `/pullrequest` : endpoint for the webhook to notify of the pull request
- `/comment` : ?????
