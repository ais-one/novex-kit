## git

### Commands



```bash
# https://gcc.gnu.org/legacy-ml/gcc/2007-12/msg00165.html
# cleaning up your .git folder
git repack -a -d -f --depth=250 --window=250

# to set/unset buffer size... when you have large .git
git config http.postBuffer 524288000
git config --unset http.postBuffer

git config --list
git add .
git commit -m "msg"
git push origin <branch>
git checkout <branch>
git checkout -b <new branch>
git branch
git branch -D <branch>
git log
git status
git merge <from branch>
git diff
git pull origin <branch>
git remote -v
git remote set-url origin git@hostname:USERNAME/REPOSITORY.git
git remote set-url httpsorigin https://hostname:USERNAME/REPOSITORY.git
git remote add neworigin https://github.com/user/repo.git
git remote rm someorigin
git reset --hard
git commit -am "some message"

# remove file or folder from tracking
git rm --cached <file>
git rm -r --cached <folder>
```

### clone git repo without history

$ git clone ...
$ cd path/to/repo
$ rm -rf .git
$ git init

git clone --depth 1 <remote_repo_url>

https://www.atlassian.com/git/tutorials/comparing-workflows

## Branch Name

- Keep it short, <prefix>-<issue/ticket number>
- prefix = feat, fix

## Commit messages

https://www.alibabacloud.com/blog/how-can-we-standardize-git-commits_597372

Format of Commit Message
<type>(<scope>): <subject>

### Type (required)

This indicates the type of the git commit. Only the following types are allowed:

- feat: Introduces a new feature.
- fix/to: Fixes a bug found by QA or developers.
- fix: Generates diff and automatically fixes a bug. This is used to fix bugs with a single commit.
- to: Only generates a diff instead of automatically fixing the bug. This is used for multiple commits. Then, you can use fix for the commit when you finally fix the bug.
- docs: Commits documentation only changes.
- style: Commits format changes that do not affect code running.
- refactor: Commits a code change that neither fixes a bug nor adds a feature.
- perf: Commits optimization changes, such as to improve performance and experience.
- test: Adds tests.
- chore: Commits changes to the build process or supporting tools.
- revert: Rolls back to the previous version.
- merge: Merges code.
- sync: Synchronizes bugs of the main thread or a branch.

### Scope (optional)

Scope is used to describe the scope of the impact of a commit, such as the data layer, control layer, or view layer, depending on the project.

For example, in Angular, it can be location, browser, compile, rootScope, ngHref, ngClick, or ngView. If your modification affects more than one scope, you can use \* instead.

### Subject (required)

The subject is a brief description of the purpose of a commit. It can be up to 50 characters in length. Do not end with a period or other punctuation marks.

Therefore, the git commit message will be in the following formats:

```
Fix(DAO): User query missing the username attribute
feat(Controller): Development of user query interfaces
```

https://gist.github.com/robertpainsi/b632364184e70900af4ab688decf6f53

