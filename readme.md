# github-review-bot

This was originally based off the [`peer-review-bot`](https://github.com/felixrieseberg/peer-review-bot) by [Felix Rieseberg](https://github.com/felixrieseberg).

---

This is a node.js bot that checks repositories for Pull Requests to see if they
the appropriate number of reviews. It will automatically label, and merge the PRs.

 _Peer Review Bot_ responds to Github WebHooks and labels PRs as 'needs-review' or as
'peer-reviewed', depending on how many people had commented with a 'LGTM' or ':+1:'.

If anyone replies with 'needs work', or ':-1:' it will not 'move ahead' with
the merge until that person follows up with 'LGTM' or ':+1:'.

Once you create a Pull Request, in a repository that _Peer Review Bot_ is monitoring,
it will comment on the Pull Request on how things work.

![Initial Comment](http://i.imgur.com/TyNYxU9.png)

 _Peer Review Bot_ also registers with Github as a status. This will allow you to configure
your repository to prevent the merge from being performed, unless the reviews are
met.

![Status](http://i.imgur.com/VlsZ7dU.png)

Don't think you can fool _Peer Review Bot_ by just voting on your own Pull Request,
he does not like that.

![Shame!](http://i.imgur.com/Fb6VGdY.png)

---

## Configuration

These values should be set in an `.env` file that is located in the root of the project. These
values are then loaded into the environment when the bot initializes.

- `env[GRB_ACCESS_TOKEN]` : A personal access token that is used to authenticate the user
- `env[GRB_BOT_URL]` : The base url for the callbacks to the bot
- `env[GRB_WEBHOOK_SECRET]` : A secret token that is provided to Github for verification


## Endpoints

- `/` : Default information page
- `/repos` : configure the repositories that should be monitored
- `/repos/:repo` : configure the specified repo that should be monitored
- `/pullrequest` : endpoint for the webhook to notify of the pull request
