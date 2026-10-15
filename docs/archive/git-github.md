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
git switch -C <branch>
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

https://wiki.openstack.org/wiki/GitCommitMessages


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

---

# Github

## Wiki Sidebar Example

- [Home](../wiki/Home)
  - [Page A](../wiki/Page-A)
  - [Page B](../wiki/Page-B)
- Another
  - [Page C](../wiki/Page-C)
  - [Page D](../wiki/Page-D)
- [Page E](../wiki/Page-E)

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