References in commit messages
If the commit refers to an issue, add this information to the commit message header or body. e.g. the GitHub web platform automatically converts issue ids (e.g. #123) to links referring to the related issue. For issues tracker like Jira there are plugins which also converts Jira tickets, e.g. Jirafy.

In header:

```
[#123] Refer to GitHub issue…
CAT-123 Refer to Jira ticket with project identifier CAT…
```

In body:

```
Fixes #123, #124
```

https://wiki.openstack.org/wiki/GitCommitMessages

## Github

### Github pages

https://dev.to/yuribenjamin/how-to-deploy-react-app-in-github-pages-2a1f

```bash
npm i -D gh-pages
```

package.json

```json
{
  "homepage": "http://<username>.github.io/<repo-name>",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d <build folder>"
  }
}
```

## Git Hooks

- https://dev.to/krzysztofkaczy9/do-you-really-need-husky-247b
- https://dev.to/azu/git-hooks-without-extra-dependencies-like-husky-in-node-js-project-jjp

### commitizen

```bash
npx commitizen init cz-conventional-changelog --save-dev --save-exact
```

.git/hooks/prepare-commit-msg

```bash
#!/bin/bash
exec < /dev/tty && node_modules/.bin/cz --hook || true
```



# Merge updates from upstream

## From Clone

### ref

- https://medium.com/geekculture/how-to-use-git-to-downstream-changes-from-a-template-9f0de9347cc2
- https://www.mslinn.com/git/700-propagating-git-template-changes.html

### steps

**initial setup**

```bash
git clone <template repo> <new repo>
git remote add upstream <template repo>
# git remote add upstream https://github.com/ais-one/my-template.git
git remote set-url --push upstream no_push
git remote -v
```

**updates**

```bash
# to get upstream updates
git fetch upstream
git merge upstream/main

# or if needed...
git merge upstream/main --allow-unrelated-histories
# or if using rebase...
git rebase upstream/main
# checkout code... if needed
git checkout --track origin/main

git push origin <branch>
```

---

## From FORK

### https://gist.github.com/0xjac/85097472043b697ab57ba1b1c7530274 - To Test

### Merge updates from upstream for private fork

The [repository](https://github.com/usi-systems/easytrace) for the assignment is public and Github does not allow the creation of private forks for public repositories.

The correct way of creating a private fork by duplicating the repo is documented [https://help.github.com/articles/duplicating-a-repository/]().

For this assignment the commands are:

```bash
 # 1. Create a bare clone of the repository. (This is temporary and will be removed so just do it wherever.)
git clone --bare git@github.com:usi-systems/easytrace.git

#  2. [Create a new private repository on Github](https://help.github.com/articles/creating-a-new-repository/) and name it `easytrace`.

# 3. Mirror-push your bare clone to your new `easytrace` repository.
#  > Replace `<your_username>` with your actual Github username in the url below.

cd easytrace.git
git push --mirror git@github.com:<your_username>/easytrace.git

# 4. Remove the temporary local repository you created in step 1.
cd ..
rm -rf easytrace.git

# 5. You can now clone your `easytrace` repository on your machine (in my case in the `code` folder).
cd ~/code
git clone git@github.com:<your_username>/easytrace.git

# 6. If you want, add the original repo as remote to fetch (potential) future changes.
# Make sure you also disable push on the remote (as you are not allowed to push to it anyway).
git remote add upstream git@github.com:usi-systems/easytrace.git
git remote set-url --push upstream DISABLE

git remote -v
# origin	git@github.com:<your_username>/easytrace.git (fetch)
# origin	git@github.com:<your_username>/easytrace.git (push)
# upstream	git@github.com:usi-systems/easytrace.git (fetch)
# upstream	DISABLE (push)

# > When you push, do so on `origin` with `git push origin`.

# > When you want to pull changes from `upstream` you can just fetch the remote and rebase on top of your work.
git fetch upstream
# or merge
git rebase upstream/master

# And solve the conflicts if any

```


## Sparse Checkout

https://www.baeldung.com/ops/git-clone-subdirectory


```bash
git clone --depth=1 https://github.com/<org/user>/<repo>.git
cd <repo>
git sparse-checkout set --no-cone <sub-directory>

# e.g. The ‘!*/tomcat-app’ pattern directs the command to ignore any child resource named tomcat-app in the sibling subdirectories of the tomcat-app subdirectory:
# git sparse-checkout set --no-cone tomcat-app/ '!*/tomcat-app'

# git sparse-checkout add webservices
# git sparse-checkout disable
```


## Github

https://github.com/ais-one/cookbook/settings/security_analysis

- secret scanning: enable
  - push protection: enable

https://github.com/ais-one/cookbook/settings/branches

- branch protection

https://github.com/settings/tokens

- Setup PAT and allow for repo, workflow scopes

https://github.com/settings/developers

- Setup OAuth Apps
  - Callback: http://127.0.0.1:3000/api/oauth/callback

# Github Wiki Sidebar Example

- [Home](../wiki/Home)
  - [Page A](../wiki/Page-A)
  - [Page B](../wiki/Page-B)
- Another
  - [Page C](../wiki/Page-C)
  - [Page D](../wiki/Page-D)
- [Page E](../wiki/Page-E)

